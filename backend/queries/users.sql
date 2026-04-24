-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: CreateUser :one
INSERT INTO users (id, email, password_hash, name, role)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UserExists :one
SELECT EXISTS(SELECT 1 FROM users WHERE email = $1);
