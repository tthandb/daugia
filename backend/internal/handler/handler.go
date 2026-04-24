package handler

import (
	"encoding/json"
	"net/http"
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
