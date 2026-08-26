#!/usr/bin/env bash
# Daily Postgres dump → uploaded to the Cloudflare R2 backup bucket.
# Schedule via cron (VM runs UTC; 23:00 UTC = 06:00 ICT):
#   0 23 * * * /home/daugia/daugia/deploy/hypercore/backup.sh >> /home/daugia/backup.log 2>&1

set -euo pipefail

cd "$(dirname "$0")"

# Load env so we get OBJECT_STORAGE_* + POSTGRES_*
set -a
. ./.env
set +a

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
