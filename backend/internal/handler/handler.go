package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/daugia999/backend/internal/auth"
	"github.com/daugia999/backend/internal/db"
)

const (
	maxPage        = 100_000
	defaultPerPage = 12
	maxPerPage     = 100
	maxViewWorkers = 32
)

var slugRe = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type Handler struct {
	queries      *db.Queries
	pool         *pgxpool.Pool
	store        ObjectStore
	jwtSecret    []byte
	secureCookie bool
	viewSem      chan struct{}
}

func New(queries *db.Queries, pool *pgxpool.Pool, store ObjectStore, jwtSecret []byte, secureCookie bool) *Handler {
	return &Handler{
		queries:      queries,
		pool:         pool,
		store:        store,
		jwtSecret:    jwtSecret,
		secureCookie: secureCookie,
		viewSem:      make(chan struct{}, maxViewWorkers),
	}
}

// Health reports 503 when the database cannot be reached so the container
// healthcheck and the deploy smoke test see a real outage.
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := h.pool.Ping(ctx); err != nil {
		log.Printf("health: database ping failed: %v", err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "degraded", "database": "unreachable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --- Middleware ---

// LimitBody caps the request body; oversized bodies fail with 413 instead of
// filling memory or the temp directory.
func LimitBody(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.ContentLength > maxBytes {
				writeError(w, http.StatusRequestEntityTooLarge, "request body too large")
				return
			}
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			next.ServeHTTP(w, r)
		})
	}
}

// TrustedRealIP takes the client address only from X-Real-IP, which the reverse
// proxy overwrites on every request. Client-controllable headers such as
// X-Forwarded-For or True-Client-IP are ignored so rate limits cannot be
// bypassed by spoofing.
func TrustedRealIP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if ip := r.Header.Get("X-Real-IP"); ip != "" && net.ParseIP(ip) != nil {
			r.RemoteAddr = ip
		}
		next.ServeHTTP(w, r)
	})
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		next.ServeHTTP(w, r)
	})
}

// --- Helpers ---

func (h *Handler) isAdmin(r *http.Request) bool {
	cookie, err := r.Cookie("token")
	if err != nil {
		return false
	}
	claims, err := auth.ValidateToken(cookie.Value, h.jwtSecret)
	return err == nil && claims.Role == "ADMIN"
}

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

// spoolUpload copies an uploaded part to a temp file named by the server (never
// by the client) and returns its path; the caller removes dir.
func spoolUpload(dir, name string, src io.Reader) (string, error) {
	path := dir + string(os.PathSeparator) + name
	f, err := os.Create(path)
	if err != nil {
		return "", err
	}
	if _, err := io.Copy(f, src); err != nil {
		f.Close()
		return "", err
	}
	return path, f.Close()
}

func (h *Handler) inTx(ctx context.Context, fn func(q *db.Queries) error) error {
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := fn(h.queries.WithTx(tx)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func dbErrorStatus(err error) int {
	if errors.Is(err, pgx.ErrNoRows) {
		return http.StatusNotFound
	}
	return http.StatusInternalServerError
}

// writeDBError maps a query error to 404 (no row) or 500 (anything else, which
// is logged). Callers must never collapse database failures into 404: the
// frontend caches 404s as real "not found" pages.
func writeDBError(w http.ResponseWriter, err error, notFound string) {
	status := dbErrorStatus(err)
	if status == http.StatusInternalServerError {
		log.Printf("database error: %v", err)
		writeError(w, status, "internal error")
		return
	}
	writeError(w, status, notFound)
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func decodeJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func parsePageParams(r *http.Request) (limit, offset int32) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))

	if page < 1 {
		page = 1
	}
	if page > maxPage {
		page = maxPage
	}
	if perPage < 1 || perPage > maxPerPage {
		perPage = defaultPerPage
	}
	return int32(perPage), int32((page - 1) * perPage)
}

func pageNumber(r *http.Request) int {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		return 1
	}
	if page > maxPage {
		return maxPage
	}
	return page
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

// thumbURL versions the proxy URL by the storage key so a replaced cover is not
// served from the CDN cache under the unchanged article id.
func thumbURL(articleID string, key *string) *string {
	if key == nil {
		return nil
	}
	hsh := fnv.New32a()
	hsh.Write([]byte(*key))
	u := fmt.Sprintf("/api/thumbs/%s?v=%08x", articleID, hsh.Sum32())
	return &u
}

func nilStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func validSlug(s string) bool {
	return len(s) <= 120 && slugRe.MatchString(s)
}
