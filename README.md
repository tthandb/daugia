# ĐẤUGIÁ — Cổng Thông Báo Đấu Giá Bất Động Sản

Public publisher of auction notices issued by **CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN** — a joint-venture real estate auction company operating in tỉnh Phú Thọ (which absorbed the former tỉnh Vĩnh Phúc in the 2025 administrative merger).

Admins upload the official auction-notice DOCX/PDF documents the company issues for real estate, land-use rights (QSDĐ), judgment-execution assets (THA), and liquidation assets. Content is parsed and displayed as editorial pages so the public, businesses, and other parties interested in participating in auctions can find the active notices.

## Architecture

```
                    ┌────────────────────────────┐
                    │ Vercel — Next.js 14        │  daugiavinhyen.com
                    │ SSR / SSG, public pages    │  auto-deploy on push
                    └─────────────┬──────────────┘
                                  │  API_URL (server-side fetch)
                                  ▼
                    ┌────────────────────────────┐
                    │ Caddy 2 — automatic TLS    │  api.daugiavinhyen.com
                    ├────────────────────────────┤
                    │ Go API (Chi)               │  HyperCore VPS
                    ├────────────────────────────┤
                    │ PostgreSQL 16              │  Ho Chi Minh 2
                    ├────────────────────────────┤
                    │ cron 06:00 ICT → backup.sh │  daugia user crontab
                    └─────────────┬──────────────┘
                                  │  minio-go (S3 API)
                                  ▼
                    ┌────────────────────────────┐
                    │ Cloudflare R2              │  object storage
                    ├────────────────────────────┤
                    │ daugia-articles            │  documents, images
                    │ daugia-articles-backups    │  nightly pg_dump
                    └────────────────────────────┘
```

Three providers, one job each: **Vercel** serves the public site, **HyperCore**
runs the API and its database, **Cloudflare** handles DNS and object storage.
Nothing is on Kubernetes — the `k8s/` directory is dead reference only.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui |
| Fonts | Lora, Be Vietnam Pro, IBM Plex Mono — self-hosted via `next/font` |
| Backend | Go 1.22+, Chi router |
| DB access | pgx (driver) + sqlc (type-safe queries) + golang-migrate (schema) |
| Database | PostgreSQL 16 — native FTS (tsvector + GIN, `'simple'` dictionary) |
| Object storage | Cloudflare R2 (S3-compatible) via the `minio-go/v7` SDK |
| Auth | golang-jwt + bcrypt — JWT in an httpOnly cookie, Chi middleware |
| Parsing | mammoth CLI (DOCX→HTML), pdftotext/poppler (PDF→text), bluemonday sanitizer |
| Images | bimg / libvips — 800×450 webp thumbnails, AVIF support |
| Reverse proxy | Caddy 2 — automatic TLS via Let's Encrypt |
| Runtime | Docker Compose (single VM, no orchestrator) |
| CI/CD | GitHub Actions → GHCR image → SSH deploy |
| Backups | `pg_dump` + AWS CLI → Cloudflare R2, scheduled with cron |
| Monitoring | healthchecks.io dead-man's-switch, Vercel Analytics, `view_events` table |

## Hosting

Where each piece actually runs:

| Component | Host | Address / location |
|---|---|---|
| Public site (Next.js) | **Vercel** (free tier) | `daugiavinhyen.com` — auto-deploys on push to `main` |
| API (Go) | **HyperCore NVMe VPS HYPER-2** — 2 vCPU / 4 GB / 40 GB NVMe, Ho Chi Minh 2 | `api.daugiavinhyen.com` |
| PostgreSQL 16 | Same VPS, Docker container | Bound to `127.0.0.1` only — never exposed publicly |
| TLS / reverse proxy | Same VPS, Caddy 2 container | Certificates issued automatically by Let's Encrypt |
| Documents, images, thumbnails | **Cloudflare R2** | Bucket `daugia-articles` |
| Database backups | **Cloudflare R2** | Bucket `daugia-articles-backups`, prefix `postgres/` |
| Container images | **GitHub Container Registry** | `ghcr.io/<owner>/daugia-api` |
| DNS | **Cloudflare** | Nameservers `cleo` / `sue.ns.cloudflare.com` |
| Backup heartbeat | **healthchecks.io** | Ping URL kept in `deploy/hypercore/.env`, never committed |

Server-side paths on the VPS: the repo is checked out at
`/home/daugia/daugia`, and Compose runs from `deploy/hypercore/` under the
unprivileged `daugia` user.

## Quick Start

### Prerequisites

