package handler

import (
	"context"
	"crypto/sha256"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/lucsky/cuid"

	"github.com/daugia999/backend/internal/db"
)

type listPage struct {
	items []map[string]any
	total int64
}

func (h *Handler) ListArticles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	limit, offset := parsePageParams(r)
	page := pageNumber(r)

	pg, err := h.listArticles(ctx, r, limit, offset)
	if err != nil {
		writeDBError(w, err, "not found")
		return
	}
	writeJSON(w, http.StatusOK, paginatedResponse(pg.items, pg.total, page, int(limit)))
}

func (h *Handler) listArticles(ctx context.Context, r *http.Request, limit, offset int32) (listPage, error) {
	q := r.URL.Query()
	empty := listPage{items: []map[string]any{}}

	if categorySlug := q.Get("category"); categorySlug != "" {
		cat, err := h.queries.GetCategoryBySlug(ctx, categorySlug)
		if err != nil {
			if dbErrorStatus(err) == http.StatusNotFound {
				return empty, nil
			}
			return empty, err
		}
		rows, err := h.queries.ListPublishedArticlesByCategory(ctx, db.ListPublishedArticlesByCategoryParams{
			CategoryID: &cat.ID, Limit: limit, Offset: offset,
		})
		if err != nil {
			return empty, err
		}
		total, err := h.queries.CountPublishedArticlesByCategory(ctx, &cat.ID)
		if err != nil {
			return empty, err
		}
		items := make([]map[string]any, len(rows))
		for i, a := range rows {
			items[i] = articleListRow(a.ID, a.Title, a.Slug, a.Description, a.AuthorName, a.Status, a.PublishedAt,
				a.Province, a.District, a.Ward, a.ThumbnailKey, a.ViewCount, a.CategoryName, a.CategorySlug,
				a.CategoryColor, a.CreatedAt, a.UpdatedAt, a.AuctionStart, a.AuctionEnd, a.StartingPrice)
		}
		return listPage{items, total}, nil
	}

	if province := q.Get("province"); province != "" {
		rows, err := h.queries.ListPublishedArticlesByProvince(ctx, db.ListPublishedArticlesByProvinceParams{
			Province: &province, Limit: limit, Offset: offset,
		})
		if err != nil {
			return empty, err
		}
		total, err := h.queries.CountPublishedArticlesByProvince(ctx, &province)
		if err != nil {
			return empty, err
		}
		items := make([]map[string]any, len(rows))
		for i, a := range rows {
			items[i] = articleListRow(a.ID, a.Title, a.Slug, a.Description, a.AuthorName, a.Status, a.PublishedAt,
				a.Province, a.District, a.Ward, a.ThumbnailKey, a.ViewCount, a.CategoryName, a.CategorySlug,
				a.CategoryColor, a.CreatedAt, a.UpdatedAt, a.AuctionStart, a.AuctionEnd, a.StartingPrice)
		}
		return listPage{items, total}, nil
	}

	if tagSlug := q.Get("tag"); tagSlug != "" {
		tag, err := h.queries.GetTagBySlug(ctx, tagSlug)
		if err != nil {
			if dbErrorStatus(err) == http.StatusNotFound {
				return empty, nil
			}
			return empty, err
		}
		rows, err := h.queries.ListPublishedArticlesByTag(ctx, db.ListPublishedArticlesByTagParams{
			TagID: tag.ID, Limit: limit, Offset: offset,
		})
		if err != nil {
			return empty, err
		}
		total, err := h.queries.CountPublishedArticlesByTag(ctx, tag.ID)
		if err != nil {
			return empty, err
		}
		items := make([]map[string]any, len(rows))
		for i, a := range rows {
			items[i] = articleListRow(a.ID, a.Title, a.Slug, a.Description, a.AuthorName, a.Status, a.PublishedAt,
				a.Province, a.District, a.Ward, a.ThumbnailKey, a.ViewCount, a.CategoryName, a.CategorySlug,
				a.CategoryColor, a.CreatedAt, a.UpdatedAt, a.AuctionStart, a.AuctionEnd, a.StartingPrice)
		}
		return listPage{items, total}, nil
	}

	rows, err := h.queries.ListPublishedArticles(ctx, db.ListPublishedArticlesParams{Limit: limit, Offset: offset})
	if err != nil {
		return empty, err
	}
	total, err := h.queries.CountPublishedArticles(ctx)
	if err != nil {
		return empty, err
	}
	items := make([]map[string]any, len(rows))
	for i, a := range rows {
		items[i] = articleListRow(a.ID, a.Title, a.Slug, a.Description, a.AuthorName, a.Status, a.PublishedAt,
			a.Province, a.District, a.Ward, a.ThumbnailKey, a.ViewCount, a.CategoryName, a.CategorySlug,
			a.CategoryColor, a.CreatedAt, a.UpdatedAt, a.AuctionStart, a.AuctionEnd, a.StartingPrice)
	}
	return listPage{items, total}, nil
}

