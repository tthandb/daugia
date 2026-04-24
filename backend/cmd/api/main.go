package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/daugia999/backend/internal/auth"
	"github.com/daugia999/backend/internal/db"
	"github.com/daugia999/backend/internal/handler"
	"github.com/daugia999/backend/internal/storage"
)

func main() {
	// Subcommands
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "seed":
			runSeed()
			return
		case "migrate":
			runMigrate()
			return
		case "migrate-legacy":
			runMigrateLegacy()
			return
		case "migrate-local":
			runMigrateLocal()
			return
		}
	}

	// Config from env
	port := envOr("PORT", "8080")
	databaseURL := mustEnv("DATABASE_URL")
	jwtSecret := []byte(mustEnv("JWT_SECRET"))
	minioEndpoint := mustEnv("MINIO_ENDPOINT")
	minioAccessKey := mustEnv("MINIO_ACCESS_KEY")
	minioSecretKey := mustEnv("MINIO_SECRET_KEY")
	minioBucket := envOr("MINIO_BUCKET", "articles")
	minioSSL := envOr("MINIO_USE_SSL", "false") == "true"
	corsOrigin := envOr("CORS_ORIGIN", "http://localhost:3000")
	secureCookie := envOr("SECURE_COOKIE", "false") == "true"

	// Database
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}
	log.Println("connected to database")

	queries := db.New(pool)

	// MinIO
	store, err := storage.New(minioEndpoint, minioAccessKey, minioSecretKey, minioBucket, minioSSL)
	if err != nil {
		log.Fatalf("failed to connect to minio: %v", err)
	}
	log.Println("connected to minio")

	// Handlers
	h := handler.New(queries, pool, store, jwtSecret, secureCookie)

	// Router
	r := chi.NewRouter()

	// Middleware
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RealIP)
	r.Use(chimw.RequestID)
	r.Use(chimw.Compress(5))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{corsOrigin},
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Public routes
	r.Route("/api", func(r chi.Router) {
		r.Get("/health", h.Health)

		// Articles
		r.Get("/articles", h.ListArticles)
		r.Get("/articles/featured", h.FeaturedArticles)
		r.Get("/articles/{slug}", h.GetArticle)
		r.Post("/articles/{id}/view", h.TrackView)

		// Categories & tags
		r.Get("/categories", h.ListCategories)
		r.Get("/tags", h.ListTags)

		// Search
		r.Get("/search", h.SearchArticles)

		// File proxies
		r.Get("/thumbs/{id}", h.ProxyThumbnail)
		r.Get("/images/{id}", h.ProxyImage)
		r.Get("/articles/{id}/attachments/{attachmentId}", h.DownloadAttachment)

		// Sitemap data
		r.Get("/sitemap", h.SitemapData)

		// Auth
		r.Post("/auth/login", h.Login)
		r.Post("/auth/logout", h.Logout)
		r.Get("/auth/me", h.Me)

		// Admin routes (JWT required)
		r.Route("/admin", func(r chi.Router) {
			r.Use(auth.RequireAdmin(jwtSecret))

			r.Get("/stats", h.AdminStats)

			// Articles CRUD
			r.Get("/articles", h.AdminListArticles)
			r.Post("/articles", h.AdminCreateArticle)
			r.Get("/articles/{id}", h.AdminGetArticle)
			r.Patch("/articles/{id}", h.AdminUpdateArticle)
			r.Delete("/articles/{id}", h.AdminDeleteArticle)
			r.Post("/articles/{id}/publish", h.AdminPublishArticle)
			r.Post("/articles/{id}/unpublish", h.AdminUnpublishArticle)
			r.Post("/articles/{id}/archive", h.AdminArchiveArticle)

			// Article images
			r.Post("/articles/{id}/images", h.AdminUploadImages)
			r.Patch("/articles/{id}/images/{imageId}", h.AdminUpdateImage)
			r.Delete("/articles/{id}/images/{imageId}", h.AdminDeleteImage)
			r.Patch("/articles/{id}/images/reorder", h.AdminReorderImages)

			// Article attachments
			r.Post("/articles/{id}/attachments", h.AdminUploadAttachment)
			r.Patch("/articles/{id}/attachments/{attachmentId}", h.AdminUpdateAttachment)
			r.Delete("/articles/{id}/attachments/{attachmentId}", h.AdminDeleteAttachment)

			// Categories CRUD
			r.Post("/categories", h.AdminCreateCategory)
			r.Patch("/categories/{id}", h.AdminUpdateCategory)
			r.Delete("/categories/{id}", h.AdminDeleteCategory)

			// Tags CRUD
			r.Post("/tags", h.AdminCreateTag)
			r.Delete("/tags/{id}", h.AdminDeleteTag)

			// Raw file (admin only presigned URL)
			r.Get("/articles/{id}/raw", h.AdminRawFileURL)
		})
	})

	// Server
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Printf("server listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("server forced to shutdown: %v", err)
	}
	log.Println("server stopped")
}

func mustEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("required env var %s is not set", key)
	}
	return val
}

func envOr(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

// Placeholder functions for subcommands — delegated to separate files
func runSeed() {
	fmt.Println("Running seed...")
	databaseURL := mustEnv("DATABASE_URL")
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	queries := db.New(pool)
	seedDB(ctx, queries)
}

func runMigrate() {
	fmt.Println("Running migrations...")
	// golang-migrate handles this via CLI:
	// migrate -path migrations -database "$DATABASE_URL" up
	fmt.Println("Use: migrate -path migrations -database \"$DATABASE_URL\" up")
}

func runMigrateLegacy() {
	fmt.Println("Running legacy migration...")
	databaseURL := mustEnv("DATABASE_URL")
	minioEndpoint := mustEnv("MINIO_ENDPOINT")
	minioAccessKey := mustEnv("MINIO_ACCESS_KEY")
	minioSecretKey := mustEnv("MINIO_SECRET_KEY")
	minioBucket := envOr("MINIO_BUCKET", "articles")
	minioSSL := envOr("MINIO_USE_SSL", "false") == "true"

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	queries := db.New(pool)

	store, err := storage.New(minioEndpoint, minioAccessKey, minioSecretKey, minioBucket, minioSSL)
	if err != nil {
		log.Fatalf("failed to connect to minio: %v", err)
	}

	migrateLegacy(ctx, queries, store)
}

func runMigrateLocal() {
	fmt.Println("Running local migration...")
	databaseURL := mustEnv("DATABASE_URL")
	minioEndpoint := mustEnv("MINIO_ENDPOINT")
	minioAccessKey := mustEnv("MINIO_ACCESS_KEY")
	minioSecretKey := mustEnv("MINIO_SECRET_KEY")
	minioBucket := envOr("MINIO_BUCKET", "articles")
	minioSSL := envOr("MINIO_USE_SSL", "false") == "true"

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	queries := db.New(pool)

	store, err := storage.New(minioEndpoint, minioAccessKey, minioSecretKey, minioBucket, minioSSL)
	if err != nil {
		log.Fatalf("failed to connect to minio: %v", err)
	}

	migrateLocal(ctx, queries, store)
}
