# Deploy: HyperCore NVMe VPS HYPER-2 + Object Storage

Single-VM deployment for the **daugia999** Go API.

- **VPS**: HyperCore NVMe VPS HYPER-2 — 2 vCPU / 4 GB / 40 GB NVMe / 200 Mbps unlimited
- **Region**: Ho Chi Minh 2
- **Annual prepay**: 1,836,000đ (~$73/yr, ~$6.10/mo)
- **Storage**: Cloudflare R2 (S3-compatible, 10 GB free, $0 egress). HyperCore Object
  Storage was checked but has no region available right now and is 1 TB minimum,
  so R2 fits this scale much better.
- **DB**: Postgres 16 on the VM, daily dump → R2 backup bucket

## One-time setup

### 1. Order VPS in HyperCore portal

[my.hypercore.vn](https://my.hypercore.vn) → Cloud → Compute → VM Deploy:
- Server family: **NVMe VPS** (Local NVMe)
- Datacenter: **Ho Chi Minh 2**
- OS: **Ubuntu 24.04 LTS x64**
- Plan: **HYPER-2** (2 vCPU / 4 GB / 40 GB)
- Billing: **năm** (annual, -15%)
- Add SSH public key

### 2. DNS

Point `api.daugiavinhyen.com` (A record, TTL 300) → assigned VPS IP.

### 3. Create Cloudflare R2 bucket

[dash.cloudflare.com](https://dash.cloudflare.com) → R2 →
- Create bucket `daugia-articles` (Automatic location, EAP/APAC region if available)
- Manage R2 API tokens → Create token: **Object Read & Write**, scoped to `daugia-articles`
- Copy: Access Key ID, Secret Access Key, and the **S3 API endpoint** host (`<account-id>.r2.cloudflarestorage.com`)

Repeat for a second bucket `daugia-articles-backups` (for nightly Postgres dumps).

### 4. Initial server hardening (on the VM)

```bash
ssh root@<HYPERCORE_IP>

adduser daugia
usermod -aG sudo daugia
mkdir -p /home/daugia/.ssh
cp /root/.ssh/authorized_keys /home/daugia/.ssh/
chown -R daugia:daugia /home/daugia/.ssh
chmod 700 /home/daugia/.ssh && chmod 600 /home/daugia/.ssh/authorized_keys

sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

apt update && apt install -y ufw fail2ban unattended-upgrades
ufw default deny incoming && ufw default allow outgoing
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable
dpkg-reconfigure -plow unattended-upgrades

curl -fsSL https://get.docker.com | sh
usermod -aG docker daugia
```

Log out, back in as `daugia`.

### 5. Clone + configure

```bash
ssh daugia@<HYPERCORE_IP>
git clone https://github.com/<your-org>/daugia999.git
cd daugia999/deploy/hypercore

cp .env.example .env
chmod 600 .env

# Generate secrets
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 64)"
echo "ADMIN_PASSWORD=$(openssl rand -base64 24)"
# Paste these into .env, plus OBJECT_STORAGE_* from the dashboard.

mkdir -p data/postgres
```

### 6. Bring up the shared Caddy front door (one-time, hosts ALL sites on this VM)

```bash
# Create the shared docker network all public-facing services join
docker network create proxy

cd ~/daugia999/deploy/shared
mkdir -p data config
docker compose up -d
docker compose logs -f caddy
```

The shared Caddy reads `deploy/shared/conf.d/*.caddy`. The daugia route is already
defined in `conf.d/api.daugiavinhyen.com.caddy`; it auto-issues TLS via Let's Encrypt on
first request.

### 7. Boot daugia

```bash
cd ~/daugia999/deploy/hypercore
docker compose up -d
docker compose logs -f api
```

### 8. Run migrations + seed

```bash
docker compose exec api migrate -path /app/migrations \
  -database "$DATABASE_URL" up

docker compose exec api /app/api seed
```

> `migrate` is bundled into the runtime image (added to `backend/Dockerfile`),
> so the command above works without extra setup.

### 9. Update Vercel frontend

Vercel → Project → Settings → Environment Variables:
- `API_URL=https://api.daugiavinhyen.com`
- `NEXT_PUBLIC_API_URL=https://api.daugiavinhyen.com`

Redeploy.

### 10. Schedule daily backups

```bash
# Install aws cli (used by backup.sh against Cloudflare R2)
sudo apt install -y awscli
aws configure --profile r2  # paste OBJECT_STORAGE_ACCESS_KEY / SECRET_KEY
# When prompted for region, just press Enter (R2 ignores it).

# Test once
./backup.sh

# Cron at 03:00 ICT daily
crontab -e
# 0 3 * * * /home/daugia/daugia999/deploy/hypercore/backup.sh >> /home/daugia/backup.log 2>&1
```

## Day-to-day

```bash
# Deploy new backend code
cd ~/daugia999 && git pull
cd deploy/hypercore
docker compose build api
docker compose up -d api
docker compose logs -f api

# Resize VM (if you outgrow HYPER-2)
# Done in HyperCore dashboard → Resize → HYPER-3 (4 vCPU / 8 GB / 80 GB) — ~30 sec, no data loss
```

## Resource budget on HYPER-2 (4 GB)

| Service | Typical | Peak |
|---|---|---|
| Postgres | ~512 MB | ~700 MB |
| Go API | ~80 MB | ~400 MB during parsing |
| libvips per concurrent job | — | ~250 MB |
| Caddy (in `deploy/shared/`) | ~30 MB | ~60 MB |
| OS + Docker | ~400 MB | ~500 MB |
| **Total — daugia only** | **~1.0 GB** | **~2.4 GB** |

Leaves ~1.5 GB free on HYPER-2 for additional sites and bots.
See [`deploy/shared/README.md`](../shared/README.md) for adding new services.
Resize to HYPER-3 (4 vCPU / 8 GB / 80 GB, ~306K/mo annual) if you ever exceed.

## What's NOT in this stack (intentional)

- **No MinIO container** — replaced by Cloudflare R2; the Go code uses the same `minio-go` client unchanged (R2 is S3-compatible).
- **No separate Postgres replica** — daily dumps to R2 are the recovery story at this scale.
- **No nginx** — Caddy handles TLS + reverse proxy in one binary.
- **No per-project Caddy** — moved to `deploy/shared/` so the same Caddy serves daugia plus any other sites/bots you add to this VM. See [`deploy/shared/README.md`](../shared/README.md).

## Cost summary

| Item | Yearly |
|---|---|
| HYPER-2 (annual prepay, -15%) | 1,836,000đ |
| Cloudflare R2 (under 10 GB) | 0đ |
| Domain (`.vn`) | ~300,000đ |
| Vercel + UptimeRobot | 0đ |
| **Total** | **~2,150,000đ/yr (~$85/yr, ~$7.10/mo)** |
