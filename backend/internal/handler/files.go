package handler

import (
	"context"
	"fmt"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/lucsky/cuid"

	"github.com/daugia999/backend/internal/db"
	"github.com/daugia999/backend/internal/imageopt"
)

// ProxyThumbnail serves the cover image. The content type is sniffed from the
// magic bytes because legacy thumbnails were JPEG bytes stored as .webp.
func (h *Handler) ProxyThumbnail(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	art, err := h.queries.GetArticleThumbnail(ctx, id)
	if err != nil {
		writeDBError(w, err, "thumbnail not found")
		return
	}
	if art.ThumbnailKey == nil || !h.canView(r, art.Status) {
		writeError(w, http.StatusNotFound, "thumbnail not found")
		return
	}
	h.streamImage(w, r, *art.ThumbnailKey, "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400")
}

// ProxyImage serves gallery images; keys are CUIDs so the immutable directive is safe.
func (h *Handler) ProxyImage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	img, err := h.queries.GetArticleImage(ctx, id)
	if err != nil {
		writeDBError(w, err, "image not found")
		return
	}
	if !h.canView(r, img.ArticleStatus) {
		writeError(w, http.StatusNotFound, "image not found")
		return
	}
	h.streamImage(w, r, img.FileKey, "public, max-age=31536000, immutable")
}

// canView gates files of unpublished articles: only an authenticated admin may
// fetch them, so a withdrawn notice's documents stop leaking via old links.
func (h *Handler) canView(r *http.Request, status string) bool {
	return status == "PUBLISHED" || h.isAdmin(r)
}

func (h *Handler) streamImage(w http.ResponseWriter, r *http.Request, key, cacheControl string) {
	obj, err := h.store.GetObject(r.Context(), key)
	if err != nil {
		log.Printf("get object %s: %v", key, err)
		writeError(w, http.StatusNotFound, "file not found")
		return
	}
	defer obj.Close()

	head := make([]byte, 12)
	n, _ := io.ReadFull(obj, head)
	contentType := imageopt.SniffMime(head[:n])
	if contentType == "application/octet-stream" {
		contentType = "image/webp"
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", cacheControl)
	w.Header().Set("Content-Length", strconv.FormatInt(obj.Size, 10))
	if r.Method == http.MethodHead {
		return
	}
	if _, err := w.Write(head[:n]); err != nil {
		return
	}
	_, _ = io.Copy(w, obj)
}

func (h *Handler) DownloadAttachment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	att, err := h.queries.GetArticleAttachment(ctx, db.GetArticleAttachmentParams{
		ID: chi.URLParam(r, "attachmentId"), ArticleID: chi.URLParam(r, "id"),
	})
	if err != nil {
		writeDBError(w, err, "attachment not found")
		return
	}
	if !h.canView(r, att.ArticleStatus) {
		writeError(w, http.StatusNotFound, "attachment not found")
		return
	}

	url, err := h.store.PresignedDownloadURL(ctx, att.FileKey, att.FileName, 30*time.Minute)
	if err != nil {
		log.Printf("presign %s: %v", att.FileKey, err)
		writeError(w, http.StatusBadGateway, "failed to generate download URL")
		return
	}
	redirectNoStore(w, r, url)
}

// AdminUploadImages accepts one or more gallery images under either the
// "images" or "file" field (the admin UI sends "file").
func (h *Handler) AdminUploadImages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	articleID := chi.URLParam(r, "id")

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid form data")
		return
	}
	files := append(r.MultipartForm.File["images"], r.MultipartForm.File["file"]...)
	if len(files) == 0 {
		writeError(w, http.StatusBadRequest, "no images provided")
		return
	}
	if _, err := h.queries.GetArticleByID(ctx, articleID); err != nil {
		writeDBError(w, err, "article not found")
		return
	}

	existing, err := h.queries.ListArticleImages(ctx, articleID)
	if err != nil {
		writeDBError(w, err, "")
		return
	}
	sortOrder := int32(len(existing))

	results := make([]map[string]any, 0, len(files))
	var firstKey string
	stored := 0

	for _, fh := range files {
		key, imageID, err := h.storeGalleryImage(ctx, articleID, fh)
		if err != nil {
			results = append(results, map[string]any{"fileName": fh.Filename, "error": err.Error()})
			continue
		}
		img, err := h.queries.CreateArticleImage(ctx, db.CreateArticleImageParams{
			ID:        imageID,
			ArticleID: articleID,
			FileKey:   key.key,
			FileName:  fh.Filename,
			AltText:   "",
			Width:     key.width,
			Height:    key.height,
			SizeBytes: int32(key.size),
			SortOrder: sortOrder,
		})
		if err != nil {
			if delErr := h.store.Delete(ctx, key.key); delErr != nil {
				log.Printf("clean up orphaned image %s: %v", key.key, delErr)
			}
			log.Printf("create image row: %v", err)
			results = append(results, map[string]any{"fileName": fh.Filename, "error": "lưu thông tin ảnh thất bại"})
			continue
		}
		sortOrder++
		stored++
		if firstKey == "" {
			firstKey = key.key
		}
		results = append(results, map[string]any{
			"id":       img.ID,
			"url":      fmt.Sprintf("/api/images/%s", img.ID),
			"fileName": img.FileName,
		})
	}

	if stored == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "no valid images provided", "data": results})
		return
	}

	// A scanned PDF yields no cover; adopt the first gallery image so cards and
	// JSON-LD get an image. An existing cover is never overwritten.
	if cur, err := h.queries.GetArticleThumbnail(ctx, articleID); err == nil && cur.ThumbnailKey == nil {
		if _, err := h.queries.SetArticleThumbnail(ctx, db.SetArticleThumbnailParams{ID: articleID, ThumbnailKey: &firstKey}); err != nil {
			log.Printf("adopt cover for %s: %v", articleID, err)
		}
	}

	writeJSON(w, http.StatusCreated, map[string]any{"data": results})
}

