-- name: GetArticleBySlug :one
SELECT a.id, a.title, a.slug, a.description, a.author_name, a.content_html, a.content_plain,
       a.status, a.published_at, a.province, a.district, a.ward, a.asset_type, a.plot_count,
       a.total_area, a.thumbnail_key, a.original_file_key, a.original_file_name, a.original_file_mime,
       a.legacy_id, a.legacy_file_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.slug = $1 AND a.status = 'PUBLISHED';

-- name: GetArticleByID :one
SELECT a.id, a.title, a.slug, a.description, a.author_name, a.content_html, a.content_plain,
       a.status, a.published_at, a.province, a.district, a.ward, a.asset_type, a.plot_count,
       a.total_area, a.thumbnail_key, a.original_file_key, a.original_file_name, a.original_file_mime,
       a.legacy_id, a.legacy_file_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.id = $1;

-- name: ListPublishedArticles :many
SELECT a.id, a.title, a.slug, a.description, a.author_name, a.content_html, a.content_plain,
       a.status, a.published_at, a.province, a.district, a.ward, a.asset_type, a.plot_count,
       a.total_area, a.thumbnail_key, a.original_file_key, a.original_file_name, a.original_file_mime,
       a.legacy_id, a.legacy_file_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'PUBLISHED'
ORDER BY a.published_at DESC
LIMIT $1 OFFSET $2;

-- name: ListPublishedArticlesByCategory :many
SELECT a.id, a.title, a.slug, a.description, a.author_name, a.content_html, a.content_plain,
       a.status, a.published_at, a.province, a.district, a.ward, a.asset_type, a.plot_count,
       a.total_area, a.thumbnail_key, a.original_file_key, a.original_file_name, a.original_file_mime,
       a.legacy_id, a.legacy_file_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'PUBLISHED' AND a.category_id = $1
ORDER BY a.published_at DESC
LIMIT $2 OFFSET $3;

-- name: ListPublishedArticlesByProvince :many
SELECT a.id, a.title, a.slug, a.description, a.author_name, a.content_html, a.content_plain,
       a.status, a.published_at, a.province, a.district, a.ward, a.asset_type, a.plot_count,
       a.total_area, a.thumbnail_key, a.original_file_key, a.original_file_name, a.original_file_mime,
       a.legacy_id, a.legacy_file_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'PUBLISHED' AND a.province = $1
ORDER BY a.published_at DESC
LIMIT $2 OFFSET $3;

-- name: ListPublishedArticlesByTag :many
SELECT a.id, a.title, a.slug, a.description, a.author_name, a.content_html, a.content_plain,
       a.status, a.published_at, a.province, a.district, a.ward, a.asset_type, a.plot_count,
       a.total_area, a.thumbnail_key, a.original_file_key, a.original_file_name, a.original_file_mime,
       a.legacy_id, a.legacy_file_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
JOIN article_tags at ON a.id = at.article_id
WHERE a.status = 'PUBLISHED' AND at.tag_id = $1
ORDER BY a.published_at DESC
LIMIT $2 OFFSET $3;

-- name: FeaturedArticles :many
SELECT a.id, a.title, a.slug, a.description, a.author_name, a.content_html, a.content_plain,
       a.status, a.published_at, a.province, a.district, a.ward, a.asset_type, a.plot_count,
       a.total_area, a.thumbnail_key, a.original_file_key, a.original_file_name, a.original_file_mime,
       a.legacy_id, a.legacy_file_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'PUBLISHED' AND a.thumbnail_key IS NOT NULL
ORDER BY a.published_at DESC
LIMIT $1;

-- name: CountPublishedArticles :one
SELECT count(*) FROM articles WHERE status = 'PUBLISHED';

-- name: CountPublishedArticlesByCategory :one
SELECT count(*) FROM articles WHERE status = 'PUBLISHED' AND category_id = $1;

-- name: CountPublishedArticlesByProvince :one
SELECT count(*) FROM articles WHERE status = 'PUBLISHED' AND province = $1;

-- name: CountPublishedArticlesByTag :one
SELECT count(*) FROM articles a
JOIN article_tags at ON a.id = at.article_id
WHERE a.status = 'PUBLISHED' AND at.tag_id = $1;

