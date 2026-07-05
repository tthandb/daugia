# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Full project memory is in `MEMORY.md`. Read it at the start of every session.

---

## Project Overview

**ĐẤUGIÁ** — Public publisher of auction notices issued by **CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN** (joint-venture real estate auction company operating in tỉnh Phú Thọ — which absorbed the former tỉnh Vĩnh Phúc in the 2025 administrative merger).

**Company Details:**
- **Name**: CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN
- **Tax ID**: 2500634576
- **Established**: 2019-09-04
- **Contact**: 0912535999
- **Representative**: Nguyễn Văn Dương
- **Location**: Phú Thọ

Admins upload the official auction-notice DOCX/PDF/DOC documents the company issues (real estate, QSDĐ land-use rights, THA judgment-execution assets, liquidation assets); content is extracted and displayed as editorial article pages so the public, businesses, and other parties interested in participating in auctions can find the active notices. Website language is **Vietnamese**.

---

## Commands

```bash
# Backend (Go) — one binary, subcommands (NOT separate cmd/ packages)
cd backend
go run ./cmd/api                  # Dev server (port 8080)
go run ./cmd/api seed             # Seed admin (requires ADMIN_EMAIL + ADMIN_PASSWORD) + categories
go run ./cmd/api migrate-legacy   # Import 38 old articles from Supabase
go run ./cmd/api migrate-local    # Import from a local dump
go run ./cmd/api reoptimize-thumbs
go build -o bin/api ./cmd/api     # Build binary
go test ./...                     # Run all tests (parser + handler have tests)
sqlc generate                     # Regenerate type-safe query code after SQL changes

# Database Migrations (golang-migrate is bundled in the runtime image)
migrate -path migrations -database "$DATABASE_URL" up     # Apply migrations
migrate -path migrations -database "$DATABASE_URL" down 1 # Rollback last

# Frontend (Next.js) — code lives in frontend/src, NOT frontend/app
cd frontend
bun run dev              # Next.js dev server (port 3000)
bun run build            # Production build
bun run lint             # ESLint
bun run type-check       # tsc --noEmit

# Deploy — HyperCore VPS via Docker Compose + Caddy (NO Kubernetes)
# CI/CD: push to main → .github/workflows/deploy.yml builds a GHCR image and
# SSH-deploys (compose pull + up + migrate). The k8s/ dir is dead reference only.
cd deploy/hypercore
docker compose pull api && docker compose up -d --no-deps api   # (CI does this)
docker compose exec -T api sh -c 'migrate -path /app/migrations -database "$DATABASE_URL" up'
docker compose exec -T api /app/api seed                        # seed admin + categories
./backup.sh                                                      # daily pg_dump → R2 (cron 03:00)

# Frontend auto-deploys via Vercel on git push to main.
```

---

## Architecture

```
Vercel (edge network)          HyperCore VPS (Ho Chi Minh) — Docker Compose
    │ Next.js SSR/SSG                │ Caddy 2 (TLS auto via Let's Encrypt)
    │                                │
 daugiavinhyen.com          api.daugiavinhyen.com
    │                                │
    └──── API_URL ──────────────────▶│
    (server-side fetch)              │
                               Go API container
                                  │
                             ┌────┴────┐
                          pgx        minio-go (S3 API)
                             │            │
                        PostgreSQL   Cloudflare R2
                        (container)  (object storage)
```

Frontend on Vercel (SSR/SSG for SEO). Backend + Postgres run as Docker Compose
containers on a single HyperCore VPS fronted by Caddy; object storage is
Cloudflare R2 (S3-compatible) via the minio-go SDK. Next.js fetches the Go API
server-side for SSR pages. CORS configured on the Go API. Postgres is bound to
127.0.0.1 only. (The old Oracle/k3s/nginx/self-hosted-MinIO plan was dropped —
see MEMORY.md and deploy/hypercore/README.md for the authoritative setup.)

### Key Directories

```
backend/
  cmd/
    api/                     Go API server + subcommands (main.go, seed.go,
                             migrate_legacy.go, migrate_local.go, reoptimize_thumbs.go)
  internal/
    auth/                    JWT, bcrypt, Chi middleware
    handler/                 HTTP handlers (articles, images, attachments, auth, search)
    storage/                 MinIO client (upload, presigned URLs, delete)
    parser/                  Document parsing via os/exec (mammoth, pdftotext)
    model/                   Go structs matching DB schema
    db/                      sqlc-generated query code
  migrations/                SQL migration files (schema + FTS trigger + indexes)
  sqlc.yaml                  sqlc config
  queries/                   SQL query files for sqlc

frontend/
  src/                       NOTE: code is under src/, not the repo-root app/
    app/
      (public)/              Public pages — SSR/SSG for SEO
      (admin)/               Admin pages — client-rendered, no SEO
      api/revalidate/        Route handler for on-demand ISR revalidation
      not-found/error/loading.tsx  Branded public error/empty/loading states
      layout.tsx             Root layout — next/font (Lora, Be Vietnam Pro, IBM Plex Mono)
      sitemap.ts / robots.ts
    components/              React components (article-card, status-badge, navbar, …)
    lib/
      api.ts                 Fetch wrapper (serverFetch/publicFetch/clientFetch) + ApiError
      auction.ts             Auction status + VND/location formatters
    middleware.ts            Protect /admin/* routes via JWT cookie
  next.config.mjs            /api/* rewrites to the Go API

deploy/hypercore/            PRODUCTION: docker-compose.yml, Caddy, backup.sh, README
deploy/shared/               Shared Caddy config
k8s/                         DEAD reference only — not the deployment target
```

---

## Tech Stack (Do Not Change Without Updating MEMORY.md)

