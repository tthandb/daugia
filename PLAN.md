# Real Estate Auction Research Portal — System Design

## Context

**CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN** (Tax ID: 2500634576, est. 2019-09-04) — A joint-venture real estate auction company needs a public-facing research portal where admins upload market research articles (DOCX/PDF/DOC). Documents are parsed into styled editorial article pages for investors, buyers, and industry professionals. UI/UX references: realtor.com/research (clean, data-driven editorial) and savills.com (premium, sophisticated luxury). Fully self-hosted on Kubernetes.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + TypeScript | SSR/SSG for SEO, ISR for article pages, fast builds |
| Frontend UI | Tailwind CSS + shadcn/ui + `@tailwindcss/typography` | Polished components, `prose` handles article typography |
| Frontend Validation | Zod | Form + API response validation |
| Frontend Hosting | **Vercel** (free tier) | Auto-deploy from Git, edge network, built-in analytics |
| Analytics | Vercel Analytics (free) + Go backend `view_events` | Page views + article-level tracking |
| **Backend** | Go 1.22+ | High performance, single binary, low memory footprint |
| HTTP Router | Chi | Lightweight, stdlib-compatible, middleware composable |
| Database | PostgreSQL 16 | Native `tsvector` FTS with GIN indexes — no Elasticsearch needed |
| DB Access | pgx + sqlc | pgx = fast PostgreSQL driver; sqlc = type-safe Go from SQL |
| DB Migrations | golang-migrate | SQL-based migrations, embeddable, CLI + library |
| Auth | golang-jwt + bcrypt | JWT access tokens, bcrypt password hashing, Chi middleware |
| File Storage | MinIO (minio-go SDK) | S3-compatible, self-hosted |
| Doc Parsing | mammoth CLI + pdftotext (poppler-utils) | Called via `os/exec` from Go — best-in-class parsers |
| Image Processing | bimg (libvips) | Thumbnail resize → 800×450 webp; faster than Sharp |
| Backend Infra | **Kubernetes (k3s on Oracle Cloud Free Tier)** | Free forever, real K8s practice |
| Ingress | nginx-ingress + cert-manager | SSL termination, API routing |

---

## UI/UX Design System

### Language
**Vietnamese** — all UI text, labels, navigation, article content, and admin interface are in Vietnamese.

### Aesthetic Direction
Blend of **realtor.com/research** (clean, data-rich, editorial) and **savills.com** (premium, understated luxury). Target: institutional investors, auction participants, real estate professionals.

Style: **Editorial Minimalism** — Swiss grid, high whitespace, bold typographic hierarchy, restrained gold accent on dark charcoal base.

### Color Palette — Luxury/Premium Brand
```
--color-primary:      #1C1917   /* deep charcoal — primary actions, headings */
--color-secondary:    #44403C   /* warm dark — secondary text, borders */
--color-accent:       #A16207   /* gold — CTAs, highlights, category badges */
--color-bg:           #FAFAF9   /* warm white — page background */
--color-fg:           #0C0A09   /* near black — body text */
--color-card:         #FFFFFF   /* pure white — article cards */
--color-muted:        #E8ECF0   /* light gray — muted backgrounds */
--color-muted-fg:     #64748B   /* medium gray — secondary text, metadata */
--color-border:       #D6D3D1   /* subtle warm gray — dividers */
--color-destructive:  #DC2626   /* red — errors, destructive actions */
```

### Typography — Playfair Display + Be Vietnam Pro
Chosen for full Vietnamese diacritics support and reading comfort.

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,900;1,400&family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

/* Headings: Playfair Display — elegant editorial serif, full Vietnamese support */
--font-heading: 'Playfair Display', serif;

/* Body: Be Vietnam Pro — purpose-built for Vietnamese, high readability */
--font-body: 'Be Vietnam Pro', sans-serif;

