# ĐẤUGIÁ — Cổng Nghiên Cứu Thị Trường Đấu Giá

Research portal for **CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN** — a joint-venture real estate auction company in Vietnam.

Admins upload DOCX/PDF market research documents. Content is parsed and displayed as premium editorial article pages for institutional investors and auction professionals.

## Architecture

```
Vercel (edge)                        Hypercore
  │ Next.js SSR/SSG                     │ Go API
  │                                     │ (Docker Compose)
daugia.vercel.app            api.daugiavinhyen.com
  │                                     │
  └──── API_URL ────────────────────────┘
  (server-side fetch)
                                        │
                                   ┌────┴────┐
                                   │         │
                                  pgx    cf-go (R2)
                                   │         │
                              PostgreSQL  Cloudflare R2
```

**Frontend**: Next.js 14 on Vercel — SSR/SSG for SEO, client-rendered admin
**Backend**: Go + Chi on Hypercore (HyperCore HYPER-2, HCM 2) — PostgreSQL, Cloudflare R2, JWT auth
**Storage**: Cloudflare R2 (S3-compatible, presigned URLs for downloads)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Go 1.22+, Chi router, pgx, sqlc |
| Database | PostgreSQL 16 (native FTS with `'simple'` dictionary) |
| Storage | Cloudflare R2 (S3-compatible, presigned URLs) |
| Auth | golang-jwt + bcrypt, httpOnly cookie |
| Parsing | mammoth CLI (DOCX→HTML), pdftotext (PDF→text) |
| Images | bimg/libvips (webp thumbnails) |
| Infra | Hypercore Docker Compose (HCM 2) |
| Frontend Hosting | Vercel (free tier, auto-deploy) |
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
    storage/         Cloudflare R2 client (S3-compatible)
    parser/          Document parsing (mammoth, pdftotext, bluemonday)
    model/           API types
    db/              sqlc-generated query code
  migrations/        SQL migrations (schema + FTS)
  queries/           SQL query files for sqlc
  Dockerfile         Multi-stage Docker build
  docker-compose.yml Dev environment setup

frontend/
  src/
    app/
      (public)/      Public pages (SSR/SSG, SEO optimized)
      (admin)/       Admin pages (client-rendered, JWT protected)
    components/      Shared React components (ConfirmDialog, toasts, etc)
    lib/             API client (parseJsonOrEmpty for 204 responses), utilities
    middleware.ts    JWT auth guard for /admin/*

deploy/              Hypercore Docker Compose stack
```

## Key Features

- **Document Upload Pipeline**: DOCX/PDF → parsed HTML → sanitized → FTS indexed → stored in Cloudflare R2
- **Full-Text Search**: PostgreSQL native tsvector with GIN index, weighted fields (title > description > content)
- **Vietnamese Support**: Playfair Display + Be Vietnam Pro fonts, `'simple'` FTS dictionary
- **SEO**: SSR/SSG, meta tags, Open Graph, JSON-LD structured data, dynamic sitemap
- **Admin Dashboard**: 
  - Stats card (total articles, published, drafted, archived)
  - Article CRUD with publish/unpublish workflow
  - Status filtering (Published / Draft / Archived)
  - Image gallery management
  - File attachments with custom names
  - Real-time save feedback (toast notifications)
  - Confirmation dialogs for destructive actions
- **Public Download**: Users can download original uploaded documents from article detail pages
- **Analytics Dashboard**: Article view metrics, category breakdown, top articles by engagement
- **View Analytics**: Dual-layer — Vercel Analytics (page views) + backend per-article tracking

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `MINIO_ENDPOINT` | S3-compatible storage endpoint (e.g., `<account-id>.r2.cloudflarestorage.com`) |
| `MINIO_ACCESS_KEY` | R2 access key ID |
| `MINIO_SECRET_KEY` | R2 secret access key |
| `MINIO_BUCKET` | R2 bucket name (default: `articles`) |
| `MINIO_USE_SSL` | Use HTTPS for storage (default: `true`) |
| `CORS_ORIGIN` | Allowed CORS origin (e.g., `https://daugia.vercel.app`) |
| `SECURE_COOKIE` | Require HTTPS for JWT cookie (default: `true`) |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `API_URL` | Backend API URL (local: `http://localhost:8080`, production: `https://api.daugiavinhyen.com`) |

## Deployment

### Frontend → Vercel

1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variables:
   - `API_URL`: `https://api.daugiavinhyen.com`
4. Auto-deploys on every git push to `main`

### Backend → Hypercore

```bash
# Build Docker image locally
docker build -t ghcr.io/yourusername/daugia-api:latest backend/

# Push to GitHub Container Registry (or your registry)
docker push ghcr.io/yourusername/daugia-api:latest

# SSH into Hypercore VPS
ssh user@api.daugiavinhyen.com

# Pull latest image and restart via docker-compose
cd /opt/daugia
docker-compose pull
docker-compose up -d

# Verify health
curl https://api.daugiavinhyen.com/api/health
```

**First-time setup on VPS**:

```bash
# Initialize database and seed admin user
docker-compose exec api /app/api seed

# Import legacy articles from Supabase (if needed)
docker-compose exec api /app/api migrate-legacy
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

## Recent Improvements (2026-05)

### Admin Dashboard Enhancements
- **Publish/Unpublish Toggle**: Fixed publish workflow to use dedicated `POST /unpublish` and `POST /archive` endpoints
- **Status Filtering**: Added status filter buttons (Published / Draft / Archived) in article list with proper backend query support
- **Delete Confirmation**: Reusable `ConfirmDialog` component for all destructive actions (articles, tags, categories)
- **Save Feedback**: Real-time toast notifications at bottom-right with success/error icons and auto-dismiss
- **Analytics Dashboard**: New page showing article view metrics, category breakdown, and top articles by engagement

### API & Data Layer
- **Consistent Response Envelopes**: All API responses wrapped in `{"data": ...}` structure for predictable client-side handling
- **204 No Content Handling**: Frontend API client (`parseJsonOrEmpty`) properly handles DELETE responses with empty bodies
- **Presigned Downloads**: Backend generates presigned R2 URLs with `Content-Disposition: attachment` for browser downloads

### Public Features
- **Document Download**: Users can download original uploaded documents (DOCX/PDF/DOC) from article detail pages
  - Format badge automatically derived from filename or MIME type
  - Presigned URL generation with 5-minute TTL
  - File size displayed alongside filename

### Infrastructure
- **Cloudflare R2 Storage**: Migrated from MinIO to Cloudflare R2 for object storage
- **VPS Hosting**: Backend deployed on Hypercore Docker Compose (HCM 2, HCM region)
- **HTTPS & Security**: All endpoints now require HTTPS, secure httpOnly cookies for JWT

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
