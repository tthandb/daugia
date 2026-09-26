package handler

import (
	"context"
	"net/http"
	"net/url"
	"testing"
)

func TestUploadImages_AcceptsFileFieldAndAdoptsCover(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})

	req := multipartRequest(t, "/api/admin/articles/"+a.ID+"/images", nil,
		filePart{"file", "so-do.png", "image/png", pngBytes()})
	e.authorize(req)
	rec := e.do(req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	items := decodeBody(t, rec)["data"].([]any)
	if len(items) != 1 {
		t.Fatalf("data = %v, want one image", items)
	}
	if _, failed := items[0].(map[string]any)["error"]; failed {
		t.Fatalf("upload reported error: %v", items[0])
	}
	got := e.articleByID(a.ID)
	if got.ThumbnailKey == nil {
		t.Fatal("first gallery image was not adopted as cover")
	}
	images, _ := e.queries.ListArticleImages(context.Background(), a.ID)
	if len(images) != 1 || !e.store.has(images[0].FileKey) {
		t.Fatalf("image row/object missing: %v", images)
	}
}

func TestUploadImages_RejectsMismatchedMime(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})
	req := multipartRequest(t, "/api/admin/articles/"+a.ID+"/images", nil,
		filePart{"file", "x.png", "image/png", []byte("<svg onload=alert(1)>")})
	e.authorize(req)
	rec := e.do(req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	if len(e.store.objects) != 0 {
		t.Fatal("non-image bytes reached storage")
	}
}

func TestDeleteImage_ResetsCoverToNextImageOrNull(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})
	first := e.createImage(a.ID, 0)
	second := e.createImage(a.ID, 1)
	ctx := context.Background()
	if _, err := e.queries.SetArticleThumbnail(ctx, updateThumb(a.ID, &first.FileKey)); err != nil {
		t.Fatal(err)
	}

	if rec := e.admin(http.MethodDelete, "/api/admin/articles/"+a.ID+"/images/"+first.ID, nil); rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	if key := e.articleByID(a.ID).ThumbnailKey; key == nil || *key != second.FileKey {
		t.Fatalf("cover after deleting first image = %v, want %s", key, second.FileKey)
	}
	if rec := e.admin(http.MethodDelete, "/api/admin/articles/"+a.ID+"/images/"+second.ID, nil); rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d", rec.Code)
	}
	if key := e.articleByID(a.ID).ThumbnailKey; key != nil {
		t.Fatalf("dangling thumbnail_key %q after last image deleted", *key)
	}
}

func TestDeleteImage_ScopedToArticle(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})
	b := e.createArticle(articleOpts{})
	img := e.createImage(b.ID, 0)
	rec := e.admin(http.MethodDelete, "/api/admin/articles/"+a.ID+"/images/"+img.ID, nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("cross-article delete status = %d, want 404", rec.Code)
	}
	if !e.store.has(img.FileKey) {
		t.Fatal("image of another article was deleted")
	}
}

func TestReorderImages_AllOrNothing(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})
	b := e.createArticle(articleOpts{})
	i1 := e.createImage(a.ID, 0)
	i2 := e.createImage(a.ID, 1)
	foreign := e.createImage(b.ID, 0)

	rec := e.admin(http.MethodPatch, "/api/admin/articles/"+a.ID+"/images/reorder",
		map[string]any{"ids": []string{i2.ID, foreign.ID, i1.ID}})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 for foreign id", rec.Code)
	}
	images, _ := e.queries.ListArticleImages(context.Background(), a.ID)
	if images[0].ID != i1.ID {
		t.Fatal("partial reorder was applied")
	}

	rec = e.admin(http.MethodPatch, "/api/admin/articles/"+a.ID+"/images/reorder",
		map[string]any{"ids": []string{i2.ID, i1.ID}})
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	images, _ = e.queries.ListArticleImages(context.Background(), a.ID)
	if images[0].ID != i2.ID {
		t.Fatal("reorder not applied")
	}
}

func TestUpdateImageAlt_ReportsErrors(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})
	rec := e.admin(http.MethodPatch, "/api/admin/articles/"+a.ID+"/images/none", `{"altText":"x"}`)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestProxyImage_DraftHiddenFromPublicVisibleToAdmin(t *testing.T) {
	e := newTestEnv(t)
	draft := e.createArticle(articleOpts{status: "DRAFT", thumb: "thumbs/d.webp"})
	img := e.createImage(draft.ID, 0)

	if rec := e.public(http.MethodGet, "/api/images/"+img.ID, nil); rec.Code != http.StatusNotFound {
		t.Fatalf("public draft image status = %d, want 404", rec.Code)
	}
	if rec := e.public(http.MethodGet, "/api/thumbs/"+draft.ID, nil); rec.Code != http.StatusNotFound {
		t.Fatalf("public draft thumb status = %d, want 404", rec.Code)
	}
	if rec := e.admin(http.MethodGet, "/api/images/"+img.ID, nil); rec.Code != http.StatusOK {
		t.Fatalf("admin draft image status = %d", rec.Code)
	}
	if rec := e.admin(http.MethodGet, "/api/thumbs/"+draft.ID, nil); rec.Code != http.StatusOK {
		t.Fatalf("admin draft thumb status = %d", rec.Code)
	}

	pub := e.createArticle(articleOpts{thumb: "thumbs/p.webp"})
	rec := e.public(http.MethodGet, "/api/thumbs/"+pub.ID, nil)
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "image/webp" {
		t.Fatalf("published thumb: status %d type %q", rec.Code, rec.Header().Get("Content-Type"))
	}
}

func TestDownloadAttachment_ScopedNamedAndUncached(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})
	att := e.createAttachment(a.ID)

	rec := e.public(http.MethodGet, "/api/articles/"+a.ID+"/attachments/"+att.ID, nil)
	if rec.Code != http.StatusTemporaryRedirect {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
	loc, _ := url.QueryUnescape(rec.Header().Get("Location"))
	if !containsStr(loc, "name=Quy chế.pdf") {
		t.Fatalf("download name not forwarded: %s", loc)
	}
	if cc := rec.Header().Get("Cache-Control"); cc != "private, no-store" {
		t.Fatalf("Cache-Control = %q", cc)
	}

	other := e.createArticle(articleOpts{})
	if rec := e.public(http.MethodGet, "/api/articles/"+other.ID+"/attachments/"+att.ID, nil); rec.Code != http.StatusNotFound {
		t.Fatalf("attachment reachable via wrong article: %d", rec.Code)
	}

	draft := e.createArticle(articleOpts{status: "DRAFT"})
	datt := e.createAttachment(draft.ID)
	if rec := e.public(http.MethodGet, "/api/articles/"+draft.ID+"/attachments/"+datt.ID, nil); rec.Code != http.StatusNotFound {
		t.Fatalf("draft attachment public status = %d, want 404", rec.Code)
	}
}

func TestUploadAttachment_RejectsMismatchedMime(t *testing.T) {
	e := newTestEnv(t)
	a := e.createArticle(articleOpts{})
	req := multipartRequest(t, "/api/admin/articles/"+a.ID+"/attachments", nil,
		filePart{"file", "x.pdf", "application/pdf", []byte("<html>not pdf</html>")})
	e.authorize(req)
	if rec := e.do(req); rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
	}
}
