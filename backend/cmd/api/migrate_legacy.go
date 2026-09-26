package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/lucsky/cuid"

	"github.com/daugia999/backend/internal/db"
	"github.com/daugia999/backend/internal/parser"
	"github.com/daugia999/backend/internal/storage"
)

type legacyDoc struct {
	ID          int     `json:"id"`
	CreatedAt   string  `json:"created_at"`
	Title       string  `json:"title"`
	FileName    *string `json:"file_name"`
	Description *string `json:"description"`
	Slug        *string `json:"slug"`
	ImgURL      *string `json:"img_url"`
	DocumentURL *string `json:"document_url"`
}

var legacyHTTP = &http.Client{Timeout: 2 * time.Minute}

// migrateLegacy imports the old Supabase documents. Each document is
// all-or-nothing: the raw file is only uploaded once the row has been created,
// and any per-document failure is counted so the command exits non-zero.
func migrateLegacy(ctx context.Context, queries *db.Queries, store *storage.Client) error {
	supabaseURL := mustEnv("LEGACY_SUPABASE_URL")
	supabaseKey := mustEnv("LEGACY_SUPABASE_ANON_KEY")

	url := fmt.Sprintf("%s/rest/v1/documents?select=*&order=id", supabaseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)

	resp, err := legacyHTTP.Do(req)
	if err != nil {
		return fmt.Errorf("fetch documents: %w", err)
	}
	defer resp.Body.Close()

	var docs []legacyDoc
	if err := json.NewDecoder(resp.Body).Decode(&docs); err != nil {
		return fmt.Errorf("decode documents: %w", err)
	}
	fmt.Printf("fetched %d documents from Supabase\n", len(docs))

	cats, err := queries.ListCategories(ctx)
	if err != nil {
		return fmt.Errorf("load categories: %w", err)
	}
	catMap := make(map[string]string)
	for _, c := range cats {
		catMap[c.Slug] = c.ID
	}

	failed := 0
	for _, doc := range docs {
		if err := importLegacyDoc(ctx, queries, store, catMap, doc); err != nil {
			failed++
			log.Printf("doc %d: %v", doc.ID, err)
		}
	}

	fmt.Printf("legacy migration complete: %d documents, %d failed\n", len(docs), failed)
	if failed > 0 {
		return fmt.Errorf("%d documents failed to import", failed)
	}
	return nil
}