- [Go 1.22+](https://go.dev/dl/)
- [Bun](https://bun.sh/)
- [sqlc](https://sqlc.dev/)
- [golang-migrate](https://github.com/golang-migrate/migrate)
- PostgreSQL 16
- An S3-compatible bucket — Cloudflare R2 in production, or a local MinIO for development

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
| `MINIO_ENDPOINT` | S3-compatible storage endpoint — Cloudflare R2: `<account-id>.r2.cloudflarestorage.com` |
| `MINIO_ACCESS_KEY` | R2 access key ID |
| `MINIO_SECRET_KEY` | R2 secret access key |
| `MINIO_BUCKET` | R2 bucket name — code default `articles`, production uses `daugia-articles` |
| `MINIO_USE_SSL` | Use HTTPS for storage (default: `true`) |
| `CORS_ORIGIN` | Allowed CORS origin — production: `https://daugiavinhyen.com` |
| `SECURE_COOKIE` | Require HTTPS for JWT cookie (default: `true`) |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `API_URL` | Backend API URL (local: `http://localhost:8080`, production: `https://api.daugiavinhyen.com`) |

## Deployment

Both halves deploy automatically on push to `main`. Manual steps are for
recovery, not routine releases.

### Frontend → Vercel

Vercel watches the repo with root directory `frontend`. Every push to `main`
triggers a production build; pull requests get preview URLs. The only required
environment variable is `API_URL` = `https://api.daugiavinhyen.com`.

### Backend → HyperCore VPS

`.github/workflows/deploy.yml` runs whenever `backend/**`,
`deploy/hypercore/**`, or the workflow file itself changes:

1. Build the API image and push it to GHCR, tagged `sha-<short-sha>`.
2. `scp` the Compose file to the VPS.
3. Over SSH: pin `IMAGE_TAG` in `.env`, `docker compose pull api`, run
   `migrate up` in a one-off container built from the **new** image, then
   restart the API container.

Migrations run before the container swap on purpose, so newly deployed code
never queries a column that does not exist yet.

Required repository secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_PORT`
(optional, defaults to 22), `DEPLOY_PATH`.

Manual fallback, from `/home/daugia/daugia/deploy/hypercore` on the VPS:

```bash
docker compose pull api && docker compose up -d --no-deps api
docker compose exec -T api sh -c 'migrate -path /app/migrations -database "$DATABASE_URL" up'
curl -fsS https://api.daugiavinhyen.com/api/health
```

First-time setup only:

```bash
docker compose exec -T api /app/api seed            # admin user + categories
docker compose exec -T api /app/api migrate-legacy  # import 38 legacy articles
```

## Scheduled Jobs (Cron)

There is exactly one scheduled job. It lives in the **`daugia` user's crontab
on the HyperCore VPS** — not in `/etc/cron.d`, not in root's crontab, and not
in GitHub Actions:

```bash
ssh daugia@api.daugiavinhyen.com crontab -l
# 0 23 * * * /home/daugia/daugia/deploy/hypercore/backup.sh >> /home/daugia/backup.log 2>&1
```

| Property | Value |
|---|---|
| Script | `deploy/hypercore/backup.sh` (in this repo, checked out on the VPS) |
| Schedule | `0 23 * * *` — the VM runs UTC, so this is **06:00 ICT** daily |
| Log | `/home/daugia/backup.log` |
| Destination | `s3://daugia-articles-backups/postgres/db-<UTC-timestamp>.sql.gz` |
| Retention | 30 days — older dumps are pruned by the same script |
| Monitoring | healthchecks.io ping (`HEARTBEAT_URL` in `deploy/hypercore/.env`) |

Each run dumps `pg_dumpall --globals-only` (so roles can be recreated on a bare
restore) followed by `pg_dump` of the database, gzips both into one file, and
uploads it with the AWS CLI using the `r2` profile. It also deletes
`view_events` rows older than 90 days so that append-only table cannot fill the
40 GB disk; that prune is best-effort and never fails the backup.

If `HEARTBEAT_URL` is set, the script pings `/start` before dumping and the base
URL on success, so healthchecks.io raises an alert when a run stops happening —
the failure mode that would otherwise stay invisible. Configure the check with
**Period 1 day, Grace 3 hours**.

Only the database is backed up. Uploaded documents, images, and thumbnails
already live in R2 rather than on the VPS, so they need no separate dump.

Restore a dump:

```bash
aws --profile r2 --endpoint-url "https://$OBJECT_STORAGE_ENDPOINT" \
    s3 cp s3://daugia-articles-backups/postgres/db-<timestamp>.sql.gz .
gunzip -c db-<timestamp>.sql.gz | docker compose exec -T postgres psql -U "$POSTGRES_USER"
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
