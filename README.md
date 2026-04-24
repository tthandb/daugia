# ĐẤUGIÁ — Cổng Nghiên Cứu Thị Trường Đấu Giá

Research portal for **CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN** — a joint-venture real estate auction company in Vietnam.

Admins upload DOCX/PDF market research documents. Content is parsed and displayed as premium editorial article pages for institutional investors and auction professionals.

## Architecture

```
Vercel (edge)              nginx-ingress (K8s)
  │ Next.js SSR/SSG              │ cert-manager (TLS)
  │                              │
daugia.vercel.app         api.yourdomain.com
  │                              │
  └──── API_URL ────────────────▶│
                            Go API Pod
                               │
                          ┌────┴────┐
                          │         │
                       pgx       minio-go
                          │         │
                     PostgreSQL   MinIO
```

**Frontend**: Next.js 14 on Vercel — SSR/SSG for SEO, client-rendered admin
**Backend**: Go + Chi on k3s (Oracle Cloud Free Tier) — PostgreSQL, MinIO, JWT auth

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Go 1.22+, Chi router, pgx, sqlc |
| Database | PostgreSQL 16 (native FTS with `'simple'` dictionary) |
| Storage | MinIO (S3-compatible, self-hosted) |
| Auth | golang-jwt + bcrypt, httpOnly cookie |
| Parsing | mammoth CLI (DOCX→HTML), pdftotext (PDF→text) |
| Images | bimg/libvips (webp thumbnails) |
| Infra | Kubernetes (k3s), nginx-ingress, cert-manager |
| Frontend Hosting | Vercel (free tier) |
| Analytics | Vercel Analytics + backend view tracking |

## Quick Start

### Prerequisites

- [Go 1.22+](https://go.dev/dl/)
- [Bun](https://bun.sh/)
- [sqlc](https://sqlc.dev/)
- [golang-migrate](https://github.com/golang-migrate/migrate)
- PostgreSQL 16
- MinIO

### Backend

```bash
cd backend

# Copy env and configure
cp .env.example .env

# Generate type-safe query code
sqlc generate

# Install dependencies
go mod tidy

# Run database migrations
migrate -path migrations -database "$DATABASE_URL" up

# Seed admin user + categories
go run cmd/api/main.go seed

# Start API server
go run cmd/api/main.go
```

The API runs on `http://localhost:8080`. Health check: `GET /api/health`.

### Frontend

```bash
cd frontend

# Install dependencies
bun install

# Create env file
cp .env.local.example .env.local

# Start dev server
bun run dev
```

The frontend runs on `http://localhost:3000`.

### Docker (Backend)

```bash
docker build -t daugia-api backend/
docker run -p 8080:8080 --env-file backend/.env daugia-api
```

## Project Structure

```
backend/
  cmd/api/           Go API server + seed + legacy migration
  internal/
    auth/            JWT, bcrypt, Chi middleware
    handler/         HTTP handlers (articles, images, attachments, auth, search)
    storage/         MinIO client
    parser/          Document parsing (mammoth, pdftotext, bluemonday)
    model/           API types
    db/              sqlc-generated query code
  migrations/        SQL migrations (schema + FTS)
  queries/           SQL query files for sqlc

frontend/
  src/
    app/
      (public)/      Public pages (SSR/SSG, SEO optimized)
      (admin)/       Admin pages (client-rendered)
    components/      Shared React components
    lib/             API client, utilities
    middleware.ts    JWT auth guard for /admin/*

k8s/                 Kubernetes manifests
```

## Key Features

- **Document Upload Pipeline**: DOCX/PDF → parsed HTML → sanitized → FTS indexed → stored in MinIO
- **Full-Text Search**: PostgreSQL native tsvector with GIN index, weighted fields (title > description > content)
- **Vietnamese Support**: Playfair Display + Be Vietnam Pro fonts, `'simple'` FTS dictionary
- **SEO**: SSR/SSG, meta tags, Open Graph, JSON-LD structured data, dynamic sitemap
- **Admin Dashboard**: Stats, article CRUD, image gallery, file attachments, publish workflow
- **View Analytics**: Dual-layer — Vercel Analytics (page views) + backend per-article tracking

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `MINIO_ENDPOINT` | MinIO server address |
| `MINIO_ACCESS_KEY` | MinIO access key |
| `MINIO_SECRET_KEY` | MinIO secret key |
| `MINIO_BUCKET` | MinIO bucket name (default: `articles`) |
| `CORS_ORIGIN` | Allowed CORS origin |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `API_URL` | Backend API URL (e.g., `http://localhost:8080`) |

## Deployment

### Frontend → Vercel

Connect GitHub repo, set root directory to `frontend`, add `API_URL` env var.

### Backend → Kubernetes

```bash
# Build and push Docker image
docker build -t yourdockerhub/daugia-api:latest backend/
docker push yourdockerhub/daugia-api:latest

# Deploy to k3s
kubectl apply -f k8s/

# First-time setup
kubectl exec deploy/api -n realestate -- /app/api seed
kubectl exec deploy/api -n realestate -- /app/api migrate-legacy
```

## Legacy Migration

Imports 38 articles from the old Supabase database:

```bash
# Set legacy env vars
export LEGACY_SUPABASE_URL=https://your-project.supabase.co
export LEGACY_SUPABASE_ANON_KEY=your-anon-key

# Run migration
go run cmd/api/main.go migrate-legacy
```

## Design System

| Element | Value |
|---|---|
| Heading Font | Playfair Display (serif) |
| Body Font | Be Vietnam Pro (sans-serif) |
| Primary | `#1C1917` (charcoal) |
| Accent | `#A16207` (gold) |
| Background | `#FAFAF9` (warm white) |
| Style | Editorial Minimalism |

## License

Private. All rights reserved by CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN.
