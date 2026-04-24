package main

import (
	"context"
	"fmt"
	"log"
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

// migrateLocal imports articles from the local legacy storage directory.
// Expects LEGACY_DATA_DIR to point to the daugia/ directory containing document/ and image/.
func migrateLocal(ctx context.Context, queries *db.Queries, store *storage.Client) {
	dataDir := os.Getenv("LEGACY_DATA_DIR")
	if dataDir == "" {
		dataDir = "/data/daugia"
	}

	docDir := filepath.Join(dataDir, "document")
	imgDir := filepath.Join(dataDir, "image")

	// List all document files
	entries, err := os.ReadDir(docDir)
	if err != nil {
		log.Fatalf("failed to read document directory %s: %v", docDir, err)
	}

	// Load categories for mapping
	cats, err := queries.ListCategories(ctx)
	if err != nil {
		log.Fatalf("failed to load categories: %v", err)
	}
	catMap := make(map[string]string) // slug -> id
	for _, c := range cats {
		catMap[c.Slug] = c.ID
	}

	// Build image map: slug prefix -> image file path
	imageMap := make(map[string]string)
	if imgEntries, err := os.ReadDir(imgDir); err == nil {
		for _, e := range imgEntries {
			name := e.Name()
			// Strip timestamp and extension to get slug prefix
			prefix := slugTimestampRe.ReplaceAllString(strings.TrimSuffix(strings.TrimSuffix(name, filepath.Ext(name)), filepath.Ext(name)), "")
			prefix = strings.TrimSuffix(prefix, filepath.Ext(prefix))
			imageMap[prefix] = filepath.Join(imgDir, name)
		}
	}

	fmt.Printf("found %d document files, %d image files\n", len(entries), len(imageMap))

	counter := 0
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		fileName := entry.Name()
		ext := strings.ToLower(filepath.Ext(fileName))

		// Skip non-document files
		if ext != ".docx" && ext != ".pdf" {
			fmt.Printf("skipping non-document: %s\n", fileName)
			continue
		}

		filePath := filepath.Join(docDir, fileName)
		articleID := cuid.New()

		// Generate slug from filename (strip extension and timestamp)
		nameNoExt := strings.TrimSuffix(fileName, ext)
		slug := slugTimestampRe.ReplaceAllString(nameNoExt, "")

		// Generate title from slug
		title := slugToTitle(slug)

		fmt.Printf("processing: %s → %s\n", fileName, slug)

		// Parse content
		var contentHTML, contentPlain string
		switch ext {
		case ".docx":
			contentHTML, contentPlain, err = parser.ParseDOCX(filePath)
		case ".pdf":
			contentHTML, contentPlain, err = parser.ParsePDF(filePath)
		}
		if err != nil {
			log.Printf("  failed to parse %s: %v", fileName, err)
			continue
		}

		// Generate description
		description := parser.GenerateDescription(contentPlain, 200)

		// Extract metadata from title
		province, district, ward := extractLocation(title)
		assetType := detectAssetType(title)
		plotCount := extractPlotCount(title)
		totalArea := extractTotalArea(title)

		// Detect category
		categoryID := detectCategory(title, slug, catMap)

		// Upload raw file to MinIO — use slug for readable filenames
		rawKey := fmt.Sprintf("raw/%s%s", slug, ext)
		rawFile, _ := os.Open(filePath)
		stat, _ := rawFile.Stat()
		mimeType := detectMime(ext)
		if err := store.Upload(ctx, rawKey, rawFile, stat.Size(), mimeType); err != nil {
			log.Printf("  failed to upload raw file: %v", err)
		}
		rawFile.Close()

		// Check for matching thumbnail image
		var thumbnailKey *string
		slugPrefix := slugTimestampRe.ReplaceAllString(nameNoExt, "")
		for prefix, imgPath := range imageMap {
			if strings.HasPrefix(slugPrefix, prefix) || strings.HasPrefix(prefix, slugPrefix) {
				// Upload thumbnail to MinIO — use slug for readable filenames
				tKey := fmt.Sprintf("thumbs/%s.webp", slug)
				imgFile, err := os.Open(imgPath)
				if err == nil {
					imgStat, _ := imgFile.Stat()
					if err := store.Upload(ctx, tKey, imgFile, imgStat.Size(), "image/jpeg"); err == nil {
						thumbnailKey = &tKey
						fmt.Printf("  matched thumbnail: %s\n", filepath.Base(imgPath))
					}
					imgFile.Close()
				}
				break
			}
		}

		// Use file modification time as publish date
		fileInfo, _ := os.Stat(filePath)
		publishedAt := fileInfo.ModTime()

		// Extract timestamp from filename for better date
		if ts := extractTimestamp(fileName); ts > 0 {
			publishedAt = time.UnixMilli(ts)
		}

		var pgPlotCount pgtype.Int4
		if plotCount > 0 {
			pgPlotCount = pgtype.Int4{Int32: int32(plotCount), Valid: true}
		}

		_, err = queries.CreateArticle(ctx, db.CreateArticleParams{
			ID:               articleID,
			Title:            title,
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
			ThumbnailKey:     thumbnailKey,
			OriginalFileKey:  &rawKey,
			OriginalFileName: &fileName,
			OriginalFileMime: &mimeType,
			LegacyID:         pgtype.Int4{},
			LegacyFileKey:    nil,
			CategoryID:       nilIfEmpty(categoryID),
			PublishedAt:      &publishedAt,
		})
		if err != nil {
			log.Printf("  failed to create article: %v", err)
		} else {
			counter++
			fmt.Printf("  ✓ created: %s\n", slug)
		}
	}

	fmt.Printf("\nlocal migration complete: %d articles imported\n", counter)
}

