package handler

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/go-chi/chi/v5"
	"github.com/lucsky/cuid"
	"golang.org/x/text/unicode/norm"

	"github.com/daugia999/backend/internal/db"
	"github.com/daugia999/backend/internal/parser"
)

const (
	parseTimeout      = 2 * time.Minute
	defaultAuthorName = "Nguyễn Văn Dương"
)

func (h *Handler) AdminStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	total, err := h.queries.AdminCountArticles(ctx, nil)
	if err != nil {
		writeDBError(w, err, "")
		return
	}
	counts := map[string]int64{}
	for _, status := range []string{"PUBLISHED", "DRAFT", "ARCHIVED"} {
		n, err := h.queries.AdminCountArticlesByStatus(ctx, status)
		if err != nil {
			writeDBError(w, err, "")
			return
		}
		counts[status] = n
	}
	views, err := h.queries.AdminTotalViews(ctx)
	if err != nil {
		writeDBError(w, err, "")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"totalArticles": total,
			"published":     counts["PUBLISHED"],
			"drafts":        counts["DRAFT"],
			"archived":      counts["ARCHIVED"],
			"totalViews":    views,
		},
	})
}

func (h *Handler) AdminListArticles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	limit, offset := parsePageParams(r)
	page := pageNumber(r)

	var status *string
	switch s := r.URL.Query().Get("status"); s {
	case "PUBLISHED", "DRAFT", "ARCHIVED":
		status = &s
	}

	rows, err := h.queries.AdminListArticles(ctx, db.AdminListArticlesParams{Limit: limit, Offset: offset, Status: status})
	if err != nil {
		writeDBError(w, err, "")
		return
	}
	total, err := h.queries.AdminCountArticles(ctx, status)
	if err != nil {
		writeDBError(w, err, "")
		return
	}

	items := make([]map[string]any, len(rows))
	for i, a := range rows {
		item := articleListRow(a.ID, a.Title, a.Slug, a.Description, a.AuthorName, a.Status, a.PublishedAt,
			a.Province, a.District, a.Ward, a.ThumbnailKey, a.ViewCount, a.CategoryName, a.CategorySlug,
			a.CategoryColor, a.CreatedAt, a.UpdatedAt, a.AuctionStart, a.AuctionEnd, a.StartingPrice)
		item["categoryId"] = a.CategoryID
		items[i] = item
	}
	writeJSON(w, http.StatusOK, paginatedResponse(items, total, page, int(limit)))
}

func (h *Handler) AdminGetArticle(w http.ResponseWriter, r *http.Request) {
	h.writeAdminArticle(w, r.Context(), chi.URLParam(r, "id"), http.StatusOK)
}

// writeAdminArticle loads an article with its relations and writes the full
// admin representation. Every admin read/write funnels through here so the
// response shape is identical across endpoints.
func (h *Handler) writeAdminArticle(w http.ResponseWriter, ctx context.Context, id string, status int) {
	article, err := h.queries.GetArticleByID(ctx, id)
	if err != nil {
		writeDBError(w, err, "article not found")
		return
	}
	rel, err := h.loadRelated(ctx, article.ID)
	if err != nil {
		writeDBError(w, err, "article not found")
		return
	}

	result := map[string]any{
		"id":               article.ID,
		"title":            article.Title,
		"slug":             article.Slug,
		"description":      article.Description,
		"metaDescription":  article.MetaDescription,
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
		"thumbnailUrl":     thumbURL(article.ID, article.ThumbnailKey),
		"originalFileName": article.OriginalFileName,
		"originalFileMime": article.OriginalFileMime,
		"viewCount":        article.ViewCount,
		"categoryId":       article.CategoryID,
		"categoryName":     article.CategoryName,
		"categorySlug":     article.CategorySlug,
		"categoryColor":    article.CategoryColor,
		"tags":             rel.tags,
		"images":           rel.images,
		"attachments":      rel.attachments,
		"createdAt":        article.CreatedAt,
		"updatedAt":        article.UpdatedAt,
		"auctionStart":     article.AuctionStart,
		"auctionEnd":       article.AuctionEnd,
		"venueName":        article.VenueName,
		"venueAddress":     article.VenueAddress,
		"startingPrice":    article.StartingPrice,
		"depositAmount":    article.DepositAmount,
	}
	writeJSON(w, status, map[string]any{"data": result})
}

