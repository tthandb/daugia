package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/daugia999/backend/internal/db"
	"github.com/daugia999/backend/internal/handler"
	"github.com/daugia999/backend/internal/storage"
)

const (
	startupTimeout  = 15 * time.Second
	shutdownTimeout = 15 * time.Second
	minJWTSecretLen = 32
)

var placeholderSecrets = map[string]bool{
	"your-secret-key-change-this": true,
	"changeme":                    true,
	"secret":                      true,
}

func main() {
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "seed":
			exitOn(runSeed())
			return
		case "migrate":
			fmt.Fprintln(os.Stderr, "migrations are applied with golang-migrate:\n  migrate -path migrations -database \"$DATABASE_URL\" up")
			os.Exit(2)
		case "migrate-legacy":
			exitOn(runMigrateLegacy())
			return
		case "migrate-local":
			exitOn(runMigrateLocal())
			return
		case "reoptimize-thumbs":
			exitOn(runReoptimizeThumbs())
			return
		}
	}
	exitOn(runServer())
}

func exitOn(err error) {
	if err != nil {
		log.Fatal(err)
	}
}

func runServer() error {
	port := envOr("PORT", "8080")
	jwtSecret := mustEnv("JWT_SECRET")
	if err := validateJWTSecret(jwtSecret); err != nil {
		return err
	}
	corsOrigin := envOr("CORS_ORIGIN", "http://localhost:3000")
	secureCookie := envOr("SECURE_COOKIE", "false") == "true"

	ctx, cancel := context.WithTimeout(context.Background(), startupTimeout)
	pool, err := openPool(ctx)
	if err != nil {
		cancel()
		return err
	}
	defer pool.Close()
	store, err := openStore(ctx)
	cancel()
	if err != nil {
		return err
	}

	h := handler.New(db.New(pool), pool, store, []byte(jwtSecret), secureCookie)

	r := chi.NewRouter()
	// Order matters: the request id and client ip must be resolved before the
	// logger reads them, and the recoverer must wrap everything below it.
	r.Use(chimw.RequestID)
	r.Use(handler.TrustedRealIP)
	r.Use(quietHealthLogger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Compress(5))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{corsOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	handler.RegisterRoutes(r, h)

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       2 * time.Minute,
		WriteTimeout:      3 * time.Minute,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    64 << 10,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Printf("server listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	select {
	case err := <-errCh:
		return fmt.Errorf("server: %w", err)
	case sig := <-quit:
		log.Printf("received %s, shutting down", sig)
	}

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancelShutdown()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("forced shutdown: %v", err)
	}
	log.Println("server stopped")
	return nil
}

// quietHealthLogger is chi's request logger minus the healthcheck noise.
func quietHealthLogger(next http.Handler) http.Handler {
	logged := chimw.Logger(next)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/health" {
			next.ServeHTTP(w, r)
			return
		}
		logged.ServeHTTP(w, r)
	})
}

func validateJWTSecret(secret string) error {
	if len(secret) < minJWTSecretLen {
		return fmt.Errorf("JWT_SECRET must be at least %d characters", minJWTSecretLen)
	}
	if placeholderSecrets[strings.ToLower(secret)] {
		return errors.New("JWT_SECRET is a placeholder value; generate a random secret")
	}
	return nil
}

func openPool(ctx context.Context) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(mustEnv("DATABASE_URL"))
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	cfg.MaxConns = 10
	cfg.MinConns = 1
	cfg.MaxConnLifetime = time.Hour
	cfg.MaxConnIdleTime = 10 * time.Minute
	cfg.ConnConfig.ConnectTimeout = 5 * time.Second
	if cfg.ConnConfig.RuntimeParams == nil {
		cfg.ConnConfig.RuntimeParams = map[string]string{}
	}
	cfg.ConnConfig.RuntimeParams["statement_timeout"] = "30000"
	cfg.ConnConfig.RuntimeParams["application_name"] = "daugia-api"

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect to database: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	log.Println("connected to database")
	return pool, nil
}

func openStore(ctx context.Context) (*storage.Client, error) {
	store, err := storage.New(ctx,
		mustEnv("MINIO_ENDPOINT"),
		mustEnv("MINIO_ACCESS_KEY"),
		mustEnv("MINIO_SECRET_KEY"),
		envOr("MINIO_BUCKET", "articles"),
		envOr("MINIO_USE_SSL", "false") == "true",
	)
	if err != nil {
		return nil, fmt.Errorf("connect to object storage: %w", err)
	}
	log.Println("connected to object storage")
	return store, nil
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

func runSeed() error {
	ctx, cancel := context.WithTimeout(context.Background(), startupTimeout)
	defer cancel()
	pool, err := openPool(ctx)
	if err != nil {
		return err
	}
	defer pool.Close()
	return seedDB(ctx, db.New(pool))
}

func runMigrateLegacy() error {
	ctx := context.Background()
	pool, store, err := openDeps(ctx)
	if err != nil {
		return err
	}
	defer pool.Close()
	return migrateLegacy(ctx, db.New(pool), store)
}

func runMigrateLocal() error {
	ctx := context.Background()
	pool, store, err := openDeps(ctx)
	if err != nil {
		return err
	}
	defer pool.Close()
	return migrateLocal(ctx, db.New(pool), store)
}

func openDeps(ctx context.Context) (*pgxpool.Pool, *storage.Client, error) {
	startCtx, cancel := context.WithTimeout(ctx, startupTimeout)
	defer cancel()
	pool, err := openPool(startCtx)
	if err != nil {
		return nil, nil, err
	}
	store, err := openStore(startCtx)
	if err != nil {
		pool.Close()
		return nil, nil, err
	}
	return pool, store, nil
}
