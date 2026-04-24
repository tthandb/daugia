package model

import "time"

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

// Article is the full article representation for detail pages.
type Article struct {
	ID            string              `json:"id"`
	Title         string              `json:"title"`
	Slug          string              `json:"slug"`
	Description   string              `json:"description"`
	AuthorName    string              `json:"authorName"`
	ContentHtml   string              `json:"contentHtml"`
	Status        string              `json:"status"`
	PublishedAt   *time.Time          `json:"publishedAt"`
	Province      string              `json:"province"`
	District      string              `json:"district"`
	Ward          string              `json:"ward"`
	AssetType     string              `json:"assetType"`
	PlotCount     *int                `json:"plotCount"`
	TotalArea     string              `json:"totalArea"`
	ThumbnailUrl  string              `json:"thumbnailUrl"`
	ViewCount     int64               `json:"viewCount"`
	CategoryId    string              `json:"categoryId"`
	CategoryName  string              `json:"categoryName"`
	CategorySlug  string              `json:"categorySlug"`
	CategoryColor string              `json:"categoryColor"`
	Tags          []Tag               `json:"tags"`
	Images        []ArticleImage      `json:"images"`
	Attachments   []ArticleAttachment `json:"attachments"`
	CreatedAt     time.Time           `json:"createdAt"`
	UpdatedAt     time.Time           `json:"updatedAt"`
}

// ArticleListItem is a lighter article representation for list/grid views.
type ArticleListItem struct {
	ID            string     `json:"id"`
	Title         string     `json:"title"`
	Slug          string     `json:"slug"`
	Description   string     `json:"description"`
	AuthorName    string     `json:"authorName"`
	Status        string     `json:"status"`
	PublishedAt   *time.Time `json:"publishedAt"`
	Province      string     `json:"province"`
	District      string     `json:"district"`
	Ward          string     `json:"ward"`
	AssetType     string     `json:"assetType"`
	PlotCount     *int       `json:"plotCount"`
	TotalArea     string     `json:"totalArea"`
	ThumbnailUrl  string     `json:"thumbnailUrl"`
	ViewCount     int64      `json:"viewCount"`
	CategoryId    string     `json:"categoryId"`
	CategoryName  string     `json:"categoryName"`
	CategorySlug  string     `json:"categorySlug"`
	CategoryColor string     `json:"categoryColor"`
	Tags          []Tag      `json:"tags"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

// Category represents an article category.
type Category struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	Color     string `json:"color"`
	SortOrder int    `json:"sortOrder"`
}

// Tag represents an article tag.
type Tag struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

// ArticleImage represents an image attached to an article.
type ArticleImage struct {
	ID        string `json:"id"`
	ArticleId string `json:"articleId"`
	Url       string `json:"url"`
	FileName  string `json:"fileName"`
	AltText   string `json:"altText"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
	SizeBytes int64  `json:"sizeBytes"`
	SortOrder int    `json:"sortOrder"`
}

// ArticleAttachment represents a downloadable file attached to an article.
type ArticleAttachment struct {
	ID        string `json:"id"`
	ArticleId string `json:"articleId"`
	Url       string `json:"url"`
	FileName  string `json:"fileName"`
	FileMime  string `json:"fileMime"`
	SizeBytes int64  `json:"sizeBytes"`
	SortOrder int    `json:"sortOrder"`
}

// User represents a user account (password hash is never serialized).
type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

// ViewEvent represents a single article view event.
type ViewEvent struct {
	ID        string    `json:"id"`
	ArticleId string    `json:"articleId"`
	ViewedAt  time.Time `json:"viewedAt"`
	IpHash    string    `json:"ipHash"`
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

// CreateArticleRequest is the payload for creating a new article.
type CreateArticleRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	AuthorName  string   `json:"authorName"`
	CategoryId  string   `json:"categoryId"`
	Province    string   `json:"province"`
	District    string   `json:"district"`
	Ward        string   `json:"ward"`
	AssetType   string   `json:"assetType"`
	PlotCount   *int     `json:"plotCount"`
	TotalArea   string   `json:"totalArea"`
	Tags        []string `json:"tags"`
}

// UpdateArticleRequest is the payload for updating an article.
// All fields are pointers so clients can send only the fields they want to change.
type UpdateArticleRequest struct {
	Title       *string   `json:"title"`
	Description *string   `json:"description"`
	AuthorName  *string   `json:"authorName"`
	CategoryId  *string   `json:"categoryId"`
	Province    *string   `json:"province"`
	District    *string   `json:"district"`
	Ward        *string   `json:"ward"`
	AssetType   *string   `json:"assetType"`
	PlotCount   *int      `json:"plotCount"`
	TotalArea   *string   `json:"totalArea"`
	Tags        *[]string `json:"tags"`
}

// LoginRequest is the payload for admin login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// ReorderRequest is the payload for reordering images or attachments.
type ReorderRequest struct {
	IDs []string `json:"ids"`
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

// PaginatedResponse wraps a page of results with pagination metadata.
type PaginatedResponse[T any] struct {
	Data       []T   `json:"data"`
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	PerPage    int   `json:"perPage"`
	TotalPages int   `json:"totalPages"`
}

// ---------------------------------------------------------------------------
// API response helpers
// ---------------------------------------------------------------------------

// SuccessResponse wraps data in a standard success envelope.
func SuccessResponse(data any) map[string]any {
	return map[string]any{
		"ok":   true,
		"data": data,
	}
}

// ErrorResponse wraps an error message in a standard error envelope.
func ErrorResponse(message string) map[string]any {
	return map[string]any{
		"ok":      false,
		"message": message,
	}
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

// AdminStats holds aggregate statistics for the admin dashboard.
type AdminStats struct {
	TotalArticles int64 `json:"totalArticles"`
	Published     int64 `json:"published"`
	Drafts        int64 `json:"drafts"`
	Archived      int64 `json:"archived"`
	TotalViews    int64 `json:"totalViews"`
}
