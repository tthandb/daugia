# Project Memory — ĐẤUGIÁ Auction Notice Portal

> Authoritative record of all design and architecture decisions. Update this file whenever decisions change.

---

## Project Identity

- **Name**: ĐẤUGIÁ (Daugia999)
- **Company**: CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN
- **Tax ID**: 2500634576
- **Established**: 2019-09-04
- **Contact**: 0912535999 | Representative: Nguyễn Văn Dương
- **Type**: Joint-venture real estate auction company — public publisher of its own auction notices
- **Audience**: General public, businesses, and other parties interested in participating in auctions in tỉnh Phú Thọ — Vietnamese-speaking. NOT a research portal for institutional investors. (Note: the former tỉnh Vĩnh Phúc was merged into tỉnh Phú Thọ in 2025; legacy article titles still reference Vĩnh Phúc and stay as historical record.)
- **Language**: **Vietnamese** — all UI, labels, navigation, content
- **UI References (visual aesthetic only — not positioning)**: realtor.com/research (clean, data-driven) + savills.com (premium editorial)
- **Mockup**: `mockup.html` — 4-page interactive HTML mockup (Trang Chủ, Thư Viện, Chi Tiết Bài, Quản Trị)

---

## Tech Stack

| Layer | Choice |
|---|---|
| **Frontend** | Next.js 14 (App Router) + TypeScript |
| Frontend UI | Tailwind CSS + shadcn/ui + @tailwindcss/typography |
| Frontend Validation | Zod |
| Frontend Hosting | **Vercel** (free tier, SSR/SSG, auto-deploy) |
| Analytics | Vercel Analytics (free) + Go backend `view_events` |
| **Backend** | Go 1.22+ |
| HTTP Router | Chi (lightweight, stdlib-compatible) |
| Database | PostgreSQL 16 — native FTS via tsvector/GIN |
| DB Access | pgx + sqlc (type-safe Go from SQL) |
| DB Migrations | golang-migrate |
| Auth | golang-jwt + bcrypt, httpOnly cookie, Chi middleware |
| File Storage | MinIO — minio-go SDK |
| Doc Parsing | mammoth CLI + pdftotext (poppler-utils) via os/exec |
| Image | bimg (libvips) — thumbnail → 800×450 webp |
| Backend Infra | **HyperCore NVMe VPS HYPER-2** (HCM 2, Vietnam) — Docker Compose, single VM |
| Object Storage | **Cloudflare R2** (S3-compatible, 10 GB free, $0 egress) |
| Frontend Hosting | **Vercel** (free, SSR/SSG, edge network) |
| Ingress | Caddy 2 — TLS auto via Let's Encrypt |

---

## UI/UX Design System

### Colors
```
--c-charcoal:   #1C1917   Primary, headings, hero bg, admin sidebar
--c-gold:       #A16207   Accent, CTAs, badges, active states, pull-quotes
--c-gold-light: #CA8A04   Hover gold
--c-gold-pale:  #FEF3C7   Gold tinted backgrounds
--c-warm-white: #FAFAF9   Page background
--c-white:      #FFFFFF   Cards
--c-fg:         #0C0A09   Body text
--c-muted-fg:   #78716C   Secondary text, metadata
--c-border:     #D6D3D1   Dividers, card borders
```

### Typography
- **Headings**: `Playfair Display` — elegant editorial serif, full Vietnamese diacritic support
- **Body**: `Be Vietnam Pro` — purpose-built for Vietnamese, high reading comfort
- Google Fonts import:
  ```
  Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,900;1,400
  Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400
  ```
- **Do NOT use**: Cinzel, Josefin Sans (replaced — no Vietnamese support)

### Layout Style
Editorial Minimalism — Swiss grid, generous whitespace, bold typographic hierarchy, gold accent on charcoal.

### Key Component Patterns
- **Article cards**: 3/2/1 col grid, white bg, gold category badge (pill), 16:9 thumbnail, hover: shadow-md + translateY(-3px), gold bottom bar slides in
- **Article detail**: 3-col layout (ToC | content 720px | related sidebar), gold left-border blockquotes, data callout block (dark charcoal bg + gold numbers)
- **Download button**: At end of every article — charcoal btn with download icon → "Tải Xuống PDF", hover turns gold. Shows file info (format, size, pages)
- **Navigation**: Sticky, white, wordmark left (ĐẤUGIÁ.), centre links wide-spaced, search icon + Quản Trị btn right
- **Hero**: Full-width charcoal, grain texture, gold CTA, ticker tape above (market data)
- **Admin**: Dark charcoal sidebar, white content area, gold accent bars on stat cards

### Categories (from Supabase data analysis — 38 records → 5 groups)
```
Đấu Giá QSD Đất         dau-gia-qsd-dat         #A16207  — 17 (land rights + land plots)
Tài Sản Thi Hành Án     tai-san-thi-hanh-an      #B45309  — 15 (THA/execution assets)
Tài Sản Thanh Lý        tai-san-thanh-ly          #78350F  — 3  (liquidation)
Đấu Giá Phương Tiện     dau-gia-phuong-tien      #44403C  — 2  (vehicles/equipment)
Khác                    khac                      #57534E  — 1  (maps, misc)
```

