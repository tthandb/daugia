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

	"github.com/jackc/pgx/v5/pgtype"
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

func migrateLegacy(ctx context.Context, queries *db.Queries, store *storage.Client) {
	supabaseURL := mustEnv("LEGACY_SUPABASE_URL")
	supabaseKey := mustEnv("LEGACY_SUPABASE_ANON_KEY")

	// Fetch all documents from Supabase
	url := fmt.Sprintf("%s/rest/v1/documents?select=*&order=id", supabaseURL)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatalf("failed to fetch documents: %v", err)
	}
	defer resp.Body.Close()

	var docs []legacyDoc
	if err := json.NewDecoder(resp.Body).Decode(&docs); err != nil {
		log.Fatalf("failed to decode documents: %v", err)
	}
	fmt.Printf("fetched %d documents from Supabase\n", len(docs))

	// Load categories for mapping
	cats, err := queries.ListCategories(ctx)
	if err != nil {
		log.Fatalf("failed to load categories: %v", err)
	}
	catMap := make(map[string]string) // slug -> id
	for _, c := range cats {
		catMap[c.Slug] = c.ID
	}

	for _, doc := range docs {
		if doc.DocumentURL == nil || *doc.DocumentURL == "" {
			fmt.Printf("skipping doc %d: no document_url\n", doc.ID)
			continue
		}

		articleID := cuid.New()
		fmt.Printf("processing doc %d → %s: %s\n", doc.ID, articleID, doc.Title)

		// Download file
		fileResp, err := http.Get(*doc.DocumentURL)
		if err != nil {
			log.Printf("failed to download doc %d: %v", doc.ID, err)
			continue
		}

		tmpDir, _ := os.MkdirTemp("", "migrate-*")
		ext := detectExt(*doc.DocumentURL)
		tmpFile := filepath.Join(tmpDir, fmt.Sprintf("doc%s", ext))

		f, _ := os.Create(tmpFile)
		io.Copy(f, fileResp.Body)
		f.Close()
		fileResp.Body.Close()

		// Parse content
		var contentHTML, contentPlain string
		switch ext {
		case ".docx":
			contentHTML, contentPlain, err = parser.ParseDOCX(tmpFile)
		case ".pdf":
			contentHTML, contentPlain, err = parser.ParsePDF(tmpFile)
		default:
			fmt.Printf("  skipping unsupported format: %s\n", ext)
			os.RemoveAll(tmpDir)
			continue
		}
		if err != nil {
			log.Printf("  failed to parse doc %d: %v", doc.ID, err)
			os.RemoveAll(tmpDir)
			continue
		}

		// Generate description
		description := parser.GenerateDescription(contentPlain, 200)
		if doc.Description != nil && len(*doc.Description) > 10 {
			desc := strings.TrimSpace(*doc.Description)
			// Strip HTML from old descriptions
			desc = parser.StripHTML(desc)
			if len(desc) > 10 {
				description = desc
			}
		}

		// Clean slug
		slug := cleanSlug(doc.Slug, doc.Title)

		// Extract metadata from title
		province, district, ward := extractLocation(doc.Title)
		assetType := detectAssetType(doc.Title)
		plotCount := extractPlotCount(doc.Title)
		totalArea := extractTotalArea(doc.Title)

		// Detect category
		categoryID := detectCategory(doc.Title, slug, catMap)

		// Upload raw file to MinIO
		rawKey := fmt.Sprintf("raw/%s%s", articleID, ext)
		rawFile, _ := os.Open(tmpFile)
		stat, _ := rawFile.Stat()
		mimeType := detectMime(ext)
		if err := store.Upload(ctx, rawKey, rawFile, stat.Size(), mimeType); err != nil {
			log.Printf("  failed to upload raw file: %v", err)
		}
		rawFile.Close()

		// Parse created_at
		publishedAt, _ := time.Parse(time.RFC3339, doc.CreatedAt)

		// Get original filename from URL
		originalFileName := filepath.Base(*doc.DocumentURL)

		// Create article
		legacyID := pgtype.Int4{Int32: int32(doc.ID), Valid: true}
		var pgPlotCount pgtype.Int4
		if plotCount > 0 {
			pgPlotCount = pgtype.Int4{Int32: int32(plotCount), Valid: true}
		}
		_, err = queries.CreateArticle(ctx, db.CreateArticleParams{
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
			ThumbnailKey:     nil,
			OriginalFileKey:  &rawKey,
			OriginalFileName: &originalFileName,
			OriginalFileMime: &mimeType,
			LegacyID:         legacyID,
			LegacyFileKey:    doc.DocumentURL,
			CategoryID:       nilIfEmpty(categoryID),
			PublishedAt:      &publishedAt,
		})
		if err != nil {
			log.Printf("  failed to create article %d: %v", doc.ID, err)
		} else {
			fmt.Printf("  created article: %s\n", slug)
		}

		os.RemoveAll(tmpDir)
	}

	fmt.Println("legacy migration complete")
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
		"vĩnh tường":  "Vĩnh Tường",
		"lập thạch":   "Lập Thạch",
		"tam dương":   "Tam Dương",
		"yên lạc":     "Yên Lạc",
		"bình xuyên":  "Bình Xuyên",
		"vĩnh yên":    "Vĩnh Yên",
		"phúc yên":    "Phúc Yên",
		"sông lô":     "Sông Lô",
		"tam đảo":     "Tam Đảo",
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

