#!/usr/bin/env bash
# Daily Postgres dump → uploaded to the Cloudflare R2 backup bucket.
# Schedule via cron (VM runs UTC; 23:00 UTC = 06:00 ICT):
#   0 23 * * * /home/daugia/daugia/deploy/hypercore/backup.sh >> /home/daugia/backup.log 2>&1

set -euo pipefail

cd "$(dirname "$0")"

# Read only the variables this script needs; never export the whole .env
# (JWT_SECRET, admin password) into the environment of aws/docker/curl.
envval() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | tr -d '"'; }
POSTGRES_USER=$(envval POSTGRES_USER)
POSTGRES_DB=$(envval POSTGRES_DB)
OBJECT_STORAGE_ENDPOINT=$(envval OBJECT_STORAGE_ENDPOINT)
OBJECT_STORAGE_BUCKET=$(envval OBJECT_STORAGE_BUCKET)
HEARTBEAT_URL=$(envval HEARTBEAT_URL || true)
: "${POSTGRES_USER:?missing in .env}" "${POSTGRES_DB:?missing in .env}"
: "${OBJECT_STORAGE_ENDPOINT:?missing in .env}" "${OBJECT_STORAGE_BUCKET:?missing in .env}"

# Optional dead-man's-switch: set HEARTBEAT_URL (e.g. a healthchecks.io ping URL)
# in .env. We hit /start now and the base URL on success; if a run silently stops
# producing dumps, the monitor alerts instead of the failure going unnoticed.
ping() { [ -n "${HEARTBEAT_URL:-}" ] && curl -fsS -m 10 "${HEARTBEAT_URL}${1:-}" >/dev/null 2>&1 || true; }
trap 'ping /fail' ERR
ping /start

TS=$(date -u +%Y%m%d-%H%M%S)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

DUMP="$TMP/db-$TS.sql.gz"

# Dump roles/globals first (so the daugia role can be recreated on a bare restore),
# then the database itself, into one gzipped file.
{
  docker compose exec -T postgres pg_dumpall -U "$POSTGRES_USER" --globals-only
  docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"
} | gzip -9 > "$DUMP"

# Refuse to upload a dump that is corrupt or implausibly small (an empty DB
# dump is still several KB of schema).
gzip -t "$DUMP"
if [ "$(stat -c %s "$DUMP" 2>/dev/null || stat -f %z "$DUMP")" -lt 4096 ]; then
  echo "dump suspiciously small, aborting" >&2
  exit 1
fi

# Prune view_events older than 90 days so the append-only table can't grow
# unbounded on the shared 40 GB disk. Best-effort; never fails the backup.
docker compose exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "DELETE FROM view_events WHERE viewed_at < now() - interval '90 days';" \
  >/dev/null 2>&1 || true

# Requires `aws` CLI configured against Cloudflare R2.
# Set up once with:
#   aws configure --profile r2
#   (use OBJECT_STORAGE_ACCESS_KEY / SECRET_KEY; leave region blank)
aws --profile r2 \
    --endpoint-url "https://$OBJECT_STORAGE_ENDPOINT" \
    s3 cp "$DUMP" "s3://${OBJECT_STORAGE_BUCKET}-backups/postgres/"

# Retain 30 days of dumps in the backup bucket.
CUTOFF=$(date -u -d '30 days ago' +%Y%m%d 2>/dev/null \
       || date -u -v-30d +%Y%m%d)
aws --profile r2 \
    --endpoint-url "https://$OBJECT_STORAGE_ENDPOINT" \
    s3 ls "s3://${OBJECT_STORAGE_BUCKET}-backups/postgres/" \
  | awk -v cutoff="$CUTOFF" '$4 ~ /^db-/ {
      gsub("db-", "", $4); split($4, a, "-");
      if (a[1] < cutoff) print $4
    }' \
  | while read -r old; do
      aws --profile r2 \
        --endpoint-url "https://$OBJECT_STORAGE_ENDPOINT" \
        s3 rm "s3://${OBJECT_STORAGE_BUCKET}-backups/postgres/db-$old"
    done

ping   # success — ping the base heartbeat URL
echo "$(date -u) ok ${DUMP##*/}"