### Vietnamese UI Labels (reference)
```
Thông Báo  = Auction-notices nav (was "Nghiên Cứu" — renamed 2026-05)
Thị Trường = Markets nav
Đấu Giá    = Auctions nav
Giới Thiệu = About nav
Quản Trị   = Admin
Trang Chủ  = Home (breadcrumb)
Tất Cả     = All (filter)
Đấu Giá QSD Đất     = Land Use Rights Auctions (category)
Tài Sản Thi Hành Án = Execution Assets (category)
Tài Sản Thanh Lý    = Liquidation Assets (category)
Đấu Giá Phương Tiện = Vehicle/Equipment Auctions (category)
Khác                = Other (category)
Đã Xuất Bản = Published
Bản Nháp    = Draft
Lưu Trữ     = Archived
Tải Xuống PDF = Download PDF
Sửa / Xóa / Xuất Bản / Khôi Phục = Edit / Delete / Publish / Restore
Tải Lên Bài Viết = Upload Article
Hình Ảnh    = Images (admin tab)
Tài Liệu Đính Kèm = Attachments (admin tab + article section)
Xuất Bản    = Publish (admin tab)
Tỉnh/Thành  = Province (filter)
Huyện/Quận   = District (filter)
```

---

## Database Schema

All IDs use `cuid()`. Old Supabase used sequential `bigint`.

- **`articles`** — id, title, slug (unique), description, authorName, contentHtml, contentPlain (for FTS), status (DRAFT/PUBLISHED/ARCHIVED), publishedAt, province?, district?, ward?, assetType?, plotCount?, totalArea?, thumbnailKey, originalFileKey, originalFileName, originalFileMime, legacyId? (unique, old Supabase ID), legacyFileKey?, viewCount, categoryId?, createdAt, updatedAt
- **`article_images`** — id, articleId (cascade), fileKey, fileName, altText, width, height, sizeBytes, sortOrder, createdAt
- **`article_attachments`** — id, articleId (cascade), fileKey, fileName, fileMime, sizeBytes, sortOrder, createdAt
- **`categories`** — id, name (unique), slug (unique), color, sortOrder
- **`tags`** / **`article_tags`** — many-to-many, cascade delete both sides
- **`users`** — id, email (unique), passwordHash, name, role (ADMIN)
- **`view_events`** — id, articleId (cascade), viewedAt, ipHash (SHA-256), userAgent?, referrer? — indexed on (articleId, viewedAt)

### FTS
- GIN index + trigger on INSERT/UPDATE using **`'simple'` dictionary** (Vietnamese has no PostgreSQL dictionary)
- Weights: A=title, B=description, C=contentPlain, D=authorName
- Additional indexes: status, category_id, published_at DESC, province

---

## Document Processing Pipeline

```
Upload (multipart/form-data, max 50MB) → Go validates MIME + metadata → temp file
  → DOCX: exec mammoth CLI → HTML
    PDF:  exec pdftotext (poppler-utils) → wrap in <p> tags
  → bluemonday sanitize HTML
  → strip tags → contentPlain (for FTS + auto-description)
  → minio-go: raw/{articleId}.ext (never public)
  → bimg: thumbnail 800×450 webp → minio-go: thumbs/{articleId}.webp
  → sqlc: INSERT article
  → DB trigger → search_vector updated ('simple' dictionary)
  → Status: DRAFT
```

### Article Images & Attachments
- **Images**: Admin uploads on edit page → bimg optimizes to webp (max 1600px) → MinIO `images/{articleId}/{uuid}.webp` → displayed as gallery
- **Attachments**: Admin uploads supplementary files (max 20MB each) → MinIO `attachments/{articleId}/{uuid}.{ext}` → displayed as download list
- MinIO bucket structure: `raw/` | `thumbs/` | `images/` | `attachments/`

---

## Deployment

### Frontend: Vercel (free tier)
- Auto-deploys from Git on push to `main`
- Framework: Next.js (auto-detected), root dir: `frontend`
- Env: `API_URL=https://api.yourdomain.com`
- SSR/SSG for SEO: public pages server-rendered, admin pages client-rendered
- Vercel Analytics enabled (free) for page views, Web Vitals, referrers
- SEO: meta tags, Open Graph, JSON-LD `Article` schema, dynamic sitemap.xml

