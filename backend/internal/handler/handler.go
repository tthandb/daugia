package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/daugia999/backend/internal/db"
	"github.com/daugia999/backend/internal/storage"
)

type Handler struct {
	queries      *db.Queries
	pool         *pgxpool.Pool
	store        *storage.Client
	jwtSecret    []byte
	secureCookie bool
}

func New(queries *db.Queries, pool *pgxpool.Pool, store *storage.Client, jwtSecret []byte, secureCookie bool) *Handler {
	return &Handler{
		queries:      queries,
		pool:         pool,
		store:        store,
		jwtSecret:    jwtSecret,
		secureCookie: secureCookie,
	}
}

// Health check
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --- Helpers ---

// uploadLocalFile opens a local file, uploads it to object storage under
// objectKey, and returns the uploaded size. Unlike the previous inline pattern,
// every step's error is propagated so callers never persist a DB row that points
// at an object which was never stored (data-loss guard).
func (h *Handler) uploadLocalFile(ctx context.Context, objectKey, localPath, contentType string) (int64, error) {
	f, err := os.Open(localPath)
	if err != nil {
		return 0, fmt.Errorf("open temp file: %w", err)
	}
	defer f.Close()
	stat, err := f.Stat()
	if err != nil {
		return 0, fmt.Errorf("stat temp file: %w", err)
	}
	if err := h.store.Upload(ctx, objectKey, f, stat.Size(), contentType); err != nil {
		return 0, fmt.Errorf("upload to storage: %w", err)
	}
	return stat.Size(), nil
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func parsePageParams(r *http.Request) (limit, offset int32) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 12
	}

	return int32(perPage), int32((page - 1) * perPage)
}

func paginatedResponse(data any, total int64, page, perPage int) map[string]any {
	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}
	return map[string]any{
		"data":       data,
		"total":      total,
		"page":       page,
		"per_page":   perPage,
		"totalPages": totalPages,
	}
}
