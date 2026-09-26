-- name: ListArticleImages :many
SELECT * FROM article_images WHERE article_id = $1 ORDER BY sort_order, created_at;

-- name: GetArticleImage :one
SELECT i.id, i.article_id, i.file_key, i.file_name, i.alt_text, i.width, i.height,
       i.size_bytes, i.sort_order, i.created_at, a.status AS article_status
FROM article_images i
JOIN articles a ON a.id = i.article_id
WHERE i.id = $1;

-- name: CreateArticleImage :one
INSERT INTO article_images (id, article_id, file_key, file_name, alt_text, width, height, size_bytes, sort_order)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: UpdateArticleImageAlt :execrows
UPDATE article_images SET alt_text = $3 WHERE id = $1 AND article_id = $2;

-- name: UpdateArticleImageOrder :execrows
UPDATE article_images SET sort_order = $3 WHERE id = $1 AND article_id = $2;

-- name: DeleteArticleImage :one
DELETE FROM article_images WHERE id = $1 AND article_id = $2 RETURNING file_key;

-- name: ListArticleAttachments :many
SELECT * FROM article_attachments WHERE article_id = $1 ORDER BY sort_order, created_at;

-- name: GetArticleAttachment :one
SELECT at.id, at.article_id, at.file_key, at.file_name, at.file_mime, at.size_bytes,
       at.sort_order, at.created_at, a.status AS article_status
FROM article_attachments at
JOIN articles a ON a.id = at.article_id
WHERE at.id = $1 AND at.article_id = $2;

-- name: CreateArticleAttachment :one
INSERT INTO article_attachments (id, article_id, file_key, file_name, file_mime, size_bytes, sort_order)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdateArticleAttachmentName :execrows
UPDATE article_attachments SET file_name = $3 WHERE id = $1 AND article_id = $2;

-- name: DeleteArticleAttachment :one
DELETE FROM article_attachments WHERE id = $1 AND article_id = $2 RETURNING file_key;
