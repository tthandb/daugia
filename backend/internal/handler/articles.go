package handler

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/lucsky/cuid"

	"github.com/daugia999/backend/internal/db"
)

func (h *Handler) ListArticles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	limit, offset := parsePageParams(r)
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	categorySlug := r.URL.Query().Get("category")
	province := r.URL.Query().Get("province")
	tagSlug := r.URL.Query().Get("tag")

	var articles []db.AdminListArticlesRow // reuse the row type with category join
	var total int64
	var err error

	if categorySlug != "" {
		cat, catErr := h.queries.GetCategoryBySlug(ctx, categorySlug)
		if catErr != nil {
			writeJSON(w, http.StatusOK, paginatedResponse([]any{}, 0, page, int(limit)))
			return
		}
		articles2, err2 := h.queries.ListPublishedArticlesByCategory(ctx, db.ListPublishedArticlesByCategoryParams{
			CategoryID: &cat.ID,
			Limit:      limit,
			Offset:     offset,
		})
		if err2 != nil {
			writeError(w, 500, "failed to list articles")
			return
		}
		total2, _ := h.queries.CountPublishedArticlesByCategory(ctx, &cat.ID)
		total = total2
		// Convert to response
		items := make([]map[string]any, len(articles2))
		for i, a := range articles2 {
			items[i] = articleListRow(a.ID, a.Title, a.Slug, a.Description, a.AuthorName,
				a.Status, a.PublishedAt, a.Province, a.District, a.Ward,
				a.ThumbnailKey, a.ViewCount, a.CategoryName, a.CategorySlug, a.CategoryColor, a.CreatedAt, a.UpdatedAt)
		}
		writeJSON(w, http.StatusOK, paginatedResponse(items, total, page, int(limit)))
		return
		_ = articles
	} else if province != "" {
		articles2, err2 := h.queries.ListPublishedArticlesByProvince(ctx, db.ListPublishedArticlesByProvinceParams{
			Province: &province,
			Limit:    limit,
			Offset:   offset,
		})
		if err2 != nil {
			writeError(w, 500, "failed to list articles")
			return
		}
		total2, _ := h.queries.CountPublishedArticlesByProvince(ctx, &province)
		total = total2
		items := make([]map[string]any, len(articles2))
		for i, a := range articles2 {
			items[i] = articleListRow(a.ID, a.Title, a.Slug, a.Description, a.AuthorName,
				a.Status, a.PublishedAt, a.Province, a.District, a.Ward,
				a.ThumbnailKey, a.ViewCount, a.CategoryName, a.CategorySlug, a.CategoryColor, a.CreatedAt, a.UpdatedAt)
		}
		writeJSON(w, http.StatusOK, paginatedResponse(items, total, page, int(limit)))
		return
	} else if tagSlug != "" {
		tag, tagErr := h.queries.GetTagBySlug(ctx, tagSlug)
		if tagErr != nil {
			writeJSON(w, http.StatusOK, paginatedResponse([]any{}, 0, page, int(limit)))
			return
		}
		articles2, err2 := h.queries.ListPublishedArticlesByTag(ctx, db.ListPublishedArticlesByTagParams{
			TagID:  tag.ID,
			Limit:  limit,
			Offset: offset,
		})
		if err2 != nil {
			writeError(w, 500, "failed to list articles")
			return
		}
		total2, _ := h.queries.CountPublishedArticlesByTag(ctx, tag.ID)
		total = total2
		items := make([]map[string]any, len(articles2))
		for i, a := range articles2 {
			items[i] = articleListRow(a.ID, a.Title, a.Slug, a.Description, a.AuthorName,
				a.Status, a.PublishedAt, a.Province, a.District, a.Ward,
				a.ThumbnailKey, a.ViewCount, a.CategoryName, a.CategorySlug, a.CategoryColor, a.CreatedAt, a.UpdatedAt)
		}
		writeJSON(w, http.StatusOK, paginatedResponse(items, total, page, int(limit)))
		return
	}

	// Default: all published
	articles3, err := h.queries.ListPublishedArticles(ctx, db.ListPublishedArticlesParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		writeError(w, 500, "failed to list articles")
		return
	}
	total, _ = h.queries.CountPublishedArticles(ctx)
	items := make([]map[string]any, len(articles3))
	for i, a := range articles3 {
		items[i] = articleListRow(a.ID, a.Title, a.Slug, a.Description, a.AuthorName,
			a.Status, a.PublishedAt, a.Province, a.District, a.Ward,
			a.ThumbnailKey, a.ViewCount, a.CategoryName, a.CategorySlug, a.CategoryColor, a.CreatedAt, a.UpdatedAt)
	}
	writeJSON(w, http.StatusOK, paginatedResponse(items, total, page, int(limit)))
}

