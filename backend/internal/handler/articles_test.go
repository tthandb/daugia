package handler

import (
	"context"
	"net/http"
	"testing"
	"time"
)

func TestGetArticle_UnknownSlugIs404(t *testing.T) {
	e := newTestEnv(t)
	rec := e.public(http.MethodGet, "/api/articles/khong-ton-tai", nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestGetArticle_DraftIsHidden(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{status: "DRAFT"})
	rec := e.public(http.MethodGet, "/api/articles/"+a.Slug, nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestGetArticle_DatabaseFailureIs500Not404(t *testing.T) {
	broken := brokenEnv(t)
	for _, path := range []string{
		"/api/articles/bat-ky",
		"/api/articles/bat-ky/download",
		"/api/thumbs/x",
		"/api/images/x",
		"/api/articles/x/attachments/y",
	} {
		rec := broken.public(http.MethodGet, path, nil)
		if rec.Code != http.StatusInternalServerError {
			t.Errorf("%s: status = %d, want 500 (ISR would cache a 404)", path, rec.Code)
		}
	}
	rec := broken.admin(http.MethodGet, "/api/admin/articles/x", nil)
	if rec.Code != http.StatusInternalServerError {
		t.Errorf("admin get: status = %d, want 500", rec.Code)
	}
}

func TestListArticles_PaginatesPublishedOnly(t *testing.T) {
	e := newTestEnv(t)
	for i := 0; i < 3; i++ {
		e.createArticle(articleOpts{})
	}
	e.createArticle(articleOpts{status: "DRAFT"})

	rec := e.public(http.MethodGet, "/api/articles?per_page=2&page=1", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	body := decodeBody(t, rec)
	if body["total"].(float64) != 3 || body["totalPages"].(float64) != 2 {
		t.Fatalf("total=%v totalPages=%v, want 3/2", body["total"], body["totalPages"])
	}
	items := body["data"].([]any)
	if len(items) != 2 {
		t.Fatalf("len(data) = %d, want 2", len(items))
	}
	if _, ok := items[0].(map[string]any)["contentHtml"]; ok {
		t.Fatal("list payload must not carry contentHtml")
	}
}

func TestListArticles_DatabaseFailureIs500(t *testing.T) {
	broken := brokenEnv(t)
	rec := broken.public(http.MethodGet, "/api/articles", nil)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
}

func TestSearch_IsAccentInsensitiveAndUsesListShape(t *testing.T) {
	e := newTestEnv(t)
	e.createArticle(articleOpts{title: "Thông báo đấu giá quyền sử dụng đất Vĩnh Yên"})
	e.createArticle(articleOpts{title: "Tài sản thanh lý xe ô tô"})

	rec := e.public(http.MethodGet, "/api/search?q=dau+gia+vinh+yen", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	body := decodeBody(t, rec)
	items := body["data"].([]any)
	if len(items) != 1 {
		t.Fatalf("unaccented query matched %d articles, want 1: %s", len(items), rec.Body.String())
	}
	item := items[0].(map[string]any)
	for _, k := range []string{"auctionStart", "startingPrice", "ward", "createdAt", "rank"} {
		if _, ok := item[k]; !ok {
			t.Errorf("search result missing %q (card needs it)", k)
		}
	}

	rec = e.public(http.MethodGet, "/api/search?q=đấu+giá", nil)
	if n := len(decodeBody(t, rec)["data"].([]any)); n != 1 {
		t.Fatalf("accented query matched %d, want 1", n)
	}
}

func TestViewCount_DoesNotTouchUpdatedAtOrSearchVector(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})
	ctx := context.Background()
	before := e.articleByID(a.ID)

	time.Sleep(20 * time.Millisecond)
	if err := e.queries.IncrementViewCount(ctx, a.ID); err != nil {
		t.Fatal(err)
	}
	after := e.articleByID(a.ID)
	if !after.UpdatedAt.Equal(before.UpdatedAt) {
		t.Fatalf("view increment bumped updated_at %v → %v (sitemap lastmod noise)", before.UpdatedAt, after.UpdatedAt)
	}
	if after.ViewCount != before.ViewCount+1 {
		t.Fatalf("view_count = %d, want %d", after.ViewCount, before.ViewCount+1)
	}

	title := "Tiêu đề mới hoàn toàn"
	if _, err := e.queries.UpdateArticle(ctx, updateParams(a.ID, func(p *updateArgs) {
		p.SetTitle = true
		p.Title = &title
	})); err != nil {
		t.Fatal(err)
	}
	edited := e.articleByID(a.ID)
	if !edited.UpdatedAt.After(after.UpdatedAt) {
		t.Fatal("a real edit must still advance updated_at")
	}
	rec := e.public(http.MethodGet, "/api/search?q=hoan+toan", nil)
	if n := len(decodeBody(t, rec)["data"].([]any)); n != 1 {
		t.Fatalf("search vector not refreshed after title edit (matched %d)", n)
	}
}

func TestDownloadArticle_RedirectIsNotCacheable(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{rawKey: "raw/abc.pdf"})
	rec := e.public(http.MethodGet, "/api/articles/"+a.Slug+"/download", nil)
	if rec.Code != http.StatusTemporaryRedirect {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	if cc := rec.Header().Get("Cache-Control"); cc != "private, no-store" {
		t.Fatalf("Cache-Control = %q, want private, no-store", cc)
	}
}

func TestListArticles_ThumbnailURLIsVersioned(t *testing.T) {
	e := newTestEnv(t)
	e.createArticle(articleOpts{thumb: "thumbs/one.webp"})
	rec := e.public(http.MethodGet, "/api/articles", nil)
	item := decodeBody(t, rec)["data"].([]any)[0].(map[string]any)
	url, _ := item["thumbnailUrl"].(string)
	if !containsStr(url, "?v=") {
		t.Fatalf("thumbnailUrl %q lacks cache-busting version", url)
	}
}

func containsStr(s, sub string) bool {
	return len(sub) > 0 && len(s) >= len(sub) && indexOf(s, sub) >= 0
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
