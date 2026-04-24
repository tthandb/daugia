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
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/lucsky/cuid"

	"github.com/daugia999/backend/internal/db"
	"github.com/daugia999/backend/internal/parser"
)

func (h *Handler) AdminStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	total, _ := h.queries.AdminCountArticles(ctx)
	published, _ := h.queries.AdminCountArticlesByStatus(ctx, "PUBLISHED")
	drafts, _ := h.queries.AdminCountArticlesByStatus(ctx, "DRAFT")
	archived, _ := h.queries.AdminCountArticlesByStatus(ctx, "ARCHIVED")
	views, _ := h.queries.AdminTotalViews(ctx)

	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"totalArticles": total,
			"published":     published,
			"drafts":        drafts,
			"archived":      archived,
			"totalViews":    views,
		},
	})
}

func (h *Handler) AdminListArticles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	limit, offset := parsePageParams(r)
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	articles, err := h.queries.AdminListArticles(ctx, db.AdminListArticlesParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		writeError(w, 500, "failed to list articles")
		return
	}

	total, _ := h.queries.AdminCountArticles(ctx)

	items := make([]map[string]any, len(articles))
	for i, a := range articles {
		var thumbnailURL *string
		if a.ThumbnailKey != nil {
			url := fmt.Sprintf("/api/thumbs/%s", a.ID)
			thumbnailURL = &url
		}
		items[i] = map[string]any{
			"id":            a.ID,
			"title":         a.Title,
			"slug":          a.Slug,
			"description":   a.Description,
			"authorName":    a.AuthorName,
			"status":        a.Status,
			"publishedAt":   a.PublishedAt,
			"thumbnailUrl":  thumbnailURL,
			"viewCount":     a.ViewCount,
			"categoryName":  a.CategoryName,
			"categorySlug":  a.CategorySlug,
			"categoryColor": a.CategoryColor,
			"createdAt":     a.CreatedAt,
			"updatedAt":     a.UpdatedAt,
		}
	}
	writeJSON(w, http.StatusOK, paginatedResponse(items, total, page, int(limit)))
}

func (h *Handler) AdminGetArticle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	article, err := h.queries.GetArticleByID(ctx, id)
	if err != nil {
		writeError(w, 404, "article not found")
		return
	}

	tags, _ := h.queries.ListTagsByArticle(ctx, article.ID)
	tagList := make([]map[string]any, len(tags))
	for i, t := range tags {
		tagList[i] = map[string]any{"id": t.ID, "name": t.Name, "slug": t.Slug}
	}

	images, _ := h.queries.ListArticleImages(ctx, article.ID)
	imageList := make([]map[string]any, len(images))
	for i, img := range images {
		imageList[i] = map[string]any{
			"id":        img.ID,
			"url":       fmt.Sprintf("/api/images/%s", img.ID),
			"fileName":  img.FileName,
			"altText":   img.AltText,
			"width":     img.Width,
			"height":    img.Height,
			"sizeBytes": img.SizeBytes,
			"sortOrder": img.SortOrder,
		}
	}

	attachments, _ := h.queries.ListArticleAttachments(ctx, article.ID)
	attachList := make([]map[string]any, len(attachments))
	for i, att := range attachments {
		attachList[i] = map[string]any{
			"id":        att.ID,
			"url":       fmt.Sprintf("/api/articles/%s/attachments/%s", article.ID, att.ID),
			"fileName":  att.FileName,
			"fileMime":  att.FileMime,
			"sizeBytes": att.SizeBytes,
			"sortOrder": att.SortOrder,
		}
	}

	var thumbnailURL *string
	if article.ThumbnailKey != nil {
		url := fmt.Sprintf("/api/thumbs/%s", article.ID)
		thumbnailURL = &url
	}

	result := map[string]any{
		"id":               article.ID,
		"title":            article.Title,
		"slug":             article.Slug,
		"description":      article.Description,
		"authorName":       article.AuthorName,
		"contentHtml":      article.ContentHtml,
		"status":           article.Status,
		"publishedAt":      article.PublishedAt,
		"province":         article.Province,
		"district":         article.District,
		"ward":             article.Ward,
		"assetType":        article.AssetType,
		"plotCount":        article.PlotCount,
		"totalArea":        article.TotalArea,
		"thumbnailUrl":     thumbnailURL,
		"originalFileName": article.OriginalFileName,
		"originalFileMime": article.OriginalFileMime,
		"viewCount":        article.ViewCount,
		"categoryId":       article.CategoryID,
		"categoryName":     article.CategoryName,
		"categorySlug":     article.CategorySlug,
		"categoryColor":    article.CategoryColor,
		"tags":             tagList,
		"images":           imageList,
		"attachments":      attachList,
		"createdAt":        article.CreatedAt,
		"updatedAt":        article.UpdatedAt,
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": result})
}