func (h *Handler) AdminCreateArticle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

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

	mime := header.Header.Get("Content-Type")
	ext, ok := docExtension(mime)
	if !ok {
		writeError(w, http.StatusBadRequest, "unsupported file type, use DOCX or PDF")
		return
	}
	head, err := peekHead(file)
	if err != nil || !magicMatches(mime, head) {
		writeError(w, http.StatusBadRequest, "file content does not match its declared type")
		return
	}

	slug := r.FormValue("slug")
	if slug != "" && !validSlug(slug) {
		writeError(w, http.StatusBadRequest, "slug may only contain a-z, 0-9 and dashes")
		return
	}

	tmpDir, err := os.MkdirTemp("", "upload-*")
	if err != nil {
		log.Printf("mkdir temp: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer os.RemoveAll(tmpDir)
	tmpFile, err := spoolUpload(tmpDir, "doc"+ext, file)
	if err != nil {
		log.Printf("spool upload: %v", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	parseCtx, cancel := context.WithTimeout(ctx, parseTimeout)
	defer cancel()
	var contentHTML, contentPlain string
	switch ext {
	case ".docx":
		contentHTML, contentPlain, err = parser.ParseDOCX(parseCtx, tmpFile)
	case ".pdf":
		contentHTML, contentPlain, err = parser.ParsePDF(parseCtx, tmpFile)
	}
	if err != nil {
		if errors.Is(err, parser.ErrBadDocument) {
			writeError(w, http.StatusUnprocessableEntity, "không thể đọc nội dung tài liệu; kiểm tra lại file")
			return
		}
		log.Printf("parse %s: %v", header.Filename, err)
		writeError(w, http.StatusInternalServerError, "document conversion failed")
		return
	}

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
		authorName = defaultAuthorName
	}
	if slug == "" {
		slug = slugifyTitle(title)
	}
	if slug == "" {
		slug = cuid.Slug()
	}

	articleID := cuid.New()
	rawKey := fmt.Sprintf("raw/%s%s", articleID, ext)
	// Store the source document before the row exists: a notice must never be
	// listed while its file is missing.
	if _, err := h.uploadLocalFile(ctx, rawKey, tmpFile, mime); err != nil {
		log.Printf("upload %s: %v", rawKey, err)
		writeError(w, http.StatusBadGateway, "failed to store document; article not created")
		return
	}

	var plotCount *int32
	if pc := r.FormValue("plotCount"); pc != "" {
		if n, err := strconv.ParseInt(pc, 10, 32); err == nil {
			v := int32(n)
			plotCount = &v
		}
	}
	originalFileName := header.Filename

	var article db.CreateArticleRow
	for attempt := 0; attempt < 5; attempt++ {
		candidate := slug
		if attempt > 0 {
			candidate = fmt.Sprintf("%s-%d", slug, attempt+1)
		}
		article, err = h.queries.CreateArticle(ctx, db.CreateArticleParams{
			ID:               articleID,
			Title:            title,
			Slug:             candidate,
			Description:      description,
			AuthorName:       authorName,
			ContentHtml:      contentHTML,
			ContentPlain:     contentPlain,
			Status:           "DRAFT",
			Province:         nilStr(r.FormValue("province")),
			District:         nilStr(r.FormValue("district")),
			Ward:             nilStr(r.FormValue("ward")),
			AssetType:        nilStr(r.FormValue("assetType")),
			PlotCount:        plotCount,
			TotalArea:        nilStr(r.FormValue("totalArea")),
			OriginalFileKey:  &rawKey,
			OriginalFileName: &originalFileName,
			OriginalFileMime: &mime,
			CategoryID:       nilStr(r.FormValue("categoryId")),
		})
		if err == nil || !isUniqueViolation(err) {
			break
		}
	}
	if err != nil {
		if delErr := h.store.Delete(ctx, rawKey); delErr != nil {
			log.Printf("clean up orphaned upload %s: %v", rawKey, delErr)
		}
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "slug already in use")
			return
		}
		log.Printf("create article: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to create article")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"data": map[string]any{"id": article.ID, "slug": article.Slug, "status": article.Status},
	})
}

func (h *Handler) AdminUpdateArticle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	var body patch
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	params, err := buildUpdateParams(id, body)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if _, err := h.queries.UpdateArticle(ctx, params); err != nil {
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "slug already in use")
			return
		}
		writeDBError(w, err, "article not found")
		return
	}
	h.writeAdminArticle(w, ctx, id, http.StatusOK)
}

