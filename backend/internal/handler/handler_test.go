package handler

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestParsePageParams_ClampsHugePage(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/articles?page=99999999999&per_page=12", nil)
	limit, offset := parsePageParams(req)
	if limit != 12 {
		t.Fatalf("limit = %d, want 12", limit)
	}
	if offset < 0 {
		t.Fatalf("offset overflowed to %d", offset)
	}
}

func TestDBErrorStatus(t *testing.T) {
	if got := dbErrorStatus(pgx.ErrNoRows); got != http.StatusNotFound {
		t.Errorf("ErrNoRows → %d, want 404", got)
	}
	if got := dbErrorStatus(errors.New("connection reset")); got != http.StatusInternalServerError {
		t.Errorf("generic error → %d, want 500", got)
	}
}

func TestLimitBody_RejectsOversizedJSON(t *testing.T) {
	e := newTestEnv(t)
	body := `{"email":"` + strings.Repeat("a", 2<<20) + `","password":"x"}`
	rec := e.public(http.MethodPost, "/api/auth/login", body)
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want 413; body %s", rec.Code, rec.Body.String())
	}
}

func TestHealth_ReportsDatabase(t *testing.T) {
	e := newTestEnv(t)
	rec := e.public(http.MethodGet, "/api/health", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("healthy status = %d", rec.Code)
	}

	broken := brokenEnv(t)
	rec = broken.public(http.MethodGet, "/api/health", nil)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status with dead pool = %d, want 503", rec.Code)
	}
}

func TestSecurityHeaders_NosniffOnEveryResponse(t *testing.T) {
	e := newTestEnv(t)
	rec := e.public(http.MethodGet, "/api/categories", nil)
	if rec.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatalf("missing nosniff header: %v", rec.Header())
	}
}

func TestTrustedRealIP_OnlyHonoursXRealIP(t *testing.T) {
	var seen string
	h := TrustedRealIP(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = r.RemoteAddr
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "10.0.0.1:1234"
	req.Header.Set("X-Forwarded-For", "1.1.1.1")
	req.Header.Set("True-Client-IP", "2.2.2.2")
	h.ServeHTTP(httptest.NewRecorder(), req)
	if seen != "10.0.0.1:1234" {
		t.Fatalf("spoofable headers changed RemoteAddr to %q", seen)
	}

	req.Header.Set("X-Real-IP", "3.3.3.3")
	h.ServeHTTP(httptest.NewRecorder(), req)
	if seen != "3.3.3.3" {
		t.Fatalf("X-Real-IP not applied, got %q", seen)
	}
}

// brokenEnv returns an env whose pool is closed, so every query fails with a
// non-ErrNoRows error.
func brokenEnv(t *testing.T) *testEnv {
	t.Helper()
	e := newTestEnv(t)
	dead, err := pgxpool.New(context.Background(), e.pool.Config().ConnString())
	if err != nil {
		t.Fatal(err)
	}
	dead.Close()
	return newEnvWithPool(t, dead, e.store)
}