-- name: SearchArticles :many
SELECT a.id, a.title, a.slug, a.description, a.author_name, a.content_html, a.content_plain,
       a.status, a.published_at, a.province, a.district, a.ward, a.asset_type, a.plot_count,
       a.total_area, a.thumbnail_key, a.original_file_key, a.original_file_name, a.original_file_mime,
       a.legacy_id, a.legacy_file_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       c.name as category_name, c.slug as category_slug, c.color as category_color,
       ts_rank(a.search_vector, plainto_tsquery('simple', $1)) as rank
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'PUBLISHED'
  AND a.search_vector @@ plainto_tsquery('simple', $1)
ORDER BY rank DESC
LIMIT $2 OFFSET $3;

-- name: CountSearchArticles :one
SELECT count(*) FROM articles
WHERE status = 'PUBLISHED'
  AND search_vector @@ plainto_tsquery('simple', $1);

-- name: IncrementViewCount :exec
UPDATE articles SET view_count = view_count + 1 WHERE id = $1;

-- name: ListAllArticlesSlugs :many
SELECT slug, updated_at FROM articles WHERE status = 'PUBLISHED' ORDER BY published_at DESC;

-- Admin queries

-- name: AdminListArticles :many
SELECT a.id, a.title, a.slug, a.description, a.author_name, a.content_html, a.content_plain,
       a.status, a.published_at, a.province, a.district, a.ward, a.asset_type, a.plot_count,
       a.total_area, a.thumbnail_key, a.original_file_key, a.original_file_name, a.original_file_mime,
       a.legacy_id, a.legacy_file_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE (sqlc.narg('status')::text IS NULL OR a.status = sqlc.narg('status')::text)
ORDER BY a.created_at DESC
LIMIT $1 OFFSET $2;

-- name: AdminCountArticles :one
SELECT count(*) FROM articles
WHERE (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status')::text);

-- name: AdminCountArticlesByStatus :one
SELECT count(*) FROM articles WHERE status = $1;

-- name: AdminTotalViews :one
SELECT COALESCE(sum(view_count), 0)::bigint FROM articles;

-- name: CreateArticle :one
INSERT INTO articles (
    id, title, slug, description, author_name,
    content_html, content_plain, status,
    province, district, ward, asset_type, plot_count, total_area,
    thumbnail_key, original_file_key, original_file_name, original_file_mime,
    legacy_id, legacy_file_key, category_id, published_at
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8,
    $9, $10, $11, $12, $13, $14,
    $15, $16, $17, $18,
    $19, $20, $21, $22
)
RETURNING id, title, slug, description, author_name, content_html, content_plain,
          status, published_at, province, district, ward, asset_type, plot_count,
          total_area, thumbnail_key, original_file_key, original_file_name, original_file_mime,
          legacy_id, legacy_file_key, view_count, category_id, created_at, updated_at;

-- name: UpdateArticle :one
UPDATE articles SET
    title = COALESCE(sqlc.narg('title'), title),
    slug = COALESCE(sqlc.narg('slug'), slug),
    description = COALESCE(sqlc.narg('description'), description),
    author_name = COALESCE(sqlc.narg('author_name'), author_name),
    content_html = COALESCE(sqlc.narg('content_html'), content_html),
    content_plain = COALESCE(sqlc.narg('content_plain'), content_plain),
    province = COALESCE(sqlc.narg('province'), province),
    district = COALESCE(sqlc.narg('district'), district),
    ward = COALESCE(sqlc.narg('ward'), ward),
    asset_type = COALESCE(sqlc.narg('asset_type'), asset_type),
    plot_count = COALESCE(sqlc.narg('plot_count'), plot_count),
    total_area = COALESCE(sqlc.narg('total_area'), total_area),
    thumbnail_key = COALESCE(sqlc.narg('thumbnail_key'), thumbnail_key),
    category_id = COALESCE(sqlc.narg('category_id'), category_id)
WHERE id = @id
RETURNING id, title, slug, description, author_name, content_html, content_plain,
          status, published_at, province, district, ward, asset_type, plot_count,
          total_area, thumbnail_key, original_file_key, original_file_name, original_file_mime,
          legacy_id, legacy_file_key, view_count, category_id, created_at, updated_at;

-- name: PublishArticle :exec
UPDATE articles SET status = 'PUBLISHED', published_at = now() WHERE id = $1;

-- name: UnpublishArticle :exec
UPDATE articles SET status = 'DRAFT' WHERE id = $1;

-- name: ArchiveArticle :exec
UPDATE articles SET status = 'ARCHIVED' WHERE id = $1;

-- name: DeleteArticle :exec
DELETE FROM articles WHERE id = $1;