func importLegacyDoc(ctx context.Context, queries *db.Queries, store *storage.Client, catMap map[string]string, doc legacyDoc) error {
	if doc.DocumentURL == nil || *doc.DocumentURL == "" {
		fmt.Printf("skipping doc %d: no document_url\n", doc.ID)
		return nil
	}
	ext := detectExt(*doc.DocumentURL)
	if ext != ".docx" && ext != ".pdf" {
		fmt.Printf("skipping doc %d: unsupported format %s\n", doc.ID, ext)
		return nil
	}

	articleID := cuid.New()
	fmt.Printf("processing doc %d → %s: %s\n", doc.ID, articleID, doc.Title)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, *doc.DocumentURL, nil)
	if err != nil {
		return err
	}
	fileResp, err := legacyHTTP.Do(req)
	if err != nil {
		return fmt.Errorf("download: %w", err)
	}
	defer fileResp.Body.Close()
	if fileResp.StatusCode != http.StatusOK {
		return fmt.Errorf("download: HTTP %d", fileResp.StatusCode)
	}

	tmpDir, err := os.MkdirTemp("", "migrate-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tmpDir)
	tmpFile := filepath.Join(tmpDir, "doc"+ext)
	f, err := os.Create(tmpFile)
	if err != nil {
		return err
	}
	if _, err := io.Copy(f, fileResp.Body); err != nil {
		f.Close()
		return fmt.Errorf("save download: %w", err)
	}
	f.Close()

	var contentHTML, contentPlain string
	switch ext {
	case ".docx":
		contentHTML, contentPlain, err = parser.ParseDOCX(ctx, tmpFile)
	case ".pdf":
		contentHTML, contentPlain, err = parser.ParsePDF(ctx, tmpFile)
	}
	if err != nil {
		return fmt.Errorf("parse: %w", err)
	}

	description := parser.GenerateDescription(contentPlain, 200)
	if doc.Description != nil && len(*doc.Description) > 10 {
		desc := parser.StripHTML(strings.TrimSpace(*doc.Description))
		if len(desc) > 10 {
			description = desc
		}
	}

	slug := cleanSlug(doc.Slug, doc.Title)
	province, district, ward := extractLocation(doc.Title)
	assetType := detectAssetType(doc.Title)
	plotCount := extractPlotCount(doc.Title)
	totalArea := extractTotalArea(doc.Title)
	categoryID := detectCategory(doc.Title, slug, catMap)

	rawKey := fmt.Sprintf("raw/%s%s", articleID, ext)
	mimeType := detectMime(ext)
	publishedAt, _ := time.Parse(time.RFC3339, doc.CreatedAt)
	originalFileName := filepath.Base(*doc.DocumentURL)

	if doc.ID > int(^uint32(0)>>1) {
		return fmt.Errorf("legacy id %d overflows int32", doc.ID)
	}
	legacyID := int32(doc.ID)
	var pgPlotCount *int32
	if plotCount > 0 {
		v := int32(plotCount)
		pgPlotCount = &v
	}
	if _, err := queries.CreateArticle(ctx, db.CreateArticleParams{
		ID:               articleID,
		Title:            doc.Title,
		Slug:             slug,
		Description:      description,
		AuthorName:       "Nguyễn Văn Dương",
		ContentHtml:      contentHTML,
		ContentPlain:     contentPlain,
		Status:           "PUBLISHED",
		Province:         nilIfEmpty(province),
		District:         nilIfEmpty(district),
		Ward:             nilIfEmpty(ward),
		AssetType:        nilIfEmpty(assetType),
		PlotCount:        pgPlotCount,
		TotalArea:        nilIfEmpty(totalArea),
		OriginalFileKey:  &rawKey,
		OriginalFileName: &originalFileName,
		OriginalFileMime: &mimeType,
		LegacyID:         &legacyID,
		LegacyFileKey:    doc.DocumentURL,
		CategoryID:       nilIfEmpty(categoryID),
		PublishedAt:      &publishedAt,
	}); err != nil {
		return fmt.Errorf("create article: %w", err)
	}

	if err := uploadFile(ctx, store, rawKey, tmpFile, mimeType); err != nil {
		if _, delErr := queries.DeleteArticle(ctx, articleID); delErr != nil {
			log.Printf("  roll back article %s: %v", articleID, delErr)
		}
		return fmt.Errorf("upload raw file: %w", err)
	}
	fmt.Printf("  created article: %s\n", slug)
	return nil
}

func uploadFile(ctx context.Context, store *storage.Client, key, path, mimeType string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	stat, err := f.Stat()
	if err != nil {
		return err
	}
	return store.Upload(ctx, key, f, stat.Size(), mimeType)
}

// --- Helper functions ---

func detectExt(url string) string {
	lower := strings.ToLower(url)
	if strings.Contains(lower, ".pdf") {
		return ".pdf"
	}
	if strings.Contains(lower, ".doc") && !strings.Contains(lower, ".docx") {
		return ".doc"
	}
	return ".docx"
}

func detectMime(ext string) string {
	switch ext {
	case ".pdf":
		return "application/pdf"
	case ".doc":
		return "application/msword"
	default:
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	}
}

var slugTimestampRe = regexp.MustCompile(`-\d{10,}$`)

func cleanSlug(slug *string, title string) string {
	if slug != nil && *slug != "" {
		cleaned := slugTimestampRe.ReplaceAllString(*slug, "")
		return cleaned
	}
	// Fallback: generate from title
	return slugify(title)
}

