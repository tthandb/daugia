package handler

import (
	"context"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/daugia999/backend/internal/db"
)

type updateArgs = db.UpdateArticleParams

func updateParams(id string, fn func(*updateArgs)) db.UpdateArticleParams {
	p := db.UpdateArticleParams{ID: id}
	fn(&p)
	return p
}

func TestAdminUpdate_NullClearsAbsentKeeps(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{province: "Phú Thọ"})
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)
	price := int64(1_500_000_000)
	if _, err := e.queries.UpdateArticle(ctx, updateParams(a.ID, func(p *updateArgs) {
		p.SetAuctionStart, p.AuctionStart = true, &start
		p.SetStartingPrice, p.StartingPrice = true, &price
	})); err != nil {
		t.Fatal(err)
	}

	rec := e.admin(http.MethodPatch, "/api/admin/articles/"+a.ID, `{"title":"Đổi tên"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	kept := e.articleByID(a.ID)
	if kept.Province == nil || kept.AuctionStart == nil || kept.StartingPrice == nil {
		t.Fatal("fields absent from PATCH body were cleared")
	}

	rec = e.admin(http.MethodPatch, "/api/admin/articles/"+a.ID,
		`{"province":null,"auctionStart":null,"startingPrice":null,"categoryId":null}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	cleared := e.articleByID(a.ID)
	if cleared.Province != nil || cleared.AuctionStart != nil || cleared.StartingPrice != nil {
		t.Fatalf("explicit null did not clear: province=%v auctionStart=%v price=%v",
			cleared.Province, cleared.AuctionStart, cleared.StartingPrice)
	}
}

func TestAdminUpdate_EmptyStringClearsOptionalText(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})
	rec := e.admin(http.MethodPatch, "/api/admin/articles/"+a.ID, `{"venueName":"Hội trường"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	rec = e.admin(http.MethodPatch, "/api/admin/articles/"+a.ID, `{"venueName":""}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	if got := e.articleByID(a.ID).VenueName; got != nil {
		t.Fatalf("venue_name = %q, want NULL", *got)
	}
}

