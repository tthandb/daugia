package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/lucsky/cuid"

	"github.com/daugia999/backend/internal/db"
)

// ProxyThumbnail serves thumbnail images from MinIO
func (h *Handler) ProxyThumbnail(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	// Look up actual thumbnail key from DB
	article, err := h.queries.GetArticleByID(ctx, id)
	if err != nil || article.ThumbnailKey == nil {
		writeError(w, 404, "thumbnail not found")
		return
	}

	obj, err := h.store.GetObject(ctx, *article.ThumbnailKey)
	if err != nil {
		writeError(w, 404, "thumbnail not found")
		return
	}
	defer obj.Close()

	info, err := obj.Stat()
	if err != nil {
		writeError(w, 404, "thumbnail not found")
		return
	}

	w.Header().Set("Content-Type", "image/webp")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Header().Set("Content-Length", strconv.FormatInt(info.Size, 10))
	io.Copy(w, obj)
}

// ProxyImage serves gallery images from MinIO
func (h *Handler) ProxyImage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	img, err := h.queries.GetArticleImage(ctx, id)
	if err != nil {
		writeError(w, 404, "image not found")
		return
	}

	obj, err := h.store.GetObject(ctx, img.FileKey)
	if err != nil {
		writeError(w, 404, "image file not found")
		return
	}
	defer obj.Close()

	info, err := obj.Stat()
	if err != nil {
		writeError(w, 404, "image file not found")
		return
	}

	w.Header().Set("Content-Type", "image/webp")
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.Header().Set("Content-Length", strconv.FormatInt(info.Size, 10))
	io.Copy(w, obj)
}

// DownloadAttachment redirects to a presigned URL for the attachment
func (h *Handler) DownloadAttachment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	attachmentID := chi.URLParam(r, "attachmentId")

	att, err := h.queries.GetArticleAttachment(ctx, attachmentID)
	if err != nil {
		writeError(w, 404, "attachment not found")
		return
	}

	url, err := h.store.PresignedURL(ctx, att.FileKey, 30*time.Minute)
	if err != nil {
		writeError(w, 500, "failed to generate download URL")
		return
	}

	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// AdminUploadImages handles multi-image upload for article gallery
func (h *Handler) AdminUploadImages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	articleID := chi.URLParam(r, "id")

	if err := r.ParseMultipartForm(50 << 20); err != nil {
		writeError(w, 400, "invalid form data")
		return
	}

	files := r.MultipartForm.File["images"]
	if len(files) == 0 {
		writeError(w, 400, "no images provided")
		return
	}

	// Get current max sort order
	existingImages, _ := h.queries.ListArticleImages(ctx, articleID)
	sortOrder := int32(len(existingImages))

	var results []map[string]any

	for _, fh := range files {
		// Validate MIME
		mime := fh.Header.Get("Content-Type")
		if !isAllowedImageMime(mime) {
			continue
		}

		file, err := fh.Open()
		if err != nil {
			continue
		}

		// Save to temp for processing
		tmpDir, _ := os.MkdirTemp("", "img-*")
		tmpFile := filepath.Join(tmpDir, fh.Filename)
		f, _ := os.Create(tmpFile)
		io.Copy(f, file)
		f.Close()
		file.Close()

		// TODO: bimg processing — for now upload as-is
		// In production: bimg optimize to webp, max 1600px wide
		imageID := cuid.New()
		key := fmt.Sprintf("images/%s/%s.webp", articleID, imageID)

		uploadFile, _ := os.Open(tmpFile)
		stat, _ := uploadFile.Stat()
		_ = h.store.Upload(ctx, key, uploadFile, stat.Size(), "image/webp")
		uploadFile.Close()

		sortOrder++
		img, err := h.queries.CreateArticleImage(ctx, db.CreateArticleImageParams{
			ID:        imageID,
			ArticleID: articleID,
			FileKey:   key,
			FileName:  fh.Filename,
			AltText:   "",
			Width:     0,
			Height:    0,
			SizeBytes: int32(stat.Size()),
			SortOrder: sortOrder,
		})
		if err == nil {
			results = append(results, map[string]any{
				"id":       img.ID,
				"url":      fmt.Sprintf("/api/images/%s", img.ID),
				"fileName": img.FileName,
			})
		}

		os.RemoveAll(tmpDir)
	}

	writeJSON(w, http.StatusCreated, map[string]any{"data": results})
}