func buildUpdateParams(id string, body patch) (db.UpdateArticleParams, error) {
	p := db.UpdateArticleParams{ID: id}
	var err error

	if p.SetTitle, p.Title, err = body.requiredText("title"); err != nil {
		return p, err
	}
	if p.SetDescription, p.Description, err = body.requiredText("description"); err != nil {
		return p, err
	}
	if p.SetAuthorName, p.AuthorName, err = body.requiredText("authorName"); err != nil {
		return p, err
	}
	if p.SetSlug, p.Slug, err = body.requiredText("slug"); err != nil {
		return p, err
	}
	if p.SetSlug && !validSlug(*p.Slug) {
		return p, errors.New("slug may only contain a-z, 0-9 and dashes")
	}

	optional := []struct {
		key string
		set *bool
		dst **string
	}{
		{"province", &p.SetProvince, &p.Province},
		{"district", &p.SetDistrict, &p.District},
		{"ward", &p.SetWard, &p.Ward},
		{"assetType", &p.SetAssetType, &p.AssetType},
		{"totalArea", &p.SetTotalArea, &p.TotalArea},
		{"categoryId", &p.SetCategoryID, &p.CategoryID},
		{"metaDescription", &p.SetMetaDescription, &p.MetaDescription},
		{"venueName", &p.SetVenueName, &p.VenueName},
		{"venueAddress", &p.SetVenueAddress, &p.VenueAddress},
	}
	for _, f := range optional {
		if *f.set, *f.dst, err = body.optionalText(f.key); err != nil {
			return p, err
		}
	}

	if p.SetPlotCount, p.PlotCount, err = body.optionalInt32("plotCount"); err != nil {
		return p, err
	}
	if p.SetStartingPrice, p.StartingPrice, err = body.optionalInt64("startingPrice"); err != nil {
		return p, err
	}
	if p.SetDepositAmount, p.DepositAmount, err = body.optionalInt64("depositAmount"); err != nil {
		return p, err
	}
	if p.SetAuctionStart, p.AuctionStart, err = body.optionalTime("auctionStart"); err != nil {
		return p, err
	}
	if p.SetAuctionEnd, p.AuctionEnd, err = body.optionalTime("auctionEnd"); err != nil {
		return p, err
	}

	// Hand-edited HTML is sanitized with the same policy as parsed documents,
	// and the plain-text copy (search index) is always derived server-side.
	if set, html, err := body.optionalText("contentHtml"); err != nil {
		return p, err
	} else if set {
		clean, plain := "", ""
		if html != nil {
			clean = parser.SanitizeHTML(*html)
			plain = parser.StripHTML(*html)
		}
		p.SetContentHtml, p.ContentHtml = true, &clean
		p.SetContentPlain, p.ContentPlain = true, &plain
	}
	return p, nil
}