### Backend: HyperCore NVMe VPS HYPER-2 (Ho Chi Minh 2) — single-VM Docker Compose
- **Decided 2026-04-26**, replacing the original Oracle Cloud Free Tier + k3s plan (Oracle signup blocked).
- Provider: [HyperCore](https://my.hypercore.vn) (built on Onidel Cloud), Vietnamese billing in VND.
- Plan: **NVMe VPS HYPER-2** — 2 vCPU / 4 GB / 40 GB local NVMe / 200 Mbps unlimited.
- Datacenter: Ho Chi Minh 2 (only DC available on the NVMe VPS family).
- Annual prepay: **1,836,000đ (~$73/yr, ~$6.10/mo)** at -15%.
- Stack on the VM (`deploy/hypercore/docker-compose.yml`): **Postgres 16** + **Go API** + **Caddy 2** (TLS auto via Let's Encrypt). No MinIO container.
- **Object storage: Cloudflare R2** (10 GB free, $0 egress, S3-compatible). HyperCore Object Storage was evaluated but is 1 TB minimum and currently has no region selectable on the order page, so it doesn't fit this scale.
- Daily Postgres dump → R2 backup bucket via `deploy/hypercore/backup.sh` (cron 03:00 ICT, 30-day retention).
- HyperCore snapshots enabled (free, daily, 7-day retain) as second backup layer.
- `migrate` (golang-migrate v4.17.1) is bundled into the runtime image (`backend/Dockerfile`) so `docker compose exec api migrate ...` works.
- All-in cost: **~2,150,000đ/yr (~$85/yr, ~$7.10/mo)** including domain.
- Resize path: dashboard → HYPER-3 (4 vCPU / 8 GB / 80 GB, 360K/mo) in ~30s if peak RAM ever exceeds 4 GB.
- Old k3s plan files in `k8s/` are kept for reference but are not the deployment target.
- Domain: **daugiavinhyen.com** (registered at TenTen).
  - `api.daugiavinhyen.com` → A record → HyperCore VPS IP → Caddy (TLS) → Go API → Postgres + R2.
  - `daugiavinhyen.com` (apex) + `www` → Vercel for the public Next.js frontend.
- CORS allows Vercel origin (`https://daugiavinhyen.com`).
- `GET /api/health` — used by UptimeRobot (free tier, 5-min checks).

---

## Public Routes
- `/` — Trang chủ (hero, featured, category strip, article grid)
- `/articles` — Thư viện (filter sidebar, paginated grid)
- `/articles/[slug]` — Chi tiết bài (3-col: ToC | content | sidebar, download button at bottom)
- `/search?q=` — Tìm kiếm (FTS, GET form, SSR)
- `/categories/[slug]`, `/tags/[slug]`

## Admin Routes (Edge middleware protected)
- `/admin` — Tổng quan (stats, recent articles table, upload widget)
- `/admin/articles` — Quản lý bài viết
- `/admin/articles/new` — Tải lên bài viết mới
- `/admin/articles/[id]/edit`
- `/admin/analytics`, `/admin/categories`, `/admin/tags`

---

## Auth
- Go: golang-jwt + bcrypt — JWT access tokens in httpOnly cookie (24h expiry, `SameSite=Strict`, `Secure=true`)
- Chi middleware on `/api/admin/*` routes: validates JWT, extracts user, rejects if not ADMIN
- Next.js middleware protects `/admin/*` pages — checks JWT cookie, redirects to `/login`
- Single admin, seeded via `go run cmd/seed/main.go` (env: `ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- No self-registration

---

## Legacy Data (old Supabase website)

**Database**: Supabase `public.documents` — single flat table, 38 rows, no FTS, no categories
- Env: `LEGACY_SUPABASE_URL` + `LEGACY_SUPABASE_ANON_KEY`
- Problems: `file_name` always NULL, `description` empty on 35/38, no content parsing, absolute URLs, no status workflow, no analytics

**Storage**: Supabase bucket `lxgnfmrwkbrzajkqwkpt/daugia/`
- `daugia/document/` — 35 DOCX + 3 PDF
- `daugia/image/` — 5 JPG cover images
- Naming: `{slug}-{unix-ms}.{ext}`

**Migration**: `cmd/migrate-legacy/main.go` — fetches rows from Supabase REST API, downloads files, parses content (mammoth CLI / pdftotext), extracts location/metadata from titles, auto-categorizes, copies to MinIO, creates articles with `legacyId` + `legacyFileKey`.

---

## Build Order

### Backend (Go)
1. SQL migrations (schema + FTS trigger + indexes)
2. `sqlc generate` — type-safe query code
3. `internal/auth/` — JWT + bcrypt + middleware
4. `internal/storage/` — MinIO client
5. `internal/parser/` — mammoth CLI + pdftotext via os/exec
6. `internal/handler/` — Chi route handlers
7. `cmd/api/main.go` — server entrypoint
8. `cmd/seed/main.go` — admin + categories
9. `cmd/migrate-legacy/main.go` — import from Supabase

### Frontend (Next.js on Vercel)
1. Scaffold + Tailwind + shadcn/ui + `@vercel/analytics`
2. API client layer (server fetch for SSR, client fetch for mutations)
3. Public pages with SSR/SSG + SEO metadata (title, OG, JSON-LD)
4. Admin pages (client components — dashboard, CRUD, upload, edit tabs)
5. Auth: middleware checks JWT for `/admin/*`, login page
6. `sitemap.ts` + `robots.ts`

### Infra
6. `backend/Dockerfile` (Go multi-stage)
7. `k8s/` manifests (namespace → secrets → postgres → minio → api → ingress)
8. Vercel (connect Git repo, auto-detects Next.js, set env vars)