- **Frontend**: Next.js 14 (App Router), TypeScript strict — SSR/SSG for SEO
- **Frontend UI**: Tailwind CSS + shadcn/ui + `@tailwindcss/typography`
- **Frontend Hosting**: Vercel (free tier, auto-deploy, edge network)
- **Analytics**: Vercel Analytics (free) + Go backend `view_events`
- **Backend**: Go 1.22+, Chi router
- **Database**: PostgreSQL 16 — native FTS (tsvector + GIN index + trigger, `'simple'` dictionary)
- **DB Access**: pgx (driver) + sqlc (type-safe Go from SQL) + golang-migrate
- **Auth**: golang-jwt + bcrypt — JWT in httpOnly cookie, Chi middleware
- **Storage**: MinIO (minio-go SDK, S3-compatible, self-hosted)
- **Parsing**: mammoth CLI (DOCX→HTML) + pdftotext/poppler-utils (PDF→text) via `os/exec`
- **Images**: bimg/libvips → 800×450 webp thumbnails
- **Backend Infra**: Kubernetes (k3s on Oracle Cloud Free Tier)
- **Ingress**: nginx-ingress + cert-manager (Let's Encrypt)

---

## Design System (Do Not Change Without Updating MEMORY.md)

Redesigned 2026-07 → "official gazette / land registry" direction (auction-facts-first).
Tokens live in `frontend/tailwind.config.ts`; fonts are self-hosted via `next/font`.

**Fonts** (Vietnamese support required — all self-hosted, no Google Fonts @import):
- Serif (display titles + legal document body): `Lora` — `font-heading` / `font-document`
- Sans (UI, labels, cards): `Be Vietnam Pro` — `font-body` / `font-sans`
- Mono (auction data — dates, prices, notice numbers): `IBM Plex Mono` — `font-mono` / `.data`
- Do NOT use Playfair Display, Cinzel, Josefin Sans, or Times New Roman.

**Colors** (Tailwind token names → hex):
- `pine` `#1B4332` — primary brand green (buttons, links, accents); `pine-deep` `#122F23` hero/footer
- `brass` `#9A6B1E` — accent (wordmark, active, emphasis); `brass-ink` `#7E5514` for small text on light
- `ink` `#16211C` text · `paper` `#F4F6F1` background · `line` `#DEE3D8` borders · `ink-soft`/`ink-faint` muted
- Auction status semantics (separate from accent): `status-open` (green) / `status-soon` (amber) / `status-ended` (gray)
- Legacy names (`charcoal`/`gold`/`warm-white`/`muted-fg`) are kept as REMAPPED aliases → the new palette.

**Signature elements**: auction "docket" fact strip on cards + detail (location · time · starting price · deposit),
computed live status badge (Sắp/Đang/Đã diễn ra), pine-on-paper with a disciplined brass accent.

---

## Critical Patterns

**Document upload flow**: multipart/form-data → Go validates MIME → temp file → mammoth CLI / pdftotext via `os/exec` → bluemonday sanitize → strip to `contentPlain` → auto-generate description (first 200 chars) → minio-go `raw/` → bimg thumbnail → minio-go `thumbs/` → sqlc INSERT article → DB trigger updates `search_vector` → status DRAFT

**Article images**: Admin uploads images separately on edit page → bimg → webp → MinIO `images/{articleId}/` → `article_images` table → displayed as gallery on article detail page.

**Article attachments**: Admin uploads supplementary files on edit page → MinIO `attachments/{articleId}/` → `article_attachments` table → displayed as download list ("Tài Liệu Đính Kèm") on article detail page.

**FTS**: PostgreSQL native — `search_vector tsvector` column with GIN index, auto-updated by trigger. Uses **`'simple'` dictionary** (Vietnamese has no PostgreSQL dictionary). Weights: A=title, B=description, C=contentPlain, D=authorName. Query via sqlc raw query with `ts_rank`.

**Location metadata**: Articles have structured `province`/`district`/`ward` fields extracted from titles. Enables location-based filtering. Older notices reference tỉnh Vĩnh Phúc (preserved as historical record); new notices use tỉnh Phú Thọ following the 2025 merger.

**IDs**: All tables use `cuid()` generated in Go — URL-safe, no enumeration. Old Supabase `bigint` IDs preserved in `legacyId` field.

**View tracking (two layers)**:
1. **Vercel Analytics**: Zero-config page views, Web Vitals, referrers, countries — enabled via `@vercel/analytics`
2. **Backend `view_events`**: `<ViewTracker>` client component fires `POST /api/articles/:id/view` after mount — per-article tracking, powers admin analytics dashboard

**File access**: Thumbnails proxied by Go API `GET /api/thumbs/:id`. Article images served via `GET /api/images/:id` proxy route (cache-control: public, max-age=31536000). Attachments served via presigned URLs (30 min TTL). Raw files served only via presigned MinIO URLs (5 min TTL) to authenticated admins. No direct MinIO access publicly.

**Download button**: Every article detail page must show a download button at the bottom (after tags) — "Tải Xuống PDF" — charcoal bg, hover gold, with file metadata.

**Auth protection**: Chi middleware on `/api/admin/*` routes validates JWT from httpOnly cookie. Next.js `middleware.ts` checks JWT cookie for `/admin/*` pages, redirects to `/login` if invalid. Single admin account, no self-registration.

**SEO**: Public pages use `generateMetadata()` for `<title>`, `<meta description>`, Open Graph tags. Article detail pages include JSON-LD `Article` structured data. Dynamic `sitemap.xml` lists all published articles. `robots.txt` disallows `/admin/*`.

---

## Health Check

`GET /api/health` must return 200. Used by K8s readiness/liveness probes.
