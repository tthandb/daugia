package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/daugia999/backend/internal/imageopt"
	"github.com/daugia999/backend/internal/storage"
)

// runReoptimizeThumbs walks every published article whose ThumbnailKey is set,
// downloads the stored thumbnail from object storage, re-encodes it with
// vipsthumbnail (q=75, max 1600px long edge), and uploads the result back to
// the SAME key so client URLs and DB references stay valid. Idempotent —
// re-encoding an already-optimized WebP just slightly re-compresses it.
//
// One-shot recovery for legacy thumbnails the original importer wrote as raw
// JPEG bytes mislabeled as image/webp. Run after deploying:
//
//	docker compose exec api /app/api reoptimize-thumbs
func runReoptimizeThumbs() {
	if !imageopt.HasVipsThumbnail() {
		log.Fatal("vipsthumbnail not on PATH — install vips-tools (apk add vips-tools / apt install libvips-tools)")
	}

	databaseURL := mustEnv("DATABASE_URL")
	minioEndpoint := mustEnv("MINIO_ENDPOINT")
	minioAccessKey := mustEnv("MINIO_ACCESS_KEY")
	minioSecretKey := mustEnv("MINIO_SECRET_KEY")
	minioBucket := envOr("MINIO_BUCKET", "articles")
	minioSSL := envOr("MINIO_USE_SSL", "false") == "true"

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	store, err := storage.New(minioEndpoint, minioAccessKey, minioSecretKey, minioBucket, minioSSL)
	if err != nil {
		log.Fatalf("storage: %v", err)
	}

	// We need every article (regardless of status) that has a thumbnail key.
	// ListAllArticlesSlugs returns published only; query directly instead.
	rows, err := pool.Query(ctx, `SELECT id, slug, thumbnail_key FROM articles WHERE thumbnail_key IS NOT NULL`)
	if err != nil {
		log.Fatalf("query articles: %v", err)
	}
	defer rows.Close()

	type article struct {
		id, slug, key string
	}
	var todo []article
	for rows.Next() {
		var a article
		if err := rows.Scan(&a.id, &a.slug, &a.key); err == nil {
			todo = append(todo, a)
		}
	}

	tmpDir, _ := os.MkdirTemp("", "reopt-*")
	defer os.RemoveAll(tmpDir)

	var totalBefore, totalAfter int64
	for i, a := range todo {
		fmt.Printf("[%d/%d] %s (%s)\n", i+1, len(todo), a.slug, a.key)

		// Download
		obj, err := store.GetObject(ctx, a.key)
		if err != nil {
			fmt.Printf("    SKIP (get): %v\n", err)
			continue
		}
		stat, err := obj.Stat()
		if err != nil {
			obj.Close()
			fmt.Printf("    SKIP (stat): %v\n", err)
			continue
		}
		srcPath := filepath.Join(tmpDir, a.slug+"-src")
		f, _ := os.Create(srcPath)
		n, _ := io.Copy(f, obj)
		f.Close()
		obj.Close()
		before := n

		// Re-encode
		dstPath := filepath.Join(tmpDir, a.slug+".webp")
		w, h, err := imageopt.OptimizeWebP(srcPath, dstPath, imageopt.DefaultThumbMaxDim, imageopt.DefaultQuality)
		if err != nil {
			fmt.Printf("    SKIP (encode): %v\n", err)
			continue
		}

		// Upload back to same key
		dstFile, err := os.Open(dstPath)
		if err != nil {
			fmt.Printf("    SKIP (open dst): %v\n", err)
			continue
		}
		dstStat, _ := dstFile.Stat()
		if err := store.Upload(ctx, a.key, dstFile, dstStat.Size(), "image/webp"); err != nil {
			dstFile.Close()
			fmt.Printf("    FAIL (upload): %v\n", err)
			continue
		}
		dstFile.Close()
		after := dstStat.Size()

		totalBefore += before
		totalAfter += after
		_ = stat
		fmt.Printf("    %d → %d bytes (%.0f%%) @ %dx%d\n",
			before, after, float64(after)/float64(before)*100, w, h)
	}

	fmt.Printf("\nDone: %d thumbnails reoptimized\n", len(todo))
	if totalBefore > 0 {
		fmt.Printf("Total: %d → %d bytes  (saved %d, %.0f%% smaller)\n",
			totalBefore, totalAfter, totalBefore-totalAfter,
			(1.0-float64(totalAfter)/float64(totalBefore))*100)
	}
}
