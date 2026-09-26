-- name: GetArticleBySlug :one
SELECT a.id, a.title, a.slug, a.description, a.author_name, a.content_html, a.content_plain,
       a.status, a.published_at, a.province, a.district, a.ward, a.asset_type, a.plot_count,
       a.total_area, a.thumbnail_key, a.original_file_key, a.original_file_name, a.original_file_mime,
       a.legacy_id, a.legacy_file_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       a.meta_description, a.auction_start, a.auction_end, a.venue_name, a.venue_address,
       a.starting_price, a.deposit_amount,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.slug = $1 AND a.status = 'PUBLISHED';

-- name: GetArticleByID :one
SELECT a.id, a.title, a.slug, a.description, a.author_name, a.content_html, a.content_plain,
       a.status, a.published_at, a.province, a.district, a.ward, a.asset_type, a.plot_count,
       a.total_area, a.thumbnail_key, a.original_file_key, a.original_file_name, a.original_file_mime,
       a.legacy_id, a.legacy_file_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       a.meta_description, a.auction_start, a.auction_end, a.venue_name, a.venue_address,
       a.starting_price, a.deposit_amount,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.id = $1;

-- name: ListPublishedArticles :many
SELECT a.id, a.title, a.slug, a.description, a.author_name,
       a.status, a.published_at, a.province, a.district, a.ward,
       a.thumbnail_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       a.auction_start, a.auction_end, a.starting_price,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'PUBLISHED'
ORDER BY a.published_at DESC, a.id
LIMIT $1 OFFSET $2;

-- name: ListPublishedArticlesByCategory :many
SELECT a.id, a.title, a.slug, a.description, a.author_name,
       a.status, a.published_at, a.province, a.district, a.ward,
       a.thumbnail_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       a.auction_start, a.auction_end, a.starting_price,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'PUBLISHED' AND a.category_id = $1
ORDER BY a.published_at DESC, a.id
LIMIT $2 OFFSET $3;

-- name: ListPublishedArticlesByProvince :many
SELECT a.id, a.title, a.slug, a.description, a.author_name,
       a.status, a.published_at, a.province, a.district, a.ward,
       a.thumbnail_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       a.auction_start, a.auction_end, a.starting_price,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'PUBLISHED' AND a.province = $1
ORDER BY a.published_at DESC, a.id
LIMIT $2 OFFSET $3;

-- name: ListPublishedArticlesByTag :many
SELECT a.id, a.title, a.slug, a.description, a.author_name,
       a.status, a.published_at, a.province, a.district, a.ward,
       a.thumbnail_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       a.auction_start, a.auction_end, a.starting_price,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
JOIN article_tags at ON a.id = at.article_id
WHERE a.status = 'PUBLISHED' AND at.tag_id = $1
ORDER BY a.published_at DESC, a.id
LIMIT $2 OFFSET $3;

-- name: FeaturedArticles :many
SELECT a.id, a.title, a.slug, a.description, a.author_name,
       a.status, a.published_at, a.province, a.district, a.ward,
       a.thumbnail_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       a.auction_start, a.auction_end, a.starting_price,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'PUBLISHED' AND a.thumbnail_key IS NOT NULL
ORDER BY a.published_at DESC, a.id
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
SELECT a.id, a.title, a.slug, a.description, a.author_name,
       a.status, a.published_at, a.province, a.district, a.ward,
       a.thumbnail_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       a.auction_start, a.auction_end, a.starting_price,
       c.name as category_name, c.slug as category_slug, c.color as category_color,
       ts_rank(a.search_vector, plainto_tsquery('vi', $1)) as rank
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.status = 'PUBLISHED'
  AND a.search_vector @@ plainto_tsquery('vi', $1)
ORDER BY rank DESC, a.published_at DESC, a.id
LIMIT $2 OFFSET $3;

-- name: CountSearchArticles :one
SELECT count(*) FROM articles
WHERE status = 'PUBLISHED'
  AND search_vector @@ plainto_tsquery('vi', $1);

-- name: IncrementViewCount :exec
UPDATE articles SET view_count = view_count + 1 WHERE id = $1;

-- name: ListAllArticlesSlugs :many
SELECT slug, updated_at FROM articles WHERE status = 'PUBLISHED' ORDER BY published_at DESC;

-- Admin queries