type storedImage struct {
	key           string
	width, height int32
	size          int64
}

func (h *Handler) storeGalleryImage(ctx context.Context, articleID string, fh *multipart.FileHeader) (storedImage, string, error) {
	contentType := fh.Header.Get("Content-Type")
	if !isAllowedImageMime(contentType) {
		return storedImage{}, "", fmt.Errorf("định dạng %s không được hỗ trợ", contentType)
	}
	file, err := fh.Open()
	if err != nil {
		return storedImage{}, "", fmt.Errorf("không đọc được file")
	}
	defer file.Close()
	head, err := peekHead(file)
	if err != nil || !magicMatches(contentType, head) {
		return storedImage{}, "", fmt.Errorf("nội dung file không phải ảnh %s", contentType)
	}

	tmpDir, err := os.MkdirTemp("", "img-*")
	if err != nil {
		return storedImage{}, "", fmt.Errorf("không tạo được thư mục tạm")
	}
	defer os.RemoveAll(tmpDir)

	imageID := cuid.New()
	srcPath, err := spoolUpload(tmpDir, imageID+extForMime(contentType), file)
	if err != nil {
		return storedImage{}, "", fmt.Errorf("không ghi được file tạm")
	}

	// Optimize to WebP (q=75, max 1600px). Falls back to the original bytes
	// when vips-tools is missing (dev machines); never fail an upload on format.
	uploadPath, uploadMime := srcPath, contentType
	var width, height int32
	optPath := filepath.Join(tmpDir, imageID+".webp")
	if iw, ih, err := imageopt.OptimizeWebP(ctx, srcPath, optPath, imageopt.DefaultThumbMaxDim, imageopt.DefaultQuality); err == nil {
		uploadPath, uploadMime = optPath, "image/webp"
		width, height = int32(iw), int32(ih)
	}

	key := fmt.Sprintf("images/%s/%s.webp", articleID, imageID)
	size, err := h.uploadLocalFile(ctx, key, uploadPath, uploadMime)
	if err != nil {
		log.Printf("upload image %s: %v", key, err)
		return storedImage{}, "", fmt.Errorf("tải lên thất bại")
	}
	return storedImage{key: key, width: width, height: height, size: size}, imageID, nil
}