func TestAdminUpdate_SanitizesContentAndDerivesPlain(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})
	rec := e.admin(http.MethodPatch, "/api/admin/articles/"+a.ID,
		`{"contentHtml":"<p>An toàn</p><script>alert(1)</script><a href=\"javascript:x\">x</a>"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	got := e.articleByID(a.ID)
	if containsStr(got.ContentHtml, "<script") || containsStr(got.ContentHtml, "javascript:") {
		t.Fatalf("stored unsanitized html: %q", got.ContentHtml)
	}
	if !containsStr(got.ContentPlain, "An toàn") || containsStr(got.ContentPlain, "<p>") {
		t.Fatalf("content_plain not derived from html: %q", got.ContentPlain)
	}
}

func TestAdminUpdate_ResponseUsesAPIShape(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})
	rec := e.admin(http.MethodPatch, "/api/admin/articles/"+a.ID, `{"title":"Mới"}`)
	data := dataOf(t, rec)
	if _, leaked := data["content_plain"]; leaked {
		t.Fatal("response leaks snake_case sqlc row")
	}
	if _, leaked := data["original_file_key"]; leaked {
		t.Fatal("response leaks storage key")
	}
	if _, ok := data["categoryId"]; !ok {
		t.Fatalf("response lacks camelCase fields: %v", data)
	}
	if data["title"] != "Mới" {
		t.Fatalf("title = %v", data["title"])
	}
}

func TestAdminUpdate_SlugValidation(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})
	other := e.createArticle(articleOpts{})

	rec := e.admin(http.MethodPatch, "/api/admin/articles/"+a.ID, `{"slug":"Featured!"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid slug status = %d, want 400", rec.Code)
	}
	rec = e.admin(http.MethodPatch, "/api/admin/articles/"+a.ID, `{"slug":"`+other.Slug+`"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("duplicate slug status = %d, want 409", rec.Code)
	}
	rec = e.admin(http.MethodPatch, "/api/admin/articles/khong-co", `{"title":"x"}`)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("unknown article status = %d, want 404", rec.Code)
	}
}

func TestAdminDelete_KeepsObjectsWhenDatabaseDeleteFails(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{rawKey: "raw/keep.pdf", thumb: "thumbs/keep.webp"})
	ctx := context.Background()
	_, err := e.pool.Exec(ctx, `
		CREATE OR REPLACE FUNCTION block_delete() RETURNS trigger AS $$
		BEGIN RAISE EXCEPTION 'simulated failure'; END; $$ LANGUAGE plpgsql;
		CREATE TRIGGER trg_block_delete BEFORE DELETE ON articles FOR EACH ROW EXECUTE FUNCTION block_delete();`)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { e.pool.Exec(ctx, `DROP TRIGGER IF EXISTS trg_block_delete ON articles`) })

	rec := e.admin(http.MethodDelete, "/api/admin/articles/"+a.ID, nil)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	if !e.store.has("raw/keep.pdf") || !e.store.has("thumbs/keep.webp") {
		t.Fatalf("objects deleted although the row survived: deleted=%v", e.store.deleted)
	}
}

func TestAdminDelete_RemovesRowThenObjects(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{rawKey: "raw/gone.pdf", thumb: "thumbs/gone.webp"})
	e.createImage(a.ID, 0)
	e.createAttachment(a.ID)

	rec := e.admin(http.MethodDelete, "/api/admin/articles/"+a.ID, nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	if len(e.store.objects) != 0 {
		t.Fatalf("objects left behind: %v", e.store.objects)
	}
	if rec := e.admin(http.MethodDelete, "/api/admin/articles/"+a.ID, nil); rec.Code != http.StatusNotFound {
		t.Fatalf("second delete status = %d, want 404", rec.Code)
	}
}

func TestAdminPublish_KeepsOriginalPublishedAtAnd404s(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{status: "DRAFT"})
	if rec := e.admin(http.MethodPost, "/api/admin/articles/"+a.ID+"/publish", nil); rec.Code != http.StatusOK {
		t.Fatalf("publish status = %d", rec.Code)
	}
	first := e.articleByID(a.ID).PublishedAt
	if first == nil {
		t.Fatal("published_at not set")
	}
	time.Sleep(10 * time.Millisecond)
	e.admin(http.MethodPost, "/api/admin/articles/"+a.ID+"/unpublish", nil)
	e.admin(http.MethodPost, "/api/admin/articles/"+a.ID+"/publish", nil)
	if again := e.articleByID(a.ID).PublishedAt; !again.Equal(*first) {
		t.Fatalf("re-publish moved published_at %v → %v", first, again)
	}

	for _, action := range []string{"publish", "unpublish", "archive"} {
		if rec := e.admin(http.MethodPost, "/api/admin/articles/nope/"+action, nil); rec.Code != http.StatusNotFound {
			t.Errorf("%s unknown id status = %d, want 404", action, rec.Code)
		}
	}
}

func TestAdminCreate_RejectsUnsupportedAndMismatchedFiles(t *testing.T) {
	e := newTestEnv(t)

	req := multipartRequest(t, "/api/admin/articles", nil,
		filePart{"file", "old.doc", "application/msword", []byte("\xd0\xcf\x11\xe0 legacy")})
	e.authorize(req)
	if rec := e.do(req); rec.Code != http.StatusBadRequest {
		t.Fatalf(".doc status = %d, want 400", rec.Code)
	}

	req = multipartRequest(t, "/api/admin/articles", nil,
		filePart{"file", "fake.pdf", "application/pdf", []byte("hello, not a pdf")})
	e.authorize(req)
	if rec := e.do(req); rec.Code != http.StatusBadRequest {
		t.Fatalf("mismatched magic status = %d, want 400", rec.Code)
	}
	if len(e.store.objects) != 0 {
		t.Fatal("rejected upload reached storage")
	}
}

func TestAdminCreate_ParserFailureIs422WithoutLeakingStderr(t *testing.T) {
	e := newTestEnv(t)
	fakeBinary(t, "pdftotext", "#!/bin/sh\necho 'Syntax Error: /tmp/secret' >&2\nexit 1\n")

	req := multipartRequest(t, "/api/admin/articles", nil,
		filePart{"file", "bad.pdf", "application/pdf", []byte("%PDF-1.4 broken")})
	e.authorize(req)
	rec := e.do(req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	if containsStr(rec.Body.String(), "/tmp/secret") {
		t.Fatalf("stderr leaked to client: %s", rec.Body.String())
	}
	if len(e.store.objects) != 0 {
		t.Fatal("failed parse reached storage")
	}
}

func TestAdminCreate_StoresDocumentAndDraft(t *testing.T) {
	e := newTestEnv(t)
	fakeBinary(t, "pdftotext", "#!/bin/sh\nprintf 'Cơ quan có tài sản đấu giá: UBND xã\\nGiá khởi điểm 1 tỷ\\n'\n")

	req := multipartRequest(t, "/api/admin/articles", map[string]string{"title": "Thông báo số 1"},
		filePart{"file", "tb1.pdf", "application/pdf", []byte("%PDF-1.4 ok")})
	e.authorize(req)
	rec := e.do(req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	data := dataOf(t, rec)
	if data["status"] != "DRAFT" || data["slug"] != "thong-bao-so-1" {
		t.Fatalf("unexpected create payload: %v", data)
	}
	a := e.articleByID(data["id"].(string))
	if a.OriginalFileKey == nil || !e.store.has(*a.OriginalFileKey) {
		t.Fatal("raw document not stored")
	}
	if !containsStr(a.ContentHtml, "UBND") || !containsStr(a.Description, "Cơ quan") {
		t.Fatalf("content not parsed: html=%q desc=%q", a.ContentHtml, a.Description)
	}
}

func TestAdminSetTags_ReplacesAssignments(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})
	ctx := context.Background()
	t1, _ := e.queries.CreateTag(ctx, db.CreateTagParams{ID: "t1", Name: "Đất nền", Slug: "dat-nen"})
	t2, _ := e.queries.CreateTag(ctx, db.CreateTagParams{ID: "t2", Name: "Xe", Slug: "xe"})

	rec := e.admin(http.MethodPut, "/api/admin/articles/"+a.ID+"/tags", map[string]any{"tagIds": []string{t1.ID, t2.ID}})
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	rec = e.admin(http.MethodPut, "/api/admin/articles/"+a.ID+"/tags", map[string]any{"tagIds": []string{t2.ID}})
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	tags := dataOf(t, e.admin(http.MethodGet, "/api/admin/articles/"+a.ID, nil))["tags"].([]any)
	if len(tags) != 1 || tags[0].(map[string]any)["slug"] != "xe" {
		t.Fatalf("tags = %v, want only xe", tags)
	}

	rec = e.admin(http.MethodPut, "/api/admin/articles/"+a.ID+"/tags", map[string]any{"tagIds": []string{"missing"}})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("unknown tag status = %d, want 400", rec.Code)
	}
	list := e.public(http.MethodGet, "/api/articles?tag=xe", nil)
	if n := len(decodeBody(t, list)["data"].([]any)); n != 1 {
		t.Fatalf("public tag listing returned %d, want 1", n)
	}
}

func TestAdminCategoryResponsesAreCamelCase(t *testing.T) {
	e := newTestEnv(t)
	rec := e.admin(http.MethodPost, "/api/admin/categories", `{"name":"Khác","slug":"khac","color":"#000","sortOrder":9}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	data := dataOf(t, rec)
	if _, ok := data["sortOrder"]; !ok {
		t.Fatalf("category payload not camelCase: %v", data)
	}
	if rec := e.admin(http.MethodDelete, "/api/admin/categories/none", nil); rec.Code != http.StatusNotFound {
		t.Fatalf("delete unknown category status = %d, want 404", rec.Code)
	}
}

// fakeBinary puts an executable script named name at the front of PATH.
func fakeBinary(t *testing.T, name, script string) {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))
}
