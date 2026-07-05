# Upgrade Design — Phase 0 (Security & Data Integrity) + Phase 1 (Correctness)

**Date:** 2026-07-05
**Status:** Draft for review
**Source:** Full project audit (4 verification-gated review agents + live walkthrough). Full findings report: artifact `88e5f12c-fb16-491d-a1bf-bd5a2f715583`.

This spec covers the first two phases of the ĐẤUGIÁ upgrade. Phase 2 (UI/UX redesign) and Phase 3 (infra/modernization) get their own specs later.

---

## Goals

- **Phase 0** — Close the four P0 issues (security holes, data-loss, cached-404s) and the committed-secret exposure. No visual change. Small, urgent, independently shippable.
- **Phase 1** — Fix the correctness bugs users and the admin hit today: the "0 views" bug, expiring attachment links, wrong/absent auction date-time, slug collisions, admin session/form fragility, and stale-cache-after-publish.

Non-goals for these phases: any visual redesign, dependency upgrades, CI/backup changes (Phase 3), new features.

---

## Phase 0 — Security & Data Integrity

### 0.1 Committed Supabase credential (P0)

**Problem:** `supabase/.temp/pooler-url` and 7 sibling files are tracked in git and pushed to GitHub; `pooler-url` contains a live Postgres password. `.gitignore` has no `supabase/` rule.

**Split of responsibility:**
- **User (external, cannot be done by the agent):** rotate/revoke the Supabase DB password (or delete the project if unused), and rotate the R2 access keys. Exact steps provided separately.
- **Repo side (this phase):**
  - `git rm -r --cached supabase/` (remove from tracking; the audit found only `.temp` machine files there — confirm nothing hand-authored is lost).
  - Add `supabase/` (and `.temp/`) to `.gitignore`.
  - Move the plaintext root `.env` (live R2 keys, per audit) out of the repo tree to a documented location, or confirm it is only `.gitignore`-protected and note the risk.
  - **History scrub** (`git filter-repo`) is destructive to history and requires a force-push. This is gated: I will prepare it and the exact command, but **not execute the force-push** without explicit approval, because it rewrites every collaborator's history. Removal-from-HEAD lands now; history scrub is a follow-up the user confirms.

**Verification:** `git ls-files supabase/` returns empty; `.gitignore` blocks re-adding; secret value no longer in the working tree.

### 0.2 Stored XSS via unsanitized link schemes (P0)

**Problem:** `backend/internal/parser/parser.go:15-28` allows `href` on `<a>` but never restricts URL schemes, so `javascript:` URIs from an uploaded DOCX survive into `content_html` and render live.

**Fix:** Extend the bluemonday policy:
```go
p.AllowStandardURLs()              // sets RequireParseableURLs + http/https/mailto allowlist
p.RequireNoFollowOnLinks(true)
p.RequireNoReferrerOnLinks(true)
// AllowStandardURLs already forces rel handling; ensure target="_blank" gets rel="noopener"
```

**Verification (TDD):** a Go test in `internal/parser` feeding HTML containing `<a href="javascript:alert(1)">`, `<a href="data:...">`, and a valid `https://` link, asserting the malicious schemes are stripped and the valid link survives. Test written first, watched fail, then the policy change makes it pass.

### 0.3 Silent upload failures cause data loss (P0)

**Problem:** `admin.go:263`, `files.go:204`, `files.go:319` discard `store.Upload` and temp-file errors, then insert the DB row unconditionally — an article can be created/published while its document was never stored.

**Fix:** Propagate every error in the temp-file → open → stat → upload chain. Insert the DB row only after `Upload` returns nil; otherwise return `502` and clean up. Applies to article-create, image-upload, and attachment-upload paths.

**Coupled with 0.4 (transactional ordering):** on create, if the DB insert fails after a successful upload, delete the just-uploaded object so R2 doesn't accumulate orphans.