func (h *Handler) AdminUpdateImage(w http.ResponseWriter, r *http.Request) {
	var req struct {
		AltText *string `json:"altText"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.AltText == nil {
		writeJSON(w, http.StatusOK, map[string]string{"message": "updated"})
		return
	}
	rows, err := h.queries.UpdateArticleImageAlt(r.Context(), db.UpdateArticleImageAltParams{
		ID: chi.URLParam(r, "imageId"), ArticleID: chi.URLParam(r, "id"), AltText: *req.AltText,
	})
	if err != nil {
		writeDBError(w, err, "image not found")
		return
	}
	if rows == 0 {
		writeError(w, http.StatusNotFound, "image not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "updated"})
}

func (h *Handler) AdminDeleteImage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	articleID := chi.URLParam(r, "id")

	fileKey, err := h.queries.DeleteArticleImage(ctx, db.DeleteArticleImageParams{
		ID: chi.URLParam(r, "imageId"), ArticleID: articleID,
	})
	if err != nil {
		writeDBError(w, err, "image not found")
		return
	}
	if err := h.store.Delete(ctx, fileKey); err != nil {
		log.Printf("delete object %s: %v", fileKey, err)
	}

	// If the deleted image was the cover, move the cover to the next image (or
	// clear it) instead of leaving thumbnail_key pointing at a missing object.
	if cur, err := h.queries.GetArticleThumbnail(ctx, articleID); err == nil && cur.ThumbnailKey != nil && *cur.ThumbnailKey == fileKey {
		var next *string
		if remaining, err := h.queries.ListArticleImages(ctx, articleID); err == nil && len(remaining) > 0 {
			next = &remaining[0].FileKey
		}
		if _, err := h.queries.SetArticleThumbnail(ctx, db.SetArticleThumbnailParams{ID: articleID, ThumbnailKey: next}); err != nil {
			log.Printf("reset cover for %s: %v", articleID, err)
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

// AdminReorderImages applies a full ordering atomically; ids that do not belong
// to the article are rejected before anything is written.
func (h *Handler) AdminReorderImages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	articleID := chi.URLParam(r, "id")

	var req struct {
		IDs []string `json:"ids"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	existing, err := h.queries.ListArticleImages(ctx, articleID)
	if err != nil {
		writeDBError(w, err, "")
		return
	}
	owned := make(map[string]bool, len(existing))
	for _, img := range existing {
		owned[img.ID] = true
	}
	for _, id := range req.IDs {
		if !owned[id] {
			writeError(w, http.StatusBadRequest, "image does not belong to this article")
			return
		}
	}

	err = h.inTx(ctx, func(q *db.Queries) error {
		for i, id := range req.IDs {
			if _, err := q.UpdateArticleImageOrder(ctx, db.UpdateArticleImageOrderParams{
				ID: id, ArticleID: articleID, SortOrder: int32(i),
			}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		writeDBError(w, err, "")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "reordered"})
}

func (h *Handler) AdminUploadAttachment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	articleID := chi.URLParam(r, "id")

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid form data")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if !isAllowedAttachmentMime(contentType) {
		writeError(w, http.StatusBadRequest, "unsupported file type")
		return
	}
	head, err := peekHead(file)
	if err != nil || !magicMatches(contentType, head) {
		writeError(w, http.StatusBadRequest, "file content does not match its declared type")
		return
	}
	if _, err := h.queries.GetArticleByID(ctx, articleID); err != nil {
		writeDBError(w, err, "article not found")
		return
	}

	attachmentID := cuid.New()
	ext := filepath.Ext(filepath.Base(header.Filename))
	key := fmt.Sprintf("attachments/%s/%s%s", articleID, attachmentID, ext)

	tmpDir, err := os.MkdirTemp("", "att-*")
	if err != nil {
		log.Printf("mkdir temp: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer os.RemoveAll(tmpDir)
	tmpFile, err := spoolUpload(tmpDir, attachmentID+ext, file)
	if err != nil {
		log.Printf("spool upload: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	size, err := h.uploadLocalFile(ctx, key, tmpFile, contentType)
	if err != nil {
		log.Printf("upload %s: %v", key, err)
		writeError(w, http.StatusBadGateway, "failed to store attachment")
		return
	}

	existing, err := h.queries.ListArticleAttachments(ctx, articleID)
	if err != nil {
		writeDBError(w, err, "")
		return
	}

	att, err := h.queries.CreateArticleAttachment(ctx, db.CreateArticleAttachmentParams{
		ID:        attachmentID,
		ArticleID: articleID,
		FileKey:   key,
		FileName:  filepath.Base(header.Filename),
		FileMime:  contentType,
		SizeBytes: int32(size),
		SortOrder: int32(len(existing)),
	})
	if err != nil {
		if delErr := h.store.Delete(ctx, key); delErr != nil {
			log.Printf("clean up orphaned attachment %s: %v", key, delErr)
		}
		writeDBError(w, err, "")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"data": map[string]any{"id": att.ID, "fileName": att.FileName, "fileMime": att.FileMime},
	})
}

func (h *Handler) AdminUpdateAttachment(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FileName *string `json:"fileName"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.FileName == nil {
		writeJSON(w, http.StatusOK, map[string]string{"message": "updated"})
		return
	}
	rows, err := h.queries.UpdateArticleAttachmentName(r.Context(), db.UpdateArticleAttachmentNameParams{
		ID: chi.URLParam(r, "attachmentId"), ArticleID: chi.URLParam(r, "id"), FileName: *req.FileName,
	})
	if err != nil {
		writeDBError(w, err, "attachment not found")
		return
	}
	if rows == 0 {
		writeError(w, http.StatusNotFound, "attachment not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "updated"})
}

func (h *Handler) AdminDeleteAttachment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	fileKey, err := h.queries.DeleteArticleAttachment(ctx, db.DeleteArticleAttachmentParams{
		ID: chi.URLParam(r, "attachmentId"), ArticleID: chi.URLParam(r, "id"),
	})
	if err != nil {
		writeDBError(w, err, "attachment not found")
		return
	}
	if err := h.store.Delete(ctx, fileKey); err != nil {
		log.Printf("delete object %s: %v", fileKey, err)
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Helpers ---

func isAllowedImageMime(m string) bool {
	switch m {
	case "image/jpeg", "image/png", "image/webp":
		return true
	}
	return false
}

func isAllowedAttachmentMime(m string) bool {
	switch m {
	case "application/pdf",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.ms-excel",
		"text/csv",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"image/jpeg", "image/png":
		return true
	}
	return false
}

func extForMime(m string) string {
	if exts, _ := mime.ExtensionsByType(m); len(exts) > 0 {
		return exts[0]
	}
	return ".bin"
}