func (h *Handler) AdminDeleteArticle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	article, err := h.queries.GetArticleByID(ctx, id)
	if err != nil {
		writeDBError(w, err, "article not found")
		return
	}

	// Delete the row first (cascades to images, attachments, tags, views). Only
	// once the notice is gone from the database do we drop its objects: a
	// failure here must not leave a published article whose files are missing.
	rows, err := h.queries.DeleteArticle(ctx, id)
	if err != nil {
		writeDBError(w, err, "article not found")
		return
	}
	if rows == 0 {
		writeError(w, http.StatusNotFound, "article not found")
		return
	}

	for _, key := range []*string{article.OriginalFileKey, article.ThumbnailKey} {
		if key != nil {
			if err := h.store.Delete(ctx, *key); err != nil {
				log.Printf("delete object %s: %v", *key, err)
			}
		}
	}
	for _, prefix := range []string{fmt.Sprintf("images/%s/", id), fmt.Sprintf("attachments/%s/", id)} {
		if err := h.store.DeletePrefix(ctx, prefix); err != nil {
			log.Printf("delete prefix %s: %v", prefix, err)
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) AdminPublishArticle(w http.ResponseWriter, r *http.Request) {
	h.statusChange(w, r, "published", h.queries.PublishArticle)
}

func (h *Handler) AdminUnpublishArticle(w http.ResponseWriter, r *http.Request) {
	h.statusChange(w, r, "unpublished", h.queries.UnpublishArticle)
}

func (h *Handler) AdminArchiveArticle(w http.ResponseWriter, r *http.Request) {
	h.statusChange(w, r, "archived", h.queries.ArchiveArticle)
}

func (h *Handler) statusChange(w http.ResponseWriter, r *http.Request, message string, fn func(context.Context, string) (int64, error)) {
	rows, err := fn(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeDBError(w, err, "article not found")
		return
	}
	if rows == 0 {
		writeError(w, http.StatusNotFound, "article not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": message})
}

// AdminSetArticleTags replaces the article's tag set atomically.
func (h *Handler) AdminSetArticleTags(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	var req struct {
		TagIDs []string `json:"tagIds"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	unique := make([]string, 0, len(req.TagIDs))
	seen := map[string]bool{}
	for _, t := range req.TagIDs {
		if t != "" && !seen[t] {
			seen[t] = true
			unique = append(unique, t)
		}
	}

	if _, err := h.queries.GetArticleByID(ctx, id); err != nil {
		writeDBError(w, err, "article not found")
		return
	}
	n, err := h.queries.CountTagsByIDs(ctx, unique)
	if err != nil {
		writeDBError(w, err, "")
		return
	}
	if int(n) != len(unique) {
		writeError(w, http.StatusBadRequest, "unknown tag id")
		return
	}

	err = h.inTx(ctx, func(q *db.Queries) error {
		if err := q.RemoveAllArticleTags(ctx, id); err != nil {
			return err
		}
		for _, tagID := range unique {
			if err := q.AddArticleTag(ctx, db.AddArticleTagParams{ArticleID: id, TagID: tagID}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		writeDBError(w, err, "")
		return
	}

	tags, err := h.queries.ListTagsByArticle(ctx, id)
	if err != nil {
		writeDBError(w, err, "")
		return
	}
	items := make([]map[string]any, len(tags))
	for i, t := range tags {
		items[i] = map[string]any{"id": t.ID, "name": t.Name, "slug": t.Slug}
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *Handler) AdminRawFileURL(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	article, err := h.queries.GetArticleByID(ctx, chi.URLParam(r, "id"))
	if err != nil {
		writeDBError(w, err, "article not found")
		return
	}
	if article.OriginalFileKey == nil {
		writeError(w, http.StatusNotFound, "no original file")
		return
	}

	url, err := h.store.PresignedURL(ctx, *article.OriginalFileKey, 5*time.Minute)
	if err != nil {
		log.Printf("presign %s: %v", *article.OriginalFileKey, err)
		writeError(w, http.StatusBadGateway, "failed to generate URL")
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

func docExtension(mime string) (string, bool) {
	switch mime {
	case "application/pdf":
		return ".pdf", true
	case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		return ".docx", true
	}
	return "", false
}

// peekHead reads the first bytes of an upload for type sniffing and rewinds.
func peekHead(f multipart.File) ([]byte, error) {
	head := make([]byte, 512)
	n, err := io.ReadFull(f, head)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		return nil, err
	}
	if _, err := f.Seek(0, io.SeekStart); err != nil {
		return nil, err
	}
	return head[:n], nil
}

// magicMatches checks that the bytes really are what the client claims. The
// browser-supplied Content-Type is otherwise trivially forgeable.
func magicMatches(mime string, head []byte) bool {
	switch mime {
	case "application/pdf":
		return bytes.HasPrefix(head, []byte("%PDF-"))
	case "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
		return bytes.HasPrefix(head, []byte("PK\x03\x04"))
	case "application/msword", "application/vnd.ms-excel":
		return bytes.HasPrefix(head, []byte{0xD0, 0xCF, 0x11, 0xE0})
	case "image/jpeg", "image/png", "image/webp":
		return http.DetectContentType(head) == mime
	case "text/csv":
		return strings.HasPrefix(http.DetectContentType(head), "text/plain")
	}
	return false
}

// slugifyTitle produces a URL-safe slug from a Vietnamese title. Diacritics are
// transliterated to their base ASCII letter (NFD + strip combining marks) rather
// than dropped, so "Thông báo đấu giá" becomes "thong-bao-dau-gia".
func slugifyTitle(title string) string {
	decomposed := norm.NFD.String(title)

	var b strings.Builder
	prevDash := false
	for _, r := range decomposed {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
			prevDash = false
		case r >= 'A' && r <= 'Z':
			b.WriteRune(r + 32)
			prevDash = false
		case r == 'đ' || r == 'Đ':
			b.WriteByte('d')
			prevDash = false
		case r == ' ' || r == '-' || r == '_':
			if !prevDash && b.Len() > 0 {
				b.WriteByte('-')
				prevDash = true
			}
		}
	}
	return strings.Trim(b.String(), "-")
}