/* Type scale */
--text-xs:   0.75rem;   /* 12px — labels, tags */
--text-sm:   0.875rem;  /* 14px — metadata, captions */
--text-base: 1rem;      /* 16px — body */
--text-lg:   1.125rem;  /* 18px — lead text */
--text-xl:   1.25rem;   /* 20px — card titles */
--text-2xl:  1.5rem;    /* 24px — section headings */
--text-3xl:  1.875rem;  /* 30px — page headings */
--text-4xl:  2.25rem;   /* 36px — hero headings */
--text-5xl:  3rem;      /* 48px — display */
```

### Key UI Components

**Navigation (top bar)**
- Logo left: wordmark in Playfair Display, charcoal
- Center: nav links (Research, Markets, Auctions, About) — Be Vietnam Pro 500, letter-spacing wide
- Right: Search icon + "Admin" link (hidden unless authenticated)
- Sticky, white background, 1px bottom border (`#D6D3D1`)
- Mobile: hamburger → full-screen overlay menu

**Hero Section (homepage)**
- Full-width editorial banner: large Playfair Display headline, subtext, gold CTA button
- Background: charcoal (`#1C1917`) with subtle texture or featured article image overlay at 0.4 opacity
- Featured article callout below hero: horizontal card, image left, content right

**Article Card**
```
┌─────────────────────────────────────┐
│  [Thumbnail 16:9]                   │
│                                     │
│  [CATEGORY TAG — gold badge]        │
│  Title in Playfair Display 600, 20px│
│  Excerpt in Be Vietnam Pro 400, 14px│
│  muted-fg, 2-line clamp             │
│                                     │
│  Author · Date · Reading time       │
│  [view count icon]                  │
└─────────────────────────────────────┘
```
- Card: white bg, 1px border (#D6D3D1), 8px radius, hover: shadow-md + 2px translateY
- Grid: 3 cols desktop / 2 cols tablet / 1 col mobile

**Article Detail Page**
- Max-width 720px centered content column
- Playfair Display for h1 (40px), h2 (28px); Be Vietnam Pro for body (17px, line-height 1.75)
- Gold left-border on pull-quotes (`border-l-4 border-[#A16207]`)
- Sidebar (desktop): table of contents + related articles + category nav
- Author block at bottom: name, date, category tags
- **Image gallery** (below article content): responsive grid (2 cols desktop / 1 col mobile), lightbox on click, alt text captions. Only shown if article has images.
- **Attachments section** (below gallery, above download button): card list of attached files — file type icon (by MIME), filename, size, download link. Label: "Tài Liệu Đính Kèm"
- **Download button**: original document download — "Tải Xuống" with file format label

**Search**
- Top nav icon → expands search overlay (full-width, dark overlay)
- Input: underline-only style (no box), large Be Vietnam Pro placeholder
- Results: live dropdown with article title + category

**Category Filter Bar** (on `/articles` listing)
- Horizontal scrollable pill tabs reflecting actual content: Tất Cả | Đấu Giá QSD Đất | Tài Sản Thi Hành Án | Tài Sản Thanh Lý | Đấu Giá Phương Tiện | Khác
- Active: gold bg + white text; Inactive: border + charcoal text
- Filter + sort dropdowns right-aligned

**Admin Dashboard**
- Sidebar layout: dark charcoal sidebar, white content area
- Stats row: Total Articles / Published / Drafts / Total Views (shadcn Card components)
- Article management: data table with status badges (DRAFT=gray, PUBLISHED=green, ARCHIVED=muted)
- Upload form: drag-drop zone (dashed border, gold accent on hover), metadata fields below

**Admin Article Edit Page** (tabbed layout)
- **Nội Dung** tab: metadata fields (title, description, category, tags, author) + content preview
- **Hình Ảnh** tab: drag-drop multi-image upload, sortable grid, alt text editing, delete
- **Tài Liệu Đính Kèm** tab: file upload zone, sortable list, rename display name, delete
- **Xuất Bản** tab: status toggle (Draft/Published/Archived), publish date

### Design Anti-Patterns to Avoid
- No cheap drop shadows or heavy gradients
- No emoji as icons (use Lucide icons throughout)
- No blue links (keep charcoal/gold palette consistent)
- No fast animations (morphing: 400–600ms smooth ease-out)
- No dense layouts — generous whitespace is part of the luxury signal

---

## Architecture

```
                    ┌─────────────────────────┐
                    │   Vercel (free tier)      │
  Users ──HTTPS──▶  │   Next.js SSR/SSG         │
                    │   daugia.vercel.app        │
                    └────────┬────────────────┘
                             │ API_URL (server-side fetch)
                             ▼
                    ┌─────────────────────────┐
  api.yourdomain ──▶│  nginx-ingress (K8s)     │
                    │  cert-manager (TLS)      │
                    └────────┬────────────────┘
                             │
                    ┌────────┴────────┐
                    │  Go API Pod     │
                    │  (Deployment)   │
                    └────┬───────┬───┘
                         │       │
                   ┌─────┴──┐ ┌──┴─────┐
                   │PostgreSQL│ │ MinIO  │
                   │(StflSet) │ │(StflSet)│
                   │PVC:20Gi │ │PVC:50Gi│
                   └─────────┘ └────────┘
```

**Two-service split**:
- **Frontend**: Next.js on **Vercel** (free, edge network, auto-deploy from Git). Public pages use SSR/SSG for SEO — server components fetch from Go API at build/request time. Admin pages are client-rendered (no SEO needed). `API_URL` env var points to K8s API.
- **Backend**: Go API + PostgreSQL + MinIO on **k3s** (lightweight K8s) running on **Oracle Cloud Free Tier** (4 ARM cores, 24GB RAM — free forever).

### SEO Strategy
- **Article detail pages** (`/articles/[slug]`): SSG with ISR (revalidate every 60s) — pre-rendered HTML with full meta tags, Open Graph, structured data (JSON-LD `Article` schema)
- **Article listing** (`/articles`): SSR — always fresh, paginated
- **Homepage** (`/`): SSR — featured articles, latest content
- **Search** (`/search`): SSR — results rendered server-side for crawlability
- **Admin pages** (`/admin/*`): Client-rendered — no SEO needed, protected by auth
- **Sitemap**: Auto-generated `sitemap.xml` via Next.js metadata API
- **Robots.txt**: Allow public pages, disallow `/admin/*`

### Analytics (two layers)
1. **Vercel Analytics** (free tier): Page views, Web Vitals, top pages, referrers, countries — zero-config, built into Vercel
2. **Go backend `view_events`**: Article-level tracking — per-article view count, unique visitors (IP hash), user agents, referrers. Powers the admin analytics dashboard.

CORS configured on Go API to allow Vercel origin.

---

## Hosting

### Frontend: Vercel (free tier)
- Connect GitHub repo → auto-deploys on push to `main`
- Framework preset: Next.js (auto-detected)
- Root directory: `frontend`
- Env vars: `API_URL=https://api.yourdomain.com`
- Custom domain: `daugia.yourdomain.com` (or use `daugia.vercel.app`)
- Free tier: 100GB bandwidth/mo, serverless functions, edge network
- Enable Vercel Analytics (free): one click in dashboard, zero code

### Backend: Oracle Cloud Free Tier + k3s
```
# Oracle Cloud Always Free resources:
# - 2x VM.Standard.A1.Flex (ARM Ampere) — 4 cores + 24GB RAM total
# - 200GB block storage
# - 10TB outbound/month

VM 1 (k3s server):  2 cores, 12GB RAM
VM 2 (k3s agent):   2 cores, 12GB RAM

# App resource usage:
# Go API:     ~50MB RAM
# PostgreSQL: ~256MB RAM
# MinIO:      ~256MB RAM
# System:     ~1GB
# Total:      <2GB out of 24GB — plenty of headroom
```

### k3s Setup (one-time)
```bash
# VM 1 — k3s server
curl -sfL https://get.k3s.io | sh -
cat /var/lib/rancher/k3s/server/node-token  # save this

# VM 2 — k3s agent
curl -sfL https://get.k3s.io | K3S_URL=https://vm1-ip:6443 K3S_TOKEN=<token> sh -

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.yaml
```

---

## Kubernetes Manifests

```
k8s/
├── namespace.yaml
├── configmap.yaml             ← non-secret env vars (DB host, MinIO endpoint, CORS origin)
├── secrets.yaml               ← DB password, MinIO keys, JWT secret
├── postgres/
│   ├── statefulset.yaml       ← postgres:16-alpine, 1 replica
│   ├── service.yaml           ← ClusterIP :5432
│   └── pvc.yaml               ← 20Gi ReadWriteOnce
├── minio/
│   ├── statefulset.yaml       ← minio/minio, 1 replica
│   ├── service.yaml           ← ClusterIP :9000, :9001
│   └── pvc.yaml               ← 50Gi ReadWriteOnce
├── api/
│   ├── deployment.yaml        ← Go API, 1 replica (scale up as needed)
│   └── service.yaml           ← ClusterIP :8080
└── ingress/
    ├── ingress.yaml           ← api.yourdomain.com → api service
    └── clusterissuer.yaml     ← Let's Encrypt production issuer
```

### Key Manifests

**Go API Deployment**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: realestate
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
  template:
    spec:
      initContainers:
        - name: migrate
          image: your-registry/realestate-api:latest
          command: ["/app/api", "migrate"]
          envFrom:
            - configMapRef: { name: realestate-config }
            - secretRef: { name: realestate-secrets }
      containers:
        - name: api
          image: your-registry/realestate-api:latest
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef: { name: realestate-config }
            - secretRef: { name: realestate-secrets }
          readinessProbe:
            httpGet: { path: /api/health, port: 8080 }
            initialDelaySeconds: 3
            periodSeconds: 5
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits:   { cpu: 500m, memory: 512Mi }
```

**Ingress (API only — frontend is on Vercel)**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: realestate
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://daugia.vercel.app"
    nginx.ingress.kubernetes.io/enable-cors: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts: [api.yourdomain.com]
      secretName: api-tls
  rules:
    - host: api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service: { name: api, port: { number: 8080 } }
```

---

## Database Schema (SQL migrations + sqlc)

All IDs use `cuid()` generated in Go (URL-safe, no enumeration attacks). Old Supabase used sequential `bigint`. Schema defined in raw SQL migrations (`migrations/*.sql`), sqlc generates type-safe Go query code.

### `articles` — core content, fully searchable
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| title | String | Normalized Vietnamese title case |
| slug | String (unique) | Clean, no timestamps |
| description | String | Auto-generated from content if empty (first 200 chars) |
| authorName | String | Default: "Nguyễn Văn Dương" |
| contentHtml | String | Parsed from DOCX/PDF — old system had NONE |
| contentPlain | String | Stripped text for FTS + auto-description |
| status | Enum (DRAFT/PUBLISHED/ARCHIVED) | Old system had no workflow |
| publishedAt | DateTime? | |
| province | String? | e.g. "Vĩnh Phúc" — old system buried in title |
| district | String? | e.g. "Vĩnh Tường", "Lập Thạch" |
| ward | String? | e.g. "xã Vĩnh Sơn" |
| assetType | String? | "Quyền sử dụng đất", "Tài sản thi hành án" |
| plotCount | Int? | e.g. 23 (extracted from "23 thửa đất") |
| totalArea | String? | e.g. "3.721m²" (mixed units, kept as string) |
| thumbnailKey | String? | MinIO: `thumbs/{id}.webp` |
| originalFileKey | String? | MinIO: `raw/{id}.{ext}` |
| originalFileName | String? | Display name for download |
| originalFileMime | String? | MIME type |
| legacyId | Int? (unique) | Old Supabase `documents.id` |
| legacyFileKey | String? | Old `daugia/document/` path |
| viewCount | Int | Denormalized counter for fast reads |
| categoryId | String? | FK → categories |
| createdAt, updatedAt | DateTime | Auto-managed |

### `article_images` — gallery images per article
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | |
| articleId | String | FK → articles (cascade delete) |
| fileKey | String | MinIO: `images/{articleId}/{uuid}.webp` |
| fileName, altText | String | |
| width, height, sizeBytes | Int | |
| sortOrder | Int | Drag-reorderable |

### `article_attachments` — supplementary files
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | |
| articleId | String | FK → articles (cascade delete) |
| fileKey | String | MinIO: `attachments/{articleId}/{uuid}.{ext}` |
| fileName, fileMime | String | |
| sizeBytes, sortOrder | Int | |

### `categories` — 5 groups from actual data analysis
| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | |
| name | String (unique) | |
| slug | String (unique) | |
| color | String | Badge hex color |
| sortOrder | Int | Display order |

Seeded categories (from 38 real records):
```
Đấu Giá QSD Đất         dau-gia-qsd-dat         #A16207  — 17 articles
Tài Sản Thi Hành Án     tai-san-thi-hanh-an      #B45309  — 15 articles
Tài Sản Thanh Lý        tai-san-thanh-ly          #78350F  — 3 articles
Đấu Giá Phương Tiện     dau-gia-phuong-tien      #44403C  — 2 articles
Khác                    khac                      #57534E  — 1 article
```

### `tags` / `article_tags` — flexible cross-cutting labels
- Tag: id, name (unique), slug (unique)
- ArticleTag: composite PK (articleId, tagId), cascade delete both sides
- Auto-generated during migration: location tags (Vĩnh Phúc, Vĩnh Tường, ...), source tags (Agribank, NHNN), asset tags (Xe ô tô, Đất ở)

### `users` — id, email, passwordHash, name, role (ADMIN only)

### `view_events` — id, articleId, viewedAt, ipHash (SHA-256), userAgent, referrer
- Index on `(articleId, viewedAt)` for analytics queries

### FTS Setup (raw SQL migration)
- `search_vector tsvector` column on articles + GIN index
- **`'simple'` dictionary** — Vietnamese has no PostgreSQL dictionary; `simple` tokenizes by whitespace correctly
- Trigger: `setweight` — A=title, B=description, C=contentPlain, D=authorName
- Additional indexes: `status`, `category_id`, `published_at DESC`, `province`
- Query: `ts_rank` via sqlc raw query in Go search handler

---

## Document Processing Pipeline

### Main Document Upload (article content source)
```
Upload (multipart/form-data, max 50MB via nginx annotation)
  → Go: validate MIME + metadata
  → Save temp file
  → DOCX: exec mammoth CLI → HTML output (mammoth installed in Docker image via npm)
    PDF:  exec pdftotext (poppler-utils) → wrap text in <p> tags
  → Go: bluemonday sanitize HTML (whitelist: p, h1–h4, ul, ol, li, strong, em, blockquote)
  → Go: strip HTML → contentPlain (for FTS + auto-description)
  → Auto-generate description: first 200 chars of contentPlain (if not provided)
  → minio-go: upload raw/{articleId}.{ext}
  → bimg: thumbnail → 800×450 webp → minio-go: upload thumbs/{articleId}.webp
  → sqlc: INSERT article (contentHtml, contentPlain, description, ...)
  → DB trigger fires → search_vector updated ('simple' dictionary)
  → Return JSON { id, slug, status: DRAFT }
  → Frontend redirects to /admin/articles/{id}/edit
```

### Image Upload (article gallery)
```
Admin article edit page → "Hình Ảnh" tab → drag-drop / multi-select upload
  → Go: validate MIME (image/jpeg, image/png, image/webp; max 10MB)
  → bimg: optimize → webp (max 1600px wide, preserve aspect ratio)
  → minio-go: upload images/{articleId}/{uuid}.webp
  → sqlc: INSERT article_image
  → Admin can reorder (drag), set alt text, delete
```

### Attachment Upload (supplementary files)
```
Admin article edit page → "Tài Liệu Đính Kèm" tab → file upload zone
  → Go: validate MIME (PDF, XLSX, XLS, CSV, DOC, DOCX, PNG, JPG; max 20MB)
  → minio-go: upload attachments/{articleId}/{uuid}.{ext}
  → sqlc: INSERT article_attachment
  → Admin can reorder, rename display name, delete
```

---

## Key Routes

### Frontend (Next.js App Router)
**Public pages (SSR/SSG — SEO optimized):**
- `/` — homepage: hero, featured articles, category filter strip, latest grid — **SSR**
- `/articles` — paginated listing with category/tag filter sidebar — **SSR**
- `/articles/[slug]` — article detail: Playfair Display headings, Be Vietnam Pro body, ToC sidebar — **SSG + ISR** (revalidate 60s)
- `/search?q=` — FTS results — **SSR**
- `/categories/[slug]`, `/tags/[slug]` — filtered listings — **SSR**
- `/sitemap.xml` — auto-generated from published articles
- `/robots.txt` — allow public, disallow `/admin/*`

Each public page includes: `<title>`, `<meta description>`, Open Graph tags, JSON-LD structured data (`Article` schema for detail pages).

**Admin pages (client-rendered — no SEO needed):**
- `/admin` — dashboard: stats cards, recent articles table
- `/admin/articles` — management table (all statuses)
- `/admin/articles/new` — upload + metadata form
- `/admin/articles/[id]/edit` — edit, re-upload, images, attachments, publish/archive
- `/admin/categories`, `/admin/tags` — CRUD
- `/admin/analytics` — view count charts (Recharts) + Vercel Analytics embed
- `/login` — admin sign-in page

Admin routes protected by Next.js middleware — checks JWT cookie, redirects to `/login` if invalid.

### Go API (Chi router — all prefixed `/api`)
**Public:**
- `GET  /api/articles` — list (paginated, filterable by category/tag/province)
- `GET  /api/articles/:slug` — detail (includes images, attachments, category, tags)
- `GET  /api/articles/featured` — homepage featured articles
- `GET  /api/search?q=` — FTS
- `GET  /api/categories` — list all
- `GET  /api/tags` — list all
- `GET  /api/images/:id` — proxy image from MinIO (cache-control: public, max-age=31536000)
- `GET  /api/articles/:id/attachments/:attachmentId` — redirect to presigned URL (30 min TTL)
- `POST /api/articles/:id/view` — fire-and-forget view event
- `GET  /api/health` — readiness probe

**Auth:**
- `POST /api/auth/login` — email + password → JWT access token (httpOnly cookie)
- `POST /api/auth/logout` — clear cookie
- `GET  /api/auth/me` — current user from JWT

**Admin** (Chi middleware: JWT required, role=ADMIN):
- `POST   /api/admin/articles` — upload + create
- `PATCH  /api/admin/articles/:id` — update metadata
- `DELETE /api/admin/articles/:id` — delete article + cascade files
- `POST   /api/admin/articles/:id/publish` — set PUBLISHED
- `POST   /api/admin/articles/:id/images` — upload gallery images
- `DELETE /api/admin/articles/:id/images/:imageId`
- `PATCH  /api/admin/articles/:id/images/reorder` — update sortOrder
- `POST   /api/admin/articles/:id/attachments` — upload files
- `DELETE /api/admin/articles/:id/attachments/:attachmentId`
- `CRUD   /api/admin/categories`
- `CRUD   /api/admin/tags`
- `GET    /api/admin/stats` — dashboard aggregates

---

## Authentication

- Go: `golang.org/x/crypto/bcrypt` for password hashing
- Go: `golang-jwt/jwt/v5` for JWT access tokens (stored in httpOnly cookie, 24h expiry, `SameSite=Strict`, `Secure=true`)
- Chi middleware on `/api/admin/*` routes: validates JWT, extracts user, rejects if not ADMIN
- Frontend: React context checks `/api/auth/me` on mount, redirects to `/login` if unauthenticated
- Admin seeded via `go run cmd/seed/main.go` with env vars `ADMIN_EMAIL` + `ADMIN_PASSWORD`
- No self-registration

---

## File Storage Policy

### Old bucket (read-only, migrate from)
```
daugia/
├── document/{slug}-{unix-ms}.{docx|pdf}    — 35 DOCX + 3 PDF auction notices
└── image/{slug}-{unix-ms}.jpg              — 5 cover images (matched by filename prefix)
```
Files in the old bucket are preserved during migration — keys are copied into the new structure, original paths stored in `legacyFileKey` field.

### New bucket structure
```
articles/
├── raw/{articleId}.{ext}                    — original document (never public, admin presigned URL 5 min TTL)
├── thumbs/{articleId}.webp                  — cover thumbnail 800×450 (proxied via next/image)
├── images/{articleId}/{uuid}.webp           — gallery images (served via /api/public/images/[id])
└── attachments/{articleId}/{uuid}.{ext}     — supplementary files (presigned URL 30 min TTL)
```

Access rules:
- **raw/**: Admin only — presigned URL (5 min TTL)
- **thumbs/**: Public — proxied via Go API `GET /api/thumbs/:id`
- **images/**: Public — `GET /api/images/:id` proxy route, `cache-control: public, max-age=31536000`
- **attachments/**: Public for published articles — presigned URL (30 min TTL)
- `nginx.ingress.kubernetes.io/proxy-body-size: "50m"` allows large uploads

---

## Data Migration (Old Supabase → New PostgreSQL + MinIO)

### Source: Supabase `public.documents` table + `daugia/` storage bucket

Old Supabase schema (single flat table, 38 rows):
```sql
documents (
  id            bigint,      -- auto-increment, gaps from deletions (10–48)
  created_at    timestamptz, -- 2023-09-12 → 2025-10-08
  title         text,        -- inconsistent casing (UPPER vs Title Case)
  file_name     text,        -- ⚠️ ALWAYS NULL
  description   text,        -- ⚠️ only 3/38 non-empty, mix plain/HTML
  slug          text,        -- some have timestamps, some don't
  img_url       text,        -- only 5/38, absolute Supabase URLs
  document_url  text         -- absolute Supabase storage URLs
)
```

Storage bucket `daugia/`:
```
daugia/document/{slug}-{unix-ms}.{docx|pdf|jpg}   — 38 files (35 DOCX + 3 PDF)
daugia/image/{slug}-{unix-ms}.jpg                  — 5 cover images
```

### Migration Script: `cmd/migrate-legacy/main.go`
```
Env: LEGACY_SUPABASE_URL + LEGACY_SUPABASE_ANON_KEY

1. Fetch all 38 rows from Supabase documents table (via REST API)
2. For each document:
   a. Download file from document_url
   b. Parse content:
      DOCX → mammoth CLI (os/exec) → contentHtml
      PDF  → pdftotext (os/exec) → wrap in <p> tags → contentHtml
      JPG  (id=18 "Bản đồ") → skip parse, create as article_image attachment
   c. bluemonday sanitize HTML → strip tags → contentPlain
   d. Auto-generate description: first 200 chars of contentPlain
      (override with old description if it had meaningful content — 3 records)
   e. Use title directly from old DB (already human-written)
   f. Clean slug: strip trailing timestamp via regex
      "thong-bao-dau-gia-qsd-23-thua-dat-...-1695343112406"
      → "thong-bao-dau-gia-qsd-23-thua-dat-..."
   g. Extract structured metadata from title:
      - province/district/ward via keyword map (Vĩnh Phúc, Vĩnh Tường, etc.)
      - plotCount via regex: /(\d+)\s*thửa đất/
      - totalArea via regex: /(\d[\d.,]*)\s*m[²2]/
   h. Detect category from title/slug keywords:
      "qsd" | "quyen-su-dung" | "thua-dat"   → Đấu Giá QSD Đất
      "tha" | "thi-hanh-an" | "cctha"         → Tài Sản Thi Hành Án
      "thanh-ly"                               → Tài Sản Thanh Lý
      "xe" | "ô tô" | "may-phat-dien"         → Đấu Giá Phương Tiện
      else                                     → Khác
   i. Auto-generate tags from location + source keywords
   j. Upload raw file to MinIO: articles/raw/{newId}.{ext}
   k. If img_url exists → download → bimg → 800×450 webp → articles/thumbs/{newId}.webp
   l. sqlc INSERT article (
        title, slug, contentHtml, contentPlain, description,
        province, district, ward, assetType, plotCount, totalArea,
        categoryId, legacyId: old id,
        legacyFileKey: relative path from document_url,
        originalFileKey, originalFileName, originalFileMime,
        thumbnailKey, status: PUBLISHED,
        publishedAt: old created_at,
        authorName: "Nguyễn Văn Dương"
      )
   m. DB trigger fires → search_vector updated with 'simple' dictionary

Expected: 38 articles PUBLISHED, searchable, categorized, with parsed HTML
```

### After migration
- 38 articles published, searchable, with correct categories and location metadata
- 5 articles have thumbnails; remaining 33 show default placeholder
- Location filter works for province/district
- FTS returns results for Vietnamese queries
- Old Supabase data preserved (read-only reference via `legacyId` + `legacyFileKey`)
- Admin can add thumbnails, gallery images, and attachments from edit page

---

## Build & Deploy Order

### Backend (Go)
1. SQL migrations — schema + FTS trigger + GIN index + additional indexes
2. `sqlc generate` — type-safe Go code from SQL queries
3. `internal/auth/` — JWT + bcrypt + Chi middleware
4. `internal/storage/` — MinIO client (upload, presigned URLs, delete)
5. `internal/parser/` — document parsing via `os/exec` (mammoth CLI, pdftotext)
6. `internal/handler/` — Chi route handlers (articles, images, attachments, auth, search)
7. `cmd/api/main.go` — server entrypoint
8. `cmd/seed/main.go` — seed admin user + categories
9. `cmd/migrate-legacy/main.go` — import 38 old articles from Supabase

### Frontend (Next.js)
1. Project scaffold: `npx create-next-app@latest frontend --typescript --tailwind --app --src-dir`
2. Install shadcn/ui + Zod + `@vercel/analytics`
3. API client layer (`src/lib/api.ts`) — server-side fetch for SSR, client fetch for mutations
4. Public pages with SSR/SSG + SEO metadata (title, OG, JSON-LD)
5. Admin pages (client components — dashboard, CRUD, upload, edit tabs)
6. Auth: Next.js middleware checks JWT cookie for `/admin/*`, login page
7. `sitemap.ts` + `robots.ts` — dynamic sitemap from published articles

### Docker Image
**API**: Multi-stage — `golang:1.22-alpine` builder → `alpine:3.19` runner + `nodejs` + `mammoth` + `poppler-utils`
Push to Docker Hub (free) or GitHub Container Registry.

### Frontend Deploy
Vercel auto-deploys from Git on push. No Docker needed — Vercel builds Next.js natively.

### K8s Deploy
```bash
# Build & push API image
docker build -t yourdockerhub/daugia-api:latest backend/
docker push yourdockerhub/daugia-api:latest

# Apply K8s manifests
kubectl apply -f k8s/

# First-time setup
kubectl exec deploy/api -n realestate -- /app/api seed
kubectl exec deploy/api -n realestate -- /app/api migrate-legacy
```

---

## Verification

1. `kubectl get pods -n realestate` — all pods Running
2. `kubectl exec deploy/api -n realestate -- /app/api seed` — admin + 5 categories
3. `kubectl exec deploy/api -n realestate -- /app/api migrate-legacy` — 38 articles imported
4. `curl https://api.yourdomain.com/api/health` → 200 OK
5. Open `https://daugia.vercel.app/login` → sign in → redirects to `/admin`
6. Upload DOCX via `/admin/articles/new` → DRAFT created, redirect to edit page
7. Publish → `/articles/:slug` renders with Playfair Display headings + Be Vietnam Pro body
8. Search at `/search?q=Vĩnh Tường` → relevant articles returned
9. Visit article → `view_events` row written; viewCount increments
10. `kubectl port-forward svc/minio 9001 -n realestate` → files in `articles/raw/`, `articles/thumbs/`

---

## Backup Strategy

### PostgreSQL
- K8s CronJob runs `pg_dump` daily → gzip → upload to MinIO `backups/pg/` bucket
- Retain last 7 daily backups (lifecycle policy or cleanup script)
- Manifest: `k8s/cronjob-pg-backup.yaml`

### MinIO Files
- `mc mirror` from MinIO to a local volume on the second k3s node (daily CronJob)
- Critical files (raw documents, thumbnails) are the priority — images and attachments can be re-uploaded

### Restore
- PostgreSQL: `pg_restore` from latest backup in MinIO
- MinIO: `mc mirror` back from secondary node

---

## Security Hardening

### Rate Limiting
- nginx-ingress annotation: `nginx.ingress.kubernetes.io/limit-rps: "10"` on API ingress
- `POST /api/articles/:id/view` — additional Go-level rate limit (in-memory, 1 req/IP/article/minute) to prevent view count inflation

### CSRF Protection
- JWT cookie uses `SameSite=Strict` + `Secure=true` — blocks cross-origin cookie sending
- All admin mutations use POST/PATCH/DELETE (never GET for state changes)
- `Origin` header validated against allowed CORS origins in Go middleware

### Secrets Management
- `k8s/secrets.yaml` is **`.gitignored`** — never committed to the repository
- Secrets created manually via `kubectl create secret generic realestate-secrets --from-env-file=.env.production -n realestate`
- Required secrets: `DATABASE_URL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