func (h *Handler) FeaturedArticles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	limitStr := r.URL.Query().Get("limit")
	limit := int32(5)
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 20 {
		limit = int32(l)
	}

	articles, err := h.queries.FeaturedArticles(ctx, limit)
	if err != nil {
		writeError(w, 500, "failed to fetch featured articles")
		return
	}

	items := make([]map[string]any, len(articles))
	for i, a := range articles {
		items[i] = articleListRow(a.ID, a.Title, a.Slug, a.Description, a.AuthorName,
			a.Status, a.PublishedAt, a.Province, a.District, a.Ward,
			a.ThumbnailKey, a.ViewCount, a.CategoryName, a.CategorySlug, a.CategoryColor, a.CreatedAt, a.UpdatedAt)
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *Handler) GetArticle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	slug := chi.URLParam(r, "slug")

	article, err := h.queries.GetArticleBySlug(ctx, slug)
	if err != nil {
		writeError(w, 404, "article not found")
		return
	}

	// Get tags
	tags, _ := h.queries.ListTagsByArticle(ctx, article.ID)
	tagList := make([]map[string]any, len(tags))
	for i, t := range tags {
		tagList[i] = map[string]any{"id": t.ID, "name": t.Name, "slug": t.Slug}
	}

	// Get images
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

	// Get attachments
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
		"id":            article.ID,
		"title":         article.Title,
		"slug":          article.Slug,
		"description":   article.Description,
		"authorName":    article.AuthorName,
		"contentHtml":   article.ContentHtml,
		"status":        article.Status,
		"publishedAt":   article.PublishedAt,
		"province":      article.Province,
		"district":      article.District,
		"ward":          article.Ward,
		"assetType":     article.AssetType,
		"plotCount":     article.PlotCount,
		"totalArea":     article.TotalArea,
		"thumbnailUrl":  thumbnailURL,
		"viewCount":     article.ViewCount,
		"categoryId":    article.CategoryID,
		"categoryName":  article.CategoryName,
		"categorySlug":  article.CategorySlug,
		"categoryColor": article.CategoryColor,
		"tags":          tagList,
		"images":        imageList,
		"attachments":   attachList,
		"createdAt":     article.CreatedAt,
		"updatedAt":     article.UpdatedAt,
	}

	// Include original file info for download button
	if article.OriginalFileName != nil {
		result["originalFileName"] = *article.OriginalFileName
	}
	if article.OriginalFileMime != nil {
		result["originalFileMime"] = *article.OriginalFileMime
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": result})
}

// DownloadArticle redirects the user to a presigned URL for the original
// uploaded document. Public — only resolves PUBLISHED articles.
func (h *Handler) DownloadArticle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	slug := chi.URLParam(r, "slug")

	article, err := h.queries.GetArticleBySlug(ctx, slug)
	if err != nil {
		writeError(w, 404, "article not found")
		return
	}
	if article.OriginalFileKey == nil {
		writeError(w, 404, "no original file")
		return
	}

	downloadName := article.Slug
	if article.OriginalFileName != nil {
		downloadName = *article.OriginalFileName
	}

	url, err := h.store.PresignedDownloadURL(ctx, *article.OriginalFileKey, downloadName, 5*time.Minute)
	if err != nil {
		writeError(w, 500, "failed to generate download URL")
		return
	}

	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func (h *Handler) SearchArticles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := r.URL.Query().Get("q")
	if q == "" {
		writeJSON(w, http.StatusOK, paginatedResponse([]any{}, 0, 1, 12))
		return
	}

	limit, offset := parsePageParams(r)
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	articles, err := h.queries.SearchArticles(ctx, db.SearchArticlesParams{
		PlaintoTsquery: q,
		Limit:          limit,
		Offset:         offset,
	})
	if err != nil {
		writeError(w, 500, "search failed")
		return
	}

	total, _ := h.queries.CountSearchArticles(ctx, q)

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
			"province":      a.Province,
			"district":      a.District,
			"thumbnailUrl":  thumbnailURL,
			"viewCount":     a.ViewCount,
			"categoryName":  a.CategoryName,
			"categorySlug":  a.CategorySlug,
			"categoryColor": a.CategoryColor,
			"rank":          a.Rank,
		}
	}
	writeJSON(w, http.StatusOK, paginatedResponse(items, total, page, int(limit)))
}

func (h *Handler) TrackView(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	// Hash the IP
	ip := r.RemoteAddr
	ipHash := fmt.Sprintf("%x", sha256.Sum256([]byte(ip)))

	// Fire and forget
	go func() {
		_ = h.queries.CreateViewEvent(ctx, db.CreateViewEventParams{
			ID:        cuid.New(),
			ArticleID: id,
			IpHash:    ipHash,
			UserAgent: nilStr(r.UserAgent()),
			Referrer:  nilStr(r.Referer()),
		})
		_ = h.queries.IncrementViewCount(ctx, id)
	}()

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) SitemapData(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	slugs, err := h.queries.ListAllArticlesSlugs(ctx)
	if err != nil {
		writeError(w, 500, "failed to fetch sitemap data")
		return
	}

	items := make([]map[string]any, len(slugs))
	for i, s := range slugs {
		items[i] = map[string]any{"slug": s.Slug, "updatedAt": s.UpdatedAt}
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

// --- Helpers ---

func articleListRow(id, title, slug, description, authorName, status string,
	publishedAt *time.Time, province, district, ward, thumbnailKey *string,
	viewCount int32, categoryName, categorySlug, categoryColor *string,
	createdAt, updatedAt time.Time) map[string]any {

	var thumbnailURL *string
	if thumbnailKey != nil {
		url := fmt.Sprintf("/api/thumbs/%s", id)
		thumbnailURL = &url
	}

	return map[string]any{
		"id":            id,
		"title":         title,
		"slug":          slug,
		"description":   description,
		"authorName":    authorName,
		"status":        status,
		"publishedAt":   publishedAt,
		"province":      province,
		"district":      district,
		"ward":          ward,
		"thumbnailUrl":  thumbnailURL,
		"viewCount":     viewCount,
		"categoryName":  categoryName,
		"categorySlug":  categorySlug,
		"categoryColor": categoryColor,
		"createdAt":     createdAt,
		"updatedAt":     updatedAt,
	}
}

func nilStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