func (h *Handler) AdminCreateArticle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Parse multipart form (max 50MB)
	if err := r.ParseMultipartForm(50 << 20); err != nil {
		writeError(w, 400, "invalid form data")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, 400, "file is required")
		return
	}
	defer file.Close()

	// Validate MIME type
	mime := header.Header.Get("Content-Type")
	if !isAllowedDocMime(mime) {
		writeError(w, 400, "unsupported file type, use DOCX or PDF")
		return
	}

	// Save to temp file
	ext := extFromMime(mime)
	tmpDir, _ := os.MkdirTemp("", "upload-*")
	defer os.RemoveAll(tmpDir)
	tmpFile := filepath.Join(tmpDir, "doc"+ext)
	f, _ := os.Create(tmpFile)
	io.Copy(f, file)
	f.Close()

	// Parse document
	var contentHTML, contentPlain string
	switch ext {
	case ".docx":
		contentHTML, contentPlain, err = parser.ParseDOCX(tmpFile)
	case ".pdf":
		contentHTML, contentPlain, err = parser.ParsePDF(tmpFile)
	default:
		writeError(w, 400, "unsupported file format")
		return
	}
	if err != nil {
		writeError(w, 500, fmt.Sprintf("failed to parse document: %v", err))
		return
	}

	// Metadata from form
	title := r.FormValue("title")
	if title == "" {
		title = header.Filename
	}
	description := r.FormValue("description")
	if description == "" {
		description = parser.GenerateDescription(contentPlain, 200)
	}
	authorName := r.FormValue("authorName")
	if authorName == "" {
		authorName = "Nguyễn Văn Dương"
	}
	slug := r.FormValue("slug")
	if slug == "" {
		slug = slugifyTitle(title)
	}

	articleID := cuid.New()

	// Upload raw file to MinIO
	rawKey := fmt.Sprintf("raw/%s%s", articleID, ext)
	rawFile, _ := os.Open(tmpFile)
	stat, _ := rawFile.Stat()
	_ = h.store.Upload(ctx, rawKey, rawFile, stat.Size(), mime)
	rawFile.Close()

	// Create thumbnail via bimg (if we can)
	// For document uploads, thumbnail is generated later or from first page
	// For now, leave thumbnail_key nil

	originalFileName := header.Filename

	categoryID := nilStr(r.FormValue("categoryId"))
	province := nilStr(r.FormValue("province"))
	district := nilStr(r.FormValue("district"))
	ward := nilStr(r.FormValue("ward"))
	assetType := nilStr(r.FormValue("assetType"))

	var plotCount pgtype.Int4
	if pc := r.FormValue("plotCount"); pc != "" {
		if n, err := strconv.Atoi(pc); err == nil {
			plotCount = pgtype.Int4{Int32: int32(n), Valid: true}
		}
	}
	totalArea := nilStr(r.FormValue("totalArea"))

	article, err := h.queries.CreateArticle(ctx, db.CreateArticleParams{
		ID:               articleID,
		Title:            title,
		Slug:             slug,
		Description:      description,
		AuthorName:       authorName,
		ContentHtml:      contentHTML,
		ContentPlain:     contentPlain,
		Status:           "DRAFT",
		Province:         province,
		District:         district,
		Ward:             ward,
		AssetType:        assetType,
		PlotCount:        plotCount,
		TotalArea:        totalArea,
		ThumbnailKey:     nil,
		OriginalFileKey:  &rawKey,
		OriginalFileName: &originalFileName,
		OriginalFileMime: &mime,
		LegacyID:         pgtype.Int4{},
		LegacyFileKey:    nil,
		CategoryID:       categoryID,
		PublishedAt:      nil,
	})
	if err != nil {
		writeError(w, 500, fmt.Sprintf("failed to create article: %v", err))
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"data": map[string]any{
			"id":     article.ID,
			"slug":   article.Slug,
			"status": article.Status,
		},
	})
}