-- name: AdminListArticles :many
SELECT a.id, a.title, a.slug, a.description, a.author_name,
       a.status, a.published_at, a.province, a.district, a.ward,
       a.thumbnail_key, a.view_count, a.category_id, a.created_at, a.updated_at,
       a.auction_start, a.auction_end, a.starting_price,
       c.name as category_name, c.slug as category_slug, c.color as category_color
FROM articles a
LEFT JOIN categories c ON a.category_id = c.id
WHERE (sqlc.narg('status')::text IS NULL OR a.status = sqlc.narg('status')::text)
ORDER BY a.created_at DESC, a.id
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
          legacy_id, legacy_file_key, view_count, category_id, created_at, updated_at,
          meta_description, auction_start, auction_end, venue_name, venue_address,
          starting_price, deposit_amount;

-- name: UpdateArticle :one
UPDATE articles SET
    title = CASE WHEN @set_title::bool THEN sqlc.narg('title') ELSE title END,
    slug = CASE WHEN @set_slug::bool THEN sqlc.narg('slug') ELSE slug END,
    description = CASE WHEN @set_description::bool THEN sqlc.narg('description') ELSE description END,
    author_name = CASE WHEN @set_author_name::bool THEN sqlc.narg('author_name') ELSE author_name END,
    content_html = CASE WHEN @set_content_html::bool THEN sqlc.narg('content_html') ELSE content_html END,
    content_plain = CASE WHEN @set_content_plain::bool THEN sqlc.narg('content_plain') ELSE content_plain END,
    province = CASE WHEN @set_province::bool THEN sqlc.narg('province') ELSE province END,
    district = CASE WHEN @set_district::bool THEN sqlc.narg('district') ELSE district END,
    ward = CASE WHEN @set_ward::bool THEN sqlc.narg('ward') ELSE ward END,
    asset_type = CASE WHEN @set_asset_type::bool THEN sqlc.narg('asset_type') ELSE asset_type END,
    plot_count = CASE WHEN @set_plot_count::bool THEN sqlc.narg('plot_count') ELSE plot_count END,
    total_area = CASE WHEN @set_total_area::bool THEN sqlc.narg('total_area') ELSE total_area END,
    category_id = CASE WHEN @set_category_id::bool THEN sqlc.narg('category_id') ELSE category_id END,
    meta_description = CASE WHEN @set_meta_description::bool THEN sqlc.narg('meta_description') ELSE meta_description END,
    auction_start = CASE WHEN @set_auction_start::bool THEN sqlc.narg('auction_start') ELSE auction_start END,
    auction_end = CASE WHEN @set_auction_end::bool THEN sqlc.narg('auction_end') ELSE auction_end END,
    venue_name = CASE WHEN @set_venue_name::bool THEN sqlc.narg('venue_name') ELSE venue_name END,
    venue_address = CASE WHEN @set_venue_address::bool THEN sqlc.narg('venue_address') ELSE venue_address END,
    starting_price = CASE WHEN @set_starting_price::bool THEN sqlc.narg('starting_price') ELSE starting_price END,
    deposit_amount = CASE WHEN @set_deposit_amount::bool THEN sqlc.narg('deposit_amount') ELSE deposit_amount END
WHERE id = @id
RETURNING id, title, slug, description, author_name, content_html, content_plain,
          status, published_at, province, district, ward, asset_type, plot_count,
          total_area, thumbnail_key, original_file_key, original_file_name, original_file_mime,
          legacy_id, legacy_file_key, view_count, category_id, created_at, updated_at,
          meta_description, auction_start, auction_end, venue_name, venue_address,
          starting_price, deposit_amount;

-- name: SetArticleThumbnail :execrows
UPDATE articles SET thumbnail_key = sqlc.narg('thumbnail_key') WHERE id = @id;

-- name: GetArticleThumbnail :one
SELECT thumbnail_key, status FROM articles WHERE id = $1;

-- name: PublishArticle :execrows
UPDATE articles SET status = 'PUBLISHED', published_at = COALESCE(published_at, now()) WHERE id = $1;

-- name: UnpublishArticle :execrows
UPDATE articles SET status = 'DRAFT' WHERE id = $1;

-- name: ArchiveArticle :execrows
UPDATE articles SET status = 'ARCHIVED' WHERE id = $1;

-- name: DeleteArticle :execrows
DELETE FROM articles WHERE id = $1;
