package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lucsky/cuid"

	"github.com/daugia999/backend/internal/auth"
	"github.com/daugia999/backend/internal/db"
	"github.com/daugia999/backend/internal/storage"
)

var (
	testJWTSecret = []byte("test-secret-test-secret-test-secret-1234")
	migrateOnce   sync.Once
	migrateErr    error
)

func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)

	migrateOnce.Do(func() { migrateErr = applyMigrations(ctx, pool) })
	if migrateErr != nil {
		t.Fatalf("migrate: %v", migrateErr)
	}
	if _, err := pool.Exec(ctx, `TRUNCATE view_events, article_tags, article_images, article_attachments, articles, tags, categories, users CASCADE`); err != nil {
		t.Fatalf("truncate: %v", err)
	}
	return pool
}

func applyMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, `DROP SCHEMA public CASCADE; CREATE SCHEMA public`); err != nil {
		return err
	}
	files, err := filepath.Glob(filepath.Join("..", "..", "migrations", "*.up.sql"))
	if err != nil {
		return err
	}
	sort.Strings(files)
	for _, f := range files {
		sql, err := os.ReadFile(f)
		if err != nil {
			return err
		}
		if _, err := pool.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("%s: %w", filepath.Base(f), err)
		}
	}
	return nil
}

type fakeStore struct {
	mu      sync.Mutex
	objects map[string][]byte
	deleted []string
	failGet bool
}

func newFakeStore() *fakeStore { return &fakeStore{objects: map[string][]byte{}} }

func (s *fakeStore) Upload(_ context.Context, key string, r io.Reader, _ int64, _ string) error {
	b, err := io.ReadAll(r)
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.objects[key] = b
	return nil
}

func (s *fakeStore) GetObject(_ context.Context, key string) (*storage.Object, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	b, ok := s.objects[key]
	if !ok || s.failGet {
		return nil, fmt.Errorf("object %q not found", key)
	}
	return &storage.Object{ReadCloser: io.NopCloser(bytes.NewReader(b)), Size: int64(len(b))}, nil
}

func (s *fakeStore) PresignedURL(_ context.Context, key string, _ time.Duration) (string, error) {
	return "https://store.test/" + key, nil
}

func (s *fakeStore) PresignedDownloadURL(_ context.Context, key, name string, _ time.Duration) (string, error) {
	return "https://store.test/" + key + "?name=" + name, nil
}

func (s *fakeStore) Delete(_ context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.objects, key)
	s.deleted = append(s.deleted, key)
	return nil
}

func (s *fakeStore) DeletePrefix(_ context.Context, prefix string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for k := range s.objects {
		if strings.HasPrefix(k, prefix) {
			delete(s.objects, k)
			s.deleted = append(s.deleted, k)
		}
	}
	return nil
}

func (s *fakeStore) has(key string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.objects[key]
	return ok
}

type testEnv struct {
	t       *testing.T
	pool    *pgxpool.Pool
	queries *db.Queries
	store   *fakeStore
	h       *Handler
	router  chi.Router
}

func newTestEnv(t *testing.T) *testEnv {
	t.Helper()
	return newEnvWithPool(t, testPool(t), newFakeStore())
}

func newEnvWithPool(t *testing.T, pool *pgxpool.Pool, store *fakeStore) *testEnv {
	t.Helper()
	h := New(db.New(pool), pool, store, testJWTSecret, false)
	r := chi.NewRouter()
	RegisterRoutes(r, h)
	return &testEnv{t: t, pool: pool, queries: db.New(pool), store: store, h: h, router: r}
}

func updateThumb(id string, key *string) db.SetArticleThumbnailParams {
	return db.SetArticleThumbnailParams{ID: id, ThumbnailKey: key}
}

func (e *testEnv) do(req *http.Request) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	e.router.ServeHTTP(rec, req)
	return rec
}

func (e *testEnv) public(method, path string, body any) *httptest.ResponseRecorder {
	return e.do(jsonRequest(e.t, method, path, body))
}

func (e *testEnv) admin(method, path string, body any) *httptest.ResponseRecorder {
	req := jsonRequest(e.t, method, path, body)
	e.authorize(req)
	return e.do(req)
}

func (e *testEnv) authorize(req *http.Request) {
	token, err := auth.GenerateToken("admin-id", "admin@test", "ADMIN", testJWTSecret)
	if err != nil {
		e.t.Fatalf("token: %v", err)
	}
	req.AddCookie(&http.Cookie{Name: "token", Value: token})
}