**Verification:** unit test with a stubbed storage client that returns an error on `Upload`, asserting no DB row is created and a non-2xx is returned. (Requires a small storage interface seam — see Design Notes.)

### 0.4 Cached 404s on API outage (P0)

**Problem:** `articles/[slug]/page.tsx:20-27,170` and `categories/[slug]` catch *all* fetch errors and return `null` → `notFound()`, which ISR caches. A brief API outage de-indexes the catalog.

**Fix:**
- Give `apiFetch` in `lib/api.ts` a typed error carrying the HTTP `status` (or `null` for network failures).
- In `getArticle`/`getCategory`/etc., return `null` **only** when `status === 404`; rethrow everything else so a failed ISR render throws and Next keeps serving the last good cached HTML.
- Apply the same discrimination to the homepage and list fetchers (Phase 1.6 extends this to "empty vs error" UI).

**Verification:** covered by the shared error-handling change; assert via a small test or a manual outage simulation that a 500 from the API does not render as a 404.

### 0.5 Hardcoded admin-password fallback in seed (P1, folded into Phase 0)

**Problem:** `backend/cmd/api/seed.go:17-24` falls back to `admin@daugia.vn / changeme123` (both in the public repo) when `ADMIN_PASSWORD` is unset.

**Fix:** `log.Fatalf` when `ADMIN_EMAIL`/`ADMIN_PASSWORD` are empty; remove the fallback entirely. One-line, no dependency — grouped here because it's a security default, not a user-facing bug.

**Verification:** run the seed subcommand with the env vars unset and confirm it exits non-zero without creating a user.

**Deferred to Phase 3 (with rationale):** login rate limiting (needs a new `httprate` dependency + tuning) and the `RealIP`/IP-hash trusted-proxy fix (needs coordinated Caddy header stripping) are real P1 security items but are hardening changes better batched with the Phase 3 infra work than shipped as hotfixes. Noted so they aren't silently lost.

---

## Phase 1 — Correctness Bugs

### 1.1 View tracking writes on a cancelled context (P1) — the "0 views" bug

**Problem:** `articles.go:347-368` captures `ctx := r.Context()` and uses it inside a fire-and-forget goroutine after the handler returns; the request context is already cancelled, so every insert dies with `context canceled`.

**Fix:** Inside the goroutine use a detached context with a timeout:
```go
bg, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 5*time.Second)
defer cancel()
```
Log failures instead of discarding them.

**Verification:** after the fix, drive a real page view against a local stack and confirm a `view_events` row is inserted and `view_count` increments (per the `verify` skill — exercise the actual flow, not just a unit test).

### 1.2 Expiring presigned attachment URLs in cached pages (P1)

**Problem:** attachment `href`s are 30-min presigned URLs baked into longer-lived ISR HTML → expired-link errors.

**Fix:** Serve attachments through a stable proxy route (mirroring the existing `/api/thumbs/:id` and download proxy), minting the presigned URL server-side at request time. The article page links to the proxy path, not the presigned URL.

**Verification:** load an article page, wait past the TTL window conceptually (or inspect that the rendered href is the stable proxy path, not a signed URL), and confirm the download still resolves.

### 1.3 Auction date-time: dropped hour + UTC rendering (P1)

**Problem:** `formatDate` (utils.ts) emits date-only with no timezone; `auctionStart`/`auctionEnd` lose the hour and can render the wrong day for early-morning ICT times.

**Fix:** Add `formatDateTime(value)` using `Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour/minute/day/month/year })`; also pass `timeZone` to the existing `formatDate`. Use `formatDateTime` for the auction Event block; keep the visible value consistent with the Event JSON-LD.

**Verification:** render an article with a known `auctionStart` (e.g. 08:30 ICT and 01:00 ICT) and confirm the displayed date/time matches ICT, not UTC.

### 1.4 Slug generation drops diacritics & collides (P1)

**Problem:** `admin.go:509-523` strips all Vietnamese diacritics, producing near-identical or empty slugs that hit the UNIQUE constraint → 500 + orphaned upload.

