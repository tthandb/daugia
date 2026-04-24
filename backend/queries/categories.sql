-- name: ListCategories :many
SELECT * FROM categories ORDER BY sort_order;

-- name: GetCategoryBySlug :one
SELECT * FROM categories WHERE slug = $1;

-- name: GetCategoryByID :one
SELECT * FROM categories WHERE id = $1;

-- name: CreateCategory :one
INSERT INTO categories (id, name, slug, color, sort_order)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateCategory :one
UPDATE categories SET
    name = COALESCE(sqlc.narg('name'), name),
    slug = COALESCE(sqlc.narg('slug'), slug),
    color = COALESCE(sqlc.narg('color'), color),
    sort_order = COALESCE(sqlc.narg('sort_order'), sort_order)
WHERE id = @id
RETURNING *;

-- name: DeleteCategory :exec
DELETE FROM categories WHERE id = $1;

-- name: UpsertCategory :one
INSERT INTO categories (id, name, slug, color, sort_order)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    color = EXCLUDED.color,
    sort_order = EXCLUDED.sort_order
RETURNING *;
