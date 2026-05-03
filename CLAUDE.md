# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Full project memory is in `MEMORY.md`. Read it at the start of every session.

---

## Project Overview

**ĐẤUGIÁ** — Public publisher of auction notices issued by **CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN** (joint-venture real estate auction company operating in Phú Thọ and Vĩnh Phúc).

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
# Backend (Go)
cd backend
go run cmd/api/main.go           # Dev server (port 8080)
go run cmd/seed/main.go          # Seed admin user + categories
go run cmd/migrate-legacy/main.go # Import 38 old articles from Supabase
go build -o bin/api cmd/api/main.go  # Build binary
go test ./...                    # Run all tests
sqlc generate                    # Regenerate type-safe query code after SQL changes

# Database Migrations
migrate -path migrations -database "$DATABASE_URL" up    # Apply migrations
migrate -path migrations -database "$DATABASE_URL" down 1 # Rollback last

# Frontend (Next.js)
cd frontend
bun run dev              # Next.js dev server (port 3000)
bun run build            # Production build
bun run lint             # ESLint
bun run type-check       # tsc --noEmit

# Kubernetes
kubectl apply -f k8s/                                # Deploy all manifests
kubectl rollout status deployment/api -n realestate  # Watch API rollout
kubectl logs -l app=api -n realestate --tail=100     # API logs
kubectl exec deploy/api -n realestate -- /app/api seed            # Seed admin + categories
kubectl exec deploy/api -n realestate -- /app/api migrate-legacy  # Import old Supabase data

# Docker (build & push API image)
docker build -t yourdockerhub/daugia-api:latest backend/
docker push yourdockerhub/daugia-api:latest

# Frontend (auto-deploys via Vercel on git push)
cd frontend && bun run build             # Local preview build
```

---

## Architecture

```
Vercel (edge network)       nginx-ingress (K8s)
    │ Next.js SSR/SSG             │ cert-manager (TLS)
    │                             │
 daugia.vercel.app        api.yourdomain.com
    │                             │
    └──── API_URL ───────────────▶│
    (server-side fetch)           │
                            Go API Pod
                               │
                          ┌────┴────┐
                          │         │
                       pgx       minio-go
                          │         │
                     PostgreSQL   MinIO
                     (K8s Pod)  (K8s Pod)
```

Frontend on Vercel (SSR/SSG for SEO). Backend on k3s (Oracle Cloud Free Tier). Next.js fetches from Go API server-side for SSR pages. CORS configured on Go API. PostgreSQL and MinIO internal only.

### Key Directories

```
backend/
  cmd/
    api/main.go              Go API server entrypoint
    seed/main.go             Seed admin + categories
    migrate-legacy/main.go   Import from old Supabase
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
  app/
    (public)/                Public pages — SSR/SSG for SEO
    (admin)/                 Admin pages — client-rendered, no SEO
    api/                     Next.js route handlers (if needed for BFF)
    layout.tsx               Root layout with fonts, analytics
    sitemap.ts               Dynamic sitemap from published articles
    robots.ts                Robots.txt config
  components/                React components (shadcn/ui based)
  lib/
    api.ts                   Fetch wrapper (server + client)
  middleware.ts              Protect /admin/* routes via JWT cookie
  next.config.ts             API_URL rewrites for dev

k8s/                         Kubernetes manifests (namespace, api, postgres, minio, ingress)
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

**Fonts** (Vietnamese support required):
- Headings: `Playfair Display` (serif)
- Body: `Be Vietnam Pro` (sans-serif)
- Do NOT revert to Cinzel or Josefin Sans — they lack Vietnamese diacritic support

**Colors**:
- Primary/charcoal: `#1C1917`
- Gold accent: `#A16207`
- Background: `#FAFAF9`
- Text: `#0C0A09`

---

## Critical Patterns

**Document upload flow**: multipart/form-data → Go validates MIME → temp file → mammoth CLI / pdftotext via `os/exec` → bluemonday sanitize → strip to `contentPlain` → auto-generate description (first 200 chars) → minio-go `raw/` → bimg thumbnail → minio-go `thumbs/` → sqlc INSERT article → DB trigger updates `search_vector` → status DRAFT

**Article images**: Admin uploads images separately on edit page → bimg → webp → MinIO `images/{articleId}/` → `article_images` table → displayed as gallery on article detail page.

**Article attachments**: Admin uploads supplementary files on edit page → MinIO `attachments/{articleId}/` → `article_attachments` table → displayed as download list ("Tài Liệu Đính Kèm") on article detail page.

**FTS**: PostgreSQL native — `search_vector tsvector` column with GIN index, auto-updated by trigger. Uses **`'simple'` dictionary** (Vietnamese has no PostgreSQL dictionary). Weights: A=title, B=description, C=contentPlain, D=authorName. Query via sqlc raw query with `ts_rank`.

**Location metadata**: Articles have structured `province`/`district`/`ward` fields extracted from titles. Enables location-based filtering. Most articles are in Vĩnh Phúc province.

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
