# ⚠️ Credential rotation — actions only you can do

The audit found a live secret committed to git and live keys in a plaintext file.
The code-side cleanup is done (secret untracked from HEAD, gitignored). **These
external rotations are still required** — I can't touch external credentials.

## 1. Supabase database password (committed to git history)

`supabase/.temp/pooler-url` contained a live Postgres connection string with a
real password, pushed to GitHub. It's removed from HEAD but **still in history**.

1. Open the Supabase project dashboard → **Project Settings → Database**.
2. **Reset the database password** (or, if the project is unused, delete it).
3. (Recommended) Purge it from git history so clones don't keep it:
   ```bash
   # from a fresh clone; this rewrites history and needs a force-push
   git filter-repo --path supabase/ --invert-paths
   git push --force --all
   git push --force --tags
   ```
   Coordinate with anyone who has a clone — force-push rewrites shared history.
   (I prepared this but did NOT run it — it's destructive and needs your go-ahead.)

## 2. Cloudflare R2 access keys (plaintext in root `.env`)

The repo-root `.env` holds a live R2 Access Key ID + Secret (untracked, but one
`git add -f` from leaking). These guard **both** the document bucket and the
backups.

1. Cloudflare dashboard → **R2 → Manage R2 API Tokens** → **Roll / recreate** the token.
2. Update the new values in your server's `deploy/hypercore/.env`
   (`OBJECT_STORAGE_ACCESS_KEY` / `OBJECT_STORAGE_SECRET_KEY`) and restart the API.
3. (Recommended) Use **two** tokens: read-write for the app bucket, and a
   separate **no-delete / write-only** token for the `*-backups` bucket, so a
   leak of the app token can't wipe your backups.
4. Move the root `.env` out of the repo tree (e.g. a password manager) and delete it.

## 3. Admin seed credentials

The seed no longer falls back to `changeme123` — it now **refuses to run** without
env vars. Before the next `seed`, ensure `deploy/hypercore/.env` has:
```
ADMIN_EMAIL=...
ADMIN_PASSWORD=<strong password>
```

## 4. (Optional) Backup heartbeat

`backup.sh` now supports a dead-man's-switch. Add `HEARTBEAT_URL=<healthchecks.io ping url>`
to `deploy/hypercore/.env` to get alerted if the daily backup silently stops.