func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		if r == ' ' {
			return '-'
		}
		return -1
	}, s)
	// Collapse multiple hyphens
	for strings.Contains(s, "--") {
		s = strings.ReplaceAll(s, "--", "-")
	}
	return strings.Trim(s, "-")
}

func extractLocation(title string) (province, district, ward string) {
	titleLower := strings.ToLower(title)

	// Province detection
	if strings.Contains(titleLower, "vĩnh phúc") || strings.Contains(titleLower, "vinh phuc") {
		province = "Vĩnh Phúc"
	} else if strings.Contains(titleLower, "phú thọ") {
		province = "Phú Thọ"
	}

	// District detection
	districts := map[string]string{
		"vĩnh tường": "Vĩnh Tường",
		"lập thạch":  "Lập Thạch",
		"tam dương":  "Tam Dương",
		"yên lạc":    "Yên Lạc",
		"bình xuyên": "Bình Xuyên",
		"vĩnh yên":   "Vĩnh Yên",
		"phúc yên":   "Phúc Yên",
		"sông lô":    "Sông Lô",
		"tam đảo":    "Tam Đảo",
	}
	for key, val := range districts {
		if strings.Contains(titleLower, key) {
			district = val
			if province == "" {
				province = "Vĩnh Phúc"
			}
			break
		}
	}

	// Ward/commune detection
	wardRe := regexp.MustCompile(`(?i)(xã|phường|thị trấn)\s+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)*)`)
	if m := wardRe.FindStringSubmatch(title); len(m) > 2 {
		ward = m[1] + " " + m[2]
	}

	return
}

func detectAssetType(title string) string {
	titleLower := strings.ToLower(title)
	if strings.Contains(titleLower, "quyền sử dụng đất") || strings.Contains(titleLower, "qsd") || strings.Contains(titleLower, "thửa đất") {
		return "Quyền sử dụng đất"
	}
	if strings.Contains(titleLower, "thi hành án") || strings.Contains(titleLower, "tha") {
		return "Tài sản thi hành án"
	}
	if strings.Contains(titleLower, "thanh lý") {
		return "Tài sản thanh lý"
	}
	if strings.Contains(titleLower, "xe") || strings.Contains(titleLower, "ô tô") || strings.Contains(titleLower, "phương tiện") {
		return "Phương tiện"
	}
	return ""
}

var plotCountRe = regexp.MustCompile(`(\d+)\s*thửa`)
var totalAreaRe = regexp.MustCompile(`([\d.,]+)\s*m[²2]`)

func extractPlotCount(title string) int {
	if m := plotCountRe.FindStringSubmatch(title); len(m) > 1 {
		var n int
		fmt.Sscanf(m[1], "%d", &n)
		return n
	}
	return 0
}

func extractTotalArea(title string) string {
	if m := totalAreaRe.FindStringSubmatch(title); len(m) > 1 {
		return m[1] + "m²"
	}
	return ""
}

func detectCategory(title, slug string, catMap map[string]string) string {
	titleLower := strings.ToLower(title)
	slugLower := strings.ToLower(slug)

	combined := titleLower + " " + slugLower

	if strings.Contains(combined, "qsd") || strings.Contains(combined, "quyen-su-dung") ||
		strings.Contains(combined, "quyền sử dụng") || strings.Contains(combined, "thua-dat") ||
		strings.Contains(combined, "thửa đất") {
		return catMap["dau-gia-qsd-dat"]
	}
	if strings.Contains(combined, "thi-hanh-an") || strings.Contains(combined, "thi hành án") ||
		strings.Contains(combined, "tha") || strings.Contains(combined, "cctha") {
		return catMap["tai-san-thi-hanh-an"]
	}
	if strings.Contains(combined, "thanh-ly") || strings.Contains(combined, "thanh lý") {
		return catMap["tai-san-thanh-ly"]
	}
	if strings.Contains(combined, "xe") || strings.Contains(combined, "ô tô") ||
		strings.Contains(combined, "may-phat-dien") || strings.Contains(combined, "phương tiện") {
		return catMap["dau-gia-phuong-tien"]
	}
	return catMap["khac"]
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