func jsonRequest(t *testing.T, method, path string, body any) *http.Request {
	t.Helper()
	var buf io.Reader
	if body != nil {
		switch b := body.(type) {
		case string:
			buf = strings.NewReader(b)
		case []byte:
			buf = bytes.NewReader(b)
		default:
			enc, err := json.Marshal(body)
			if err != nil {
				t.Fatalf("marshal: %v", err)
			}
			buf = bytes.NewReader(enc)
		}
	}
	req := httptest.NewRequest(method, path, buf)
	req.Header.Set("Content-Type", "application/json")
	return req
}

type filePart struct {
	field, name, mime string
	data              []byte
}

func multipartRequest(t *testing.T, path string, fields map[string]string, files ...filePart) *http.Request {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	for k, v := range fields {
		if err := w.WriteField(k, v); err != nil {
			t.Fatal(err)
		}
	}
	for _, f := range files {
		hdr := make(map[string][]string)
		hdr["Content-Disposition"] = []string{fmt.Sprintf(`form-data; name="%s"; filename="%s"`, f.field, f.name)}
		hdr["Content-Type"] = []string{f.mime}
		pw, err := w.CreatePart(hdr)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := pw.Write(f.data); err != nil {
			t.Fatal(err)
		}
	}
	w.Close()
	req := httptest.NewRequest(http.MethodPost, path, &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

func decodeBody(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode body %q: %v", rec.Body.String(), err)
	}
	return out
}

func dataOf(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	d, ok := decodeBody(t, rec)["data"].(map[string]any)
	if !ok {
		t.Fatalf("no data object in %s", rec.Body.String())
	}
	return d
}

type articleOpts struct {
	status   string
	title    string
	province string
	thumb    string
	rawKey   string
}

func (e *testEnv) createArticle(o articleOpts) db.CreateArticleRow {
	e.t.Helper()
	if o.status == "" {
		o.status = "PUBLISHED"
	}
	if o.title == "" {
		o.title = "Thông báo đấu giá " + cuid.Slug()
	}
	var publishedAt *time.Time
	if o.status == "PUBLISHED" {
		now := time.Now().UTC().Truncate(time.Microsecond)
		publishedAt = &now
	}
	params := db.CreateArticleParams{
		ID:           cuid.New(),
		Title:        o.title,
		Slug:         slugifyTitle(o.title) + "-" + cuid.Slug(),
		Description:  "mô tả",
		AuthorName:   "Nguyễn Văn Dương",
		ContentHtml:  "<p>nội dung</p>",
		ContentPlain: "nội dung",
		Status:       o.status,
		PublishedAt:  publishedAt,
	}
	if o.province != "" {
		params.Province = &o.province
	}
	if o.thumb != "" {
		params.ThumbnailKey = &o.thumb
		e.store.objects[o.thumb] = webpBytes()
	}
	if o.rawKey != "" {
		params.OriginalFileKey = &o.rawKey
		name := "goc.pdf"
		params.OriginalFileName = &name
		e.store.objects[o.rawKey] = []byte("%PDF-1.4 fake")
	}
	a, err := e.queries.CreateArticle(context.Background(), params)
	if err != nil {
		e.t.Fatalf("create article: %v", err)
	}
	return a
}

func (e *testEnv) createImage(articleID string, order int32) db.ArticleImage {
	e.t.Helper()
	id := cuid.New()
	key := fmt.Sprintf("images/%s/%s.webp", articleID, id)
	e.store.objects[key] = webpBytes()
	img, err := e.queries.CreateArticleImage(context.Background(), db.CreateArticleImageParams{
		ID: id, ArticleID: articleID, FileKey: key, FileName: "anh.webp", SortOrder: order,
	})
	if err != nil {
		e.t.Fatalf("create image: %v", err)
	}
	return img
}

func (e *testEnv) createAttachment(articleID string) db.ArticleAttachment {
	e.t.Helper()
	id := cuid.New()
	key := fmt.Sprintf("attachments/%s/%s.pdf", articleID, id)
	e.store.objects[key] = []byte("%PDF-1.4 fake")
	att, err := e.queries.CreateArticleAttachment(context.Background(), db.CreateArticleAttachmentParams{
		ID: id, ArticleID: articleID, FileKey: key, FileName: "Quy chế.pdf", FileMime: "application/pdf",
	})
	if err != nil {
		e.t.Fatalf("create attachment: %v", err)
	}
	return att
}

func (e *testEnv) articleByID(id string) db.GetArticleByIDRow {
	e.t.Helper()
	a, err := e.queries.GetArticleByID(context.Background(), id)
	if err != nil {
		e.t.Fatalf("get article: %v", err)
	}
	return a
}

func webpBytes() []byte {
	return append([]byte("RIFF\x00\x00\x00\x00WEBPVP8 "), bytes.Repeat([]byte{0}, 20)...)
}

func pngBytes() []byte {
	return append([]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}, bytes.Repeat([]byte{0}, 20)...)
}
