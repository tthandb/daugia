package main

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/daugia999/backend/internal/db"
)

func TestValidateJWTSecret(t *testing.T) {
	cases := map[string]bool{
		"":                            false,
		"short":                       false,
		"your-secret-key-change-this": false,
		strings.Repeat("x", 31):       false,
		"kJ8#pQ2!mN9$vB4&zX7*wC1@hL6^tR3%yU5(aE0)": true,
	}
	for secret, ok := range cases {
		if err := validateJWTSecret(secret); (err == nil) != ok {
			t.Errorf("validateJWTSecret(%q) err=%v, want ok=%v", secret, err, ok)
		}
	}
}

func TestSeed_DoesNotOverwriteAdminEditedCategories(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if _, err := pool.Exec(ctx, `TRUNCATE categories, users CASCADE`); err != nil {
		t.Skipf("schema not migrated in test database: %v", err)
	}
	t.Setenv("ADMIN_EMAIL", "admin@test.local")
	t.Setenv("ADMIN_PASSWORD", "test-password-123")

	queries := db.New(pool)
	if err := seedDB(ctx, queries); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `UPDATE categories SET name = 'Đất đấu giá', sort_order = 42 WHERE slug = 'dau-gia-qsd-dat'`); err != nil {
		t.Fatal(err)
	}
	if err := seedDB(ctx, queries); err != nil {
		t.Fatal(err)
	}
	cat, err := queries.GetCategoryBySlug(ctx, "dau-gia-qsd-dat")
	if err != nil {
		t.Fatal(err)
	}
	if cat.Name != "Đất đấu giá" || cat.SortOrder != 42 {
		t.Fatalf("seed overwrote admin edits: %+v", cat)
	}
}