func (h *Handler) AdminUpdateArticle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	var req struct {
		Title        *string `json:"title"`
		Slug         *string `json:"slug"`
		Description  *string `json:"description"`
		AuthorName   *string `json:"authorName"`
		ContentHtml  *string `json:"contentHtml"`
		ContentPlain *string `json:"contentPlain"`
		Province     *string `json:"province"`
		District     *string `json:"district"`
		Ward         *string `json:"ward"`
		AssetType    *string `json:"assetType"`
		PlotCount    *int32  `json:"plotCount"`
		TotalArea    *string `json:"totalArea"`
		CategoryID   *string `json:"categoryId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}

	var plotCount pgtype.Int4
	if req.PlotCount != nil {
		plotCount = pgtype.Int4{Int32: *req.PlotCount, Valid: true}
	}

	article, err := h.queries.UpdateArticle(ctx, db.UpdateArticleParams{
		ID:           id,
		Title:        req.Title,
		Slug:         req.Slug,
		Description:  req.Description,
		AuthorName:   req.AuthorName,
		ContentHtml:  req.ContentHtml,
		ContentPlain: req.ContentPlain,
		Province:     req.Province,
		District:     req.District,
		Ward:         req.Ward,
		AssetType:    req.AssetType,
		PlotCount:    plotCount,
		TotalArea:    req.TotalArea,
		ThumbnailKey: nil, // don't update via this endpoint
		CategoryID:   req.CategoryID,
	})
	if err != nil {
		writeError(w, 500, "failed to update article")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": article})
}

func (h *Handler) AdminDeleteArticle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	// Get article to find file keys
	article, err := h.queries.GetArticleByID(ctx, id)
	if err != nil {
		writeError(w, 404, "article not found")
		return
	}

	// Delete files from MinIO
	if article.OriginalFileKey != nil {
		_ = h.store.Delete(ctx, *article.OriginalFileKey)
	}
	if article.ThumbnailKey != nil {
		_ = h.store.Delete(ctx, *article.ThumbnailKey)
	}
	// Delete all images and attachments
	_ = h.store.DeletePrefix(ctx, fmt.Sprintf("images/%s/", id))
	_ = h.store.DeletePrefix(ctx, fmt.Sprintf("attachments/%s/", id))

	// Delete article (cascades to images, attachments, tags, views)
	if err := h.queries.DeleteArticle(ctx, id); err != nil {
		writeError(w, 500, "failed to delete article")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) AdminPublishArticle(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.queries.PublishArticle(r.Context(), id); err != nil {
		writeError(w, 500, "failed to publish article")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "published"})
}

func (h *Handler) AdminUnpublishArticle(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.queries.UnpublishArticle(r.Context(), id); err != nil {
		writeError(w, 500, "failed to unpublish article")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "unpublished"})
}

func (h *Handler) AdminArchiveArticle(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.queries.ArchiveArticle(r.Context(), id); err != nil {
		writeError(w, 500, "failed to archive article")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "archived"})
}

func (h *Handler) AdminRawFileURL(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	article, err := h.queries.GetArticleByID(ctx, id)
	if err != nil {
		writeError(w, 404, "article not found")
		return
	}
	if article.OriginalFileKey == nil {
		writeError(w, 404, "no original file")
		return
	}

	url, err := h.store.PresignedURL(ctx, *article.OriginalFileKey, 5*time.Minute)
	if err != nil {
		writeError(w, 500, "failed to generate URL")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"url":      url,
			"fileName": article.OriginalFileName,
			"fileMime": article.OriginalFileMime,
		},
	})
}

// --- Helpers ---

func isAllowedDocMime(mime string) bool {
	allowed := map[string]bool{
		"application/pdf": true,
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
		"application/msword": true,
	}
	return allowed[mime]
}

func extFromMime(mime string) string {
	switch mime {
	case "application/pdf":
		return ".pdf"
	case "application/msword":
		return ".doc"
	default:
		return ".docx"
	}
}

func slugifyTitle(title string) string {
	s := title
	// Simple slugification
	var result []byte
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result = append(result, byte(r))
		} else if r >= 'A' && r <= 'Z' {
			result = append(result, byte(r+32))
		} else if r == ' ' {
			result = append(result, '-')
		}
	}
	return string(result)
}
