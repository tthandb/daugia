-- name: ListTags :many
SELECT * FROM tags ORDER BY name;

-- name: GetTagBySlug :one
SELECT * FROM tags WHERE slug = $1;

-- name: GetTagByID :one
SELECT * FROM tags WHERE id = $1;

-- name: CreateTag :one
INSERT INTO tags (id, name, slug)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpsertTag :one
INSERT INTO tags (id, name, slug)
VALUES ($1, $2, $3)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
RETURNING *;

-- name: DeleteTag :exec
DELETE FROM tags WHERE id = $1;

-- name: ListTagsByArticle :many
SELECT t.* FROM tags t
JOIN article_tags at ON t.id = at.tag_id
WHERE at.article_id = $1
ORDER BY t.name;

-- name: AddArticleTag :exec
INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveArticleTag :exec
DELETE FROM article_tags WHERE article_id = $1 AND tag_id = $2;

-- name: RemoveAllArticleTags :exec
DELETE FROM article_tags WHERE article_id = $1;
