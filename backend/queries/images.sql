-- name: ListArticleImages :many
SELECT * FROM article_images WHERE article_id = $1 ORDER BY sort_order;

-- name: GetArticleImage :one
SELECT * FROM article_images WHERE id = $1;

-- name: CreateArticleImage :one
INSERT INTO article_images (id, article_id, file_key, file_name, alt_text, width, height, size_bytes, sort_order)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: UpdateArticleImageAlt :exec
UPDATE article_images SET alt_text = $2 WHERE id = $1;

-- name: UpdateArticleImageOrder :exec
UPDATE article_images SET sort_order = $2 WHERE id = $1;

-- name: DeleteArticleImage :one
DELETE FROM article_images WHERE id = $1 RETURNING file_key;

-- name: ListArticleAttachments :many
SELECT * FROM article_attachments WHERE article_id = $1 ORDER BY sort_order;

-- name: GetArticleAttachment :one
SELECT * FROM article_attachments WHERE id = $1;

-- name: CreateArticleAttachment :one
INSERT INTO article_attachments (id, article_id, file_key, file_name, file_mime, size_bytes, sort_order)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdateArticleAttachmentName :exec
UPDATE article_attachments SET file_name = $2 WHERE id = $1;

-- name: UpdateArticleAttachmentOrder :exec
UPDATE article_attachments SET sort_order = $2 WHERE id = $1;

-- name: DeleteArticleAttachment :one
DELETE FROM article_attachments WHERE id = $1 RETURNING file_key;