// slugToTitle converts a slug back to a human-readable Vietnamese title.
func slugToTitle(slug string) string {
	// Replace hyphens with spaces
	title := strings.ReplaceAll(slug, "-", " ")

	// Capitalize common Vietnamese title words
	replacements := map[string]string{
		"thong bao":        "Thông Báo",
		"dau gia":          "Đấu Giá",
		"qsd":              "QSD",
		"quyen su dung dat": "Quyền Sử Dụng Đất",
		"thua dat":         "Thửa Đất",
		"tai xa":           "Tại Xã",
		"tai":              "Tại",
		"xa":               "Xã",
		"huyen":            "Huyện",
		"tinh":             "Tỉnh",
		"vinh phuc":        "Vĩnh Phúc",
		"vinh tuong":       "Vĩnh Tường",
		"lap thach":        "Lập Thạch",
		"tam duong":        "Tam Dương",
		"yen lac":          "Yên Lạc",
		"binh xuyen":       "Bình Xuyên",
		"vinh yen":         "Vĩnh Yên",
		"phuc yen":         "Phúc Yên",
		"song lo":          "Sông Lô",
		"tam dao":          "Tam Đảo",
		"vinh son":         "Vĩnh Sơn",
		"vu di":            "Vũ Di",
		"binh duong":       "Bình Dương",
		"van quan":         "Vân Quán",
		"dong ich":         "Đồng Ích",
		"phu da":           "Phú Đa",
		"hoi thinh":        "Hội Thịnh",
		"tien lu":          "Tiến Lữ",
		"tan tien":         "Tân Tiến",
		"tan ngoc":         "Tân Ngọc",
		"thong nhat":       "Thống Nhất",
		"bac ke":           "Bắc Kẽ",
		"ba hien":          "Ba Hiền",
		"lien bao":         "Liên Bảo",
		"phu chien":        "Phú Chiến",
		"khu":              "Khu",
		"cau tram":         "Cầu Trạm",
		"dat o":            "Đất Ở",
		"dat":              "Đất",
		"ban":              "Bán",
		"tha":              "THA",
		"tai san":          "Tài Sản",
		"thi hanh an":      "Thi Hành Án",
		"thanh ly":         "Thanh Lý",
		"dam bao":          "Đảm Bảo",
		"agribank":         "Agribank",
		"cn":               "CN",
		"ubnd":             "UBND",
		"cho thue":         "Cho Thuê",
		"tdp":              "TDP",
		"tt":               "TT",
		"do":               "Do",
		"de":               "Để",
		"cua":              "Của",
		"vu":               "Vụ",
		"cong ty":          "Công Ty",
		"thu do":           "Thủ Đô",
		"hc":               "HC",
		"xe":               "Xe",
		"yaris":            "Yaris",
		"may phat dien":    "Máy Phát Điện",
		"phuong tien":      "Phương Tiện",
		"o to":             "Ô Tô",
		"nhnn":             "NHNN",
		"cctha":            "CCTHA",
	}

	// Apply longer replacements first
	for old, new_ := range replacements {
		title = strings.ReplaceAll(title, old, new_)
	}

	// Title case remaining words
	words := strings.Fields(title)
	for i, w := range words {
		if len(w) > 0 && w[0] >= 'a' && w[0] <= 'z' {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}

	return strings.Join(words, " ")
}

var timestampRe = regexp.MustCompile(`(\d{13})`)

func extractTimestamp(filename string) int64 {
	if m := timestampRe.FindStringSubmatch(filename); len(m) > 1 {
		var ts int64
		fmt.Sscanf(m[1], "%d", &ts)
		return ts
	}
	return 0
}
