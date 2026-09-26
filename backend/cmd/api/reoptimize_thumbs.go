package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/daugia999/backend/internal/imageopt"
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
func runReoptimizeThumbs() error {
	if !imageopt.HasVipsThumbnail() {
		return errors.New("vipsthumbnail not on PATH — install vips-tools (apk add vips-tools / apt install libvips-tools)")
	}

	ctx := context.Background()
	pool, store, err := openDeps(ctx)
	if err != nil {
		return err
	}
	defer pool.Close()

	// We need every article (regardless of status) that has a thumbnail key.
	// ListAllArticlesSlugs returns published only; query directly instead.
	rows, err := pool.Query(ctx, `SELECT id, slug, thumbnail_key FROM articles WHERE thumbnail_key IS NOT NULL`)
	if err != nil {
		return fmt.Errorf("query articles: %w", err)
	}
	defer rows.Close()

	type article struct {
		id, slug, key string
	}
	var todo []article
	for rows.Next() {
		var a article
		if err := rows.Scan(&a.id, &a.slug, &a.key); err != nil {
			return fmt.Errorf("scan: %w", err)
		}
		todo = append(todo, a)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate: %w", err)
	}

	tmpDir, err := os.MkdirTemp("", "reopt-*")
	if err != nil {
		return err
	}
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
		srcPath := filepath.Join(tmpDir, a.slug+"-src")
		f, err := os.Create(srcPath)
		if err != nil {
			obj.Close()
			return err
		}
		before, err := io.Copy(f, obj)
		f.Close()
		obj.Close()
		if err != nil {
			fmt.Printf("    SKIP (download): %v\n", err)
			continue
		}

		// Re-encode
		dstPath := filepath.Join(tmpDir, a.slug+".webp")
		w, h, err := imageopt.OptimizeWebP(ctx, srcPath, dstPath, imageopt.DefaultThumbMaxDim, imageopt.DefaultQuality)
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
		fmt.Printf("    %d → %d bytes (%.0f%%) @ %dx%d\n",
			before, after, float64(after)/float64(before)*100, w, h)
	}

	fmt.Printf("\nDone: %d thumbnails reoptimized\n", len(todo))
	if totalBefore > 0 {
		fmt.Printf("Total: %d → %d bytes  (saved %d, %.0f%% smaller)\n",
			totalBefore, totalAfter, totalBefore-totalAfter,
			(1.0-float64(totalAfter)/float64(totalBefore))*100)
	}
	return nil
}