func (h *Handler) FeaturedArticles(w http.ResponseWriter, r *http.Request) {
	limit := int32(5)
	if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 && l <= 20 {
		limit = int32(l)
	}

	rows, err := h.queries.FeaturedArticles(r.Context(), limit)
	if err != nil {
		writeDBError(w, err, "not found")
		return
	}
	items := make([]map[string]any, len(rows))
	for i, a := range rows {
		items[i] = articleListRow(a.ID, a.Title, a.Slug, a.Description, a.AuthorName, a.Status, a.PublishedAt,
			a.Province, a.District, a.Ward, a.ThumbnailKey, a.ViewCount, a.CategoryName, a.CategorySlug,
			a.CategoryColor, a.CreatedAt, a.UpdatedAt, a.AuctionStart, a.AuctionEnd, a.StartingPrice)
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *Handler) GetArticle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	slug := chi.URLParam(r, "slug")

	article, err := h.queries.GetArticleBySlug(ctx, slug)
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
		"thumbnailUrl":  thumbURL(article.ID, article.ThumbnailKey),
		"viewCount":     article.ViewCount,
		"categoryId":    article.CategoryID,
		"categoryName":  article.CategoryName,
		"categorySlug":  article.CategorySlug,
		"categoryColor": article.CategoryColor,
		"tags":          rel.tags,
		"images":        rel.images,
		"attachments":   rel.attachments,
		"createdAt":     article.CreatedAt,
		"updatedAt":     article.UpdatedAt,
	}

	if article.OriginalFileName != nil {
		result["originalFileName"] = *article.OriginalFileName
	}
	if article.OriginalFileMime != nil {
		result["originalFileMime"] = *article.OriginalFileMime
	}
	// SEO + auction Event schema fields. Nil-safe — clients use what they receive.
	if article.MetaDescription != nil && *article.MetaDescription != "" {
		result["metaDescription"] = *article.MetaDescription
	}
	if article.AuctionStart != nil {
		result["auctionStart"] = *article.AuctionStart
	}
	if article.AuctionEnd != nil {
		result["auctionEnd"] = *article.AuctionEnd
	}
	if article.VenueName != nil && *article.VenueName != "" {
		result["venueName"] = *article.VenueName
	}
	if article.VenueAddress != nil && *article.VenueAddress != "" {
		result["venueAddress"] = *article.VenueAddress
	}
	if article.StartingPrice != nil {
		result["startingPrice"] = *article.StartingPrice
	}
	if article.DepositAmount != nil {
		result["depositAmount"] = *article.DepositAmount
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": result})
}

type related struct {
	tags, images, attachments []map[string]any
}