func (h *Handler) AdminUpdateImage(w http.ResponseWriter, r *http.Request) {
	imageID := chi.URLParam(r, "imageId")
	var req struct {
		AltText *string `json:"altText"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.AltText != nil {
		_ = h.queries.UpdateArticleImageAlt(r.Context(), db.UpdateArticleImageAltParams{
			ID:      imageID,
			AltText: *req.AltText,
		})
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "updated"})
}

func (h *Handler) AdminDeleteImage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	imageID := chi.URLParam(r, "imageId")

	fileKey, err := h.queries.DeleteArticleImage(ctx, imageID)
	if err != nil {
		writeError(w, 404, "image not found")
		return
	}
	_ = h.store.Delete(ctx, fileKey)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) AdminReorderImages(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}

	for i, id := range req.IDs {
		_ = h.queries.UpdateArticleImageOrder(r.Context(), db.UpdateArticleImageOrderParams{
			ID:        id,
			SortOrder: int32(i),
		})
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "reordered"})
}

// AdminUploadAttachment handles file attachment upload
func (h *Handler) AdminUploadAttachment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	articleID := chi.URLParam(r, "id")

	if err := r.ParseMultipartForm(20 << 20); err != nil {
		writeError(w, 400, "invalid form data")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, 400, "file is required")
		return
	}
	defer file.Close()

	mime := header.Header.Get("Content-Type")
	if !isAllowedAttachmentMime(mime) {
		writeError(w, 400, "unsupported file type")
		return
	}

	attachmentID := cuid.New()
	ext := filepath.Ext(header.Filename)
	key := fmt.Sprintf("attachments/%s/%s%s", articleID, attachmentID, ext)

	// Save to temp, upload
	tmpDir, _ := os.MkdirTemp("", "att-*")
	defer os.RemoveAll(tmpDir)
	tmpFile := filepath.Join(tmpDir, header.Filename)
	f, _ := os.Create(tmpFile)
	io.Copy(f, file)
	f.Close()

	uploadFile, _ := os.Open(tmpFile)
	stat, _ := uploadFile.Stat()
	_ = h.store.Upload(ctx, key, uploadFile, stat.Size(), mime)
	uploadFile.Close()

	existingAtts, _ := h.queries.ListArticleAttachments(ctx, articleID)
	sortOrder := int32(len(existingAtts))

	att, err := h.queries.CreateArticleAttachment(ctx, db.CreateArticleAttachmentParams{
		ID:        attachmentID,
		ArticleID: articleID,
		FileKey:   key,
		FileName:  header.Filename,
		FileMime:  mime,
		SizeBytes: int32(stat.Size()),
		SortOrder: sortOrder,
	})
	if err != nil {
		writeError(w, 500, "failed to create attachment")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"data": map[string]any{
			"id":       att.ID,
			"fileName": att.FileName,
			"fileMime": att.FileMime,
		},
	})
}

func (h *Handler) AdminUpdateAttachment(w http.ResponseWriter, r *http.Request) {
	attachmentID := chi.URLParam(r, "attachmentId")
	var req struct {
		FileName *string `json:"fileName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}
	if req.FileName != nil {
		_ = h.queries.UpdateArticleAttachmentName(r.Context(), db.UpdateArticleAttachmentNameParams{
			ID:       attachmentID,
			FileName: *req.FileName,
		})
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "updated"})
}

func (h *Handler) AdminDeleteAttachment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	attachmentID := chi.URLParam(r, "attachmentId")

	fileKey, err := h.queries.DeleteArticleAttachment(ctx, attachmentID)
	if err != nil {
		writeError(w, 404, "attachment not found")
		return
	}
	_ = h.store.Delete(ctx, fileKey)
	w.WriteHeader(http.StatusNoContent)
}

// --- Helpers ---

func isAllowedImageMime(mime string) bool {
	allowed := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
	}
	return allowed[mime]
}

func isAllowedAttachmentMime(mime string) bool {
	allowed := map[string]bool{
		"application/pdf":  true,
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
		"application/vnd.ms-excel":  true,
		"text/csv":                  true,
		"application/msword":        true,
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
		"image/jpeg": true,
		"image/png":  true,
	}
	return allowed[mime]
}
