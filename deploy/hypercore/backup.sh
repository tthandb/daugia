#!/usr/bin/env bash
# Daily Postgres dump → uploaded to HyperCore Object Storage backup bucket.
# Schedule via cron:  0 3 * * * /home/daugia/daugia/deploy/hypercore/backup.sh

set -euo pipefail

cd "$(dirname "$0")"

# Load env so we get OBJECT_STORAGE_* + POSTGRES_*
set -a
. ./.env
set +a

TS=$(date -u +%Y%m%d-%H%M%S)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

DUMP="$TMP/db-$TS.sql.gz"

docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip -9 > "$DUMP"

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

echo "$(date -u) ok ${DUMP##*/}"