**Fix:** Transliterate before slugifying — NFD normalize, strip combining marks, map `đ/Đ→d`, then keep `[a-z0-9-]`. On UNIQUE violation, retry with a short numeric/`cuid` suffix. Pairs with the 0.3/0.4 orphan cleanup so a failed create never leaves a stranded object.

**Verification:** unit test slugifying two distinct Vietnamese titles that previously collided, asserting distinct non-empty slugs; test the suffix path on a forced collision.

### 1.5 Admin session & form fragility (P1)

Three coupled admin fixes:
- **401 handling:** in `clientFetch`, on `401` redirect to `/login?next=<path>`; middleware carries `next` back after re-auth. Kills the "silent failure after 24h" trap.
- **Upload no longer wipes unsaved edits:** upload success handlers refetch only `images`/`attachments` (or update from the POST response) instead of re-running full form population.
- **Pending states:** publish/unpublish/archive buttons disable + show a spinner while in flight (mirror the existing `deleting` pattern) to prevent double-submit toggling.

**Verification:** manual admin walkthrough on a local stack — expire/clear the token and confirm redirect-to-login-with-return; edit an unsaved field then upload an image and confirm the field survives; slow-network double-click publish and confirm no double-toggle.

### 1.6 On-demand revalidation + honest empty-vs-error states (P1)

**Problem:** mutations never bust the Next cache (publish takes up to 5 min; pre-publish 404s stick), and API failures render as "empty, try another filter".

**Fix:**
- Add a `POST /api/revalidate` route handler (shared secret) calling `revalidatePath` for `/`, `/articles`, the article slug, and affected category paths. Admin publish/unpublish/delete call it after the API mutation succeeds.
- Distinguish fetch-error (return a sentinel / rethrow) from genuinely-empty (`[]`) so the homepage/list can show a "tạm thời không tải được" retry state instead of a misleading empty state. (Depends on the typed-error change from 0.4.)

**Verification:** publish a draft locally and confirm the public list/detail updates without waiting for the ISR window; simulate an API error and confirm the retry state (not an empty grid) renders.

---

## Design Notes / Cross-cutting

- **Storage interface seam:** testing 0.3 cleanly needs `Handler` to depend on a small storage interface rather than the concrete client. If that seam doesn't already exist, introducing it is in-scope for Phase 0 (minimal: an interface with `Upload`/`Delete`/`PresignedDownloadURL`).
- **Typed API error:** 0.4 and 1.6 both depend on `apiFetch`/`clientFetch` surfacing HTTP status. Implement once, reuse.
- **Order of work:** 0.1 (secret) first and standalone. Then backend 0.2/0.3 + 1.1/1.4 (same packages, one test pass). Then frontend 0.4/1.2/1.3/1.5/1.6 (shared api.ts error change underpins several). Each sub-area is independently committable.
- **TDD where there's logic** (parser policy, slugify, upload-failure path, date formatting); **verify-by-driving** where it's integration behavior (view tracking, revalidation, admin flows).
- **No production or deploy changes in these phases.** Migrations, CI, backups, dep bumps are Phase 3.

## Risks

- History scrub (0.1) rewrites shared git history — gated behind explicit approval; HEAD removal is safe and lands now.
- Introducing the storage interface seam touches several handlers; keep it mechanical and covered by existing behavior.
- Revalidation secret must be set as an env var on Vercel; until then the route no-ops safely.

## Out of scope (later phases)

- Phase 2: mobile-first UI/UX redesign (new visual direction, surfacing auction facts on cards/above-fold, branded 404/error/loading, contrast, document typography, thumbnails, province filtering, next/font).
- Phase 3: migrations-in-CI, backup heartbeat/globals/restore drill, log rotation + healthcheck, view_events pruning, dep upgrades (Next 15/React 19, Go/Alpine, x/net), tests + CI gate, doc drift (CLAUDE.md), repo artifact cleanup, API envelope consistency, rate limiting, observability.