func (h *Handler) loadRelated(ctx context.Context, articleID string) (related, error) {
	tags, err := h.queries.ListTagsByArticle(ctx, articleID)
	if err != nil {
		return related{}, err
	}
	images, err := h.queries.ListArticleImages(ctx, articleID)
	if err != nil {
		return related{}, err
	}
	attachments, err := h.queries.ListArticleAttachments(ctx, articleID)
	if err != nil {
		return related{}, err
	}

	rel := related{
		tags:        make([]map[string]any, len(tags)),
		images:      make([]map[string]any, len(images)),
		attachments: make([]map[string]any, len(attachments)),
	}
	for i, t := range tags {
		rel.tags[i] = map[string]any{"id": t.ID, "name": t.Name, "slug": t.Slug}
	}
	for i, img := range images {
		rel.images[i] = map[string]any{
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
	for i, att := range attachments {
		rel.attachments[i] = map[string]any{
			"id":        att.ID,
			"url":       fmt.Sprintf("/api/articles/%s/attachments/%s", articleID, att.ID),
			"fileName":  att.FileName,
			"fileMime":  att.FileMime,
			"sizeBytes": att.SizeBytes,
			"sortOrder": att.SortOrder,
		}
	}
	return rel, nil
}

// DownloadArticle redirects to a short-lived presigned URL for the original
// document. Public — only resolves PUBLISHED articles.
func (h *Handler) DownloadArticle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	slug := chi.URLParam(r, "slug")

	article, err := h.queries.GetArticleBySlug(ctx, slug)
	if err != nil {
		writeDBError(w, err, "article not found")
		return
	}
	if article.OriginalFileKey == nil {
		writeError(w, http.StatusNotFound, "no original file")
		return
	}

	downloadName := article.Slug
	if article.OriginalFileName != nil {
		downloadName = *article.OriginalFileName
	}
	url, err := h.store.PresignedDownloadURL(ctx, *article.OriginalFileKey, downloadName, 5*time.Minute)
	if err != nil {
		log.Printf("presign %s: %v", *article.OriginalFileKey, err)
		writeError(w, http.StatusBadGateway, "failed to generate download URL")
		return
	}
	redirectNoStore(w, r, url)
}

// redirectNoStore issues a redirect to a presigned URL. The redirect itself
// must never be cached, or a CDN would hand out expired signatures.
func redirectNoStore(w http.ResponseWriter, r *http.Request, url string) {
	w.Header().Set("Cache-Control", "private, no-store")
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func (h *Handler) SearchArticles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := r.URL.Query().Get("q")
	if q == "" {
		writeJSON(w, http.StatusOK, paginatedResponse([]any{}, 0, 1, defaultPerPage))
		return
	}

	limit, offset := parsePageParams(r)
	page := pageNumber(r)

	rows, err := h.queries.SearchArticles(ctx, db.SearchArticlesParams{PlaintoTsquery: q, Limit: limit, Offset: offset})
	if err != nil {
		writeDBError(w, err, "not found")
		return
	}
	total, err := h.queries.CountSearchArticles(ctx, q)
	if err != nil {
		writeDBError(w, err, "not found")
		return
	}

	items := make([]map[string]any, len(rows))
	for i, a := range rows {
		item := articleListRow(a.ID, a.Title, a.Slug, a.Description, a.AuthorName, a.Status, a.PublishedAt,
			a.Province, a.District, a.Ward, a.ThumbnailKey, a.ViewCount, a.CategoryName, a.CategorySlug,
			a.CategoryColor, a.CreatedAt, a.UpdatedAt, a.AuctionStart, a.AuctionEnd, a.StartingPrice)
		item["rank"] = a.Rank
		items[i] = item
	}
	writeJSON(w, http.StatusOK, paginatedResponse(items, total, page, int(limit)))
}

func (h *Handler) TrackView(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	ipHash := fmt.Sprintf("%x", sha256.Sum256([]byte(r.RemoteAddr)))
	userAgent := nilStr(r.UserAgent())
	referrer := nilStr(r.Referer())

	// Fire and forget on a detached context (the request context is cancelled
	// as soon as we answer). The semaphore bounds concurrent writers so a burst
	// of views cannot exhaust the connection pool.
	select {
	case h.viewSem <- struct{}{}:
	default:
		w.WriteHeader(http.StatusNoContent)
		return
	}
	go func() {
		defer func() { <-h.viewSem }()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		err := h.inTx(ctx, func(q *db.Queries) error {
			if err := q.CreateViewEvent(ctx, db.CreateViewEventParams{
				ID: cuid.New(), ArticleID: id, IpHash: ipHash, UserAgent: userAgent, Referrer: referrer,
			}); err != nil {
				return err
			}
			return q.IncrementViewCount(ctx, id)
		})
		if err != nil {
			log.Printf("view tracking for %s: %v", id, err)
		}
	}()

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) SitemapData(w http.ResponseWriter, r *http.Request) {
	slugs, err := h.queries.ListAllArticlesSlugs(r.Context())
	if err != nil {
		writeDBError(w, err, "not found")
		return
	}
	items := make([]map[string]any, len(slugs))
	for i, s := range slugs {
		items[i] = map[string]any{"slug": s.Slug, "updatedAt": s.UpdatedAt}
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func articleListRow(id, title, slug, description, authorName, status string,
	publishedAt *time.Time, province, district, ward, thumbnailKey *string,
	viewCount int32, categoryName, categorySlug, categoryColor *string,
	createdAt, updatedAt time.Time,
	auctionStart, auctionEnd *time.Time, startingPrice *int64) map[string]any {

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
		"thumbnailUrl":  thumbURL(id, thumbnailKey),
		"viewCount":     viewCount,
		"categoryName":  categoryName,
		"categorySlug":  categorySlug,
		"categoryColor": categoryColor,
		"createdAt":     createdAt,
		"updatedAt":     updatedAt,
		"auctionStart":  auctionStart,
		"auctionEnd":    auctionEnd,
		"startingPrice": startingPrice,
	}
}
