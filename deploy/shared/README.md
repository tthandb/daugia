# Shared infra on the HyperCore VM

One Caddy 2 reverse proxy fronts every site on this VM. Auto-TLS via Let's
Encrypt for any domain you point at the VM's IP.

## Layout

```
deploy/shared/
  docker-compose.yml      # the Caddy service + external `proxy` network
  Caddyfile               # entry point; just imports conf.d/*.caddy
  conf.d/
    api.daugiavinhyen.com.caddy   # daugia API route (already wired)
    *.caddy               # one file per domain you add
  data/                   # Caddy state — TLS certs (do NOT delete)
  config/                 # Caddy autosaved config
```

## One-time setup (per VM)

```bash
docker network create proxy
cd ~/daugia/deploy/shared
docker compose up -d
```

## Adding a new service

1. **Create the project directory** somewhere on the VM, e.g. `~/myblog/`.
2. **Write `docker-compose.yml`** — join the external `proxy` network and
   `expose:` (don't `ports:`) the port Caddy will hit:

   ```yaml
   services:
     web:
       image: ghcr.io/your/blog:latest
       container_name: myblog        # name Caddy will reverse-proxy to
       restart: unless-stopped
       expose: ["3000"]
       mem_limit: 256m
       networks: [proxy]

   networks:
     proxy:
       name: proxy
       external: true
   ```

3. **Add a Caddy snippet** at `deploy/shared/conf.d/blog.example.com.caddy`:

   ```
   blog.example.com {
       encode zstd gzip
       reverse_proxy myblog:3000
   }
   ```

4. **Reload Caddy** (no restart, no downtime for other sites):

   ```bash
   cd ~/daugia/deploy/shared
   docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```

5. **Bring up the service:**

   ```bash
   cd ~/myblog
   docker compose up -d
   ```

6. **DNS:** point `blog.example.com` (A record) at the VM IP. TLS is issued on
   the first HTTPS request (~10s).

## Discord bots (and other outbound-only services)

Bots don't need Caddy — they connect outbound to Discord's gateway. Skip the
`proxy` network entirely:

```yaml
# ~/bot-musicbot/docker-compose.yml
services:
  bot:
    build: .
    container_name: bot-musicbot
    restart: unless-stopped
    environment:
      DISCORD_TOKEN: ${DISCORD_TOKEN}
    mem_limit: 256m
    # no networks, no ports — fully isolated
```

```bash
cd ~/bot-musicbot
cp .env.example .env  # paste DISCORD_TOKEN
docker compose up -d
docker compose logs -f
```

## Resource limits — set them

HYPER-2 has 4 GB total. Always set `mem_limit:` per service so one runaway
container can't OOM-kill the others:

| Service kind | `mem_limit:` suggestion |
|---|---|
| Discord bot (Node/Python) | `256m` |
| Static site (Caddy fileserver) | n/a (handled by shared Caddy) |
| Next.js SSR small site | `400m` |
| Small Go API / webhook | `128m` |
| Redis (small cache) | `256m` |
| Daugia API (parsing peaks) | `1g` (already set) |

`docker stats` is your friend for tuning these.

## Disk hygiene

40 GB fills faster than expected with Docker layers + Postgres + uploads:

```bash
# Weekly cleanup cron (~/cleanup.sh)
docker system prune -af --volumes --filter "until=168h"
docker image prune -af
```

```cron
# Sundays at 04:00 ICT
0 4 * * 0 /home/daugia/cleanup.sh >> /home/daugia/cleanup.log 2>&1
```

When `df -h /` hits ~30 GB used, resize the VM to HYPER-3 (80 GB).

## Capacity ceiling on HYPER-2

Realistic mix you can host alongside daugia on HYPER-2 (4 GB):

- 2–3 static / SSG sites
- 1–2 small SSR sites
- 2–4 Discord/Telegram bots
- 1 small Redis

Past that, resize to HYPER-3 (4 vCPU / 8 GB / 80 GB, ~306K/mo annual).

## Removing a service

```bash
cd ~/myblog && docker compose down
rm ~/daugia/deploy/shared/conf.d/blog.example.com.caddy
docker compose -f ~/daugia/deploy/shared/docker-compose.yml exec caddy \
  caddy reload --config /etc/caddy/Caddyfile
```

(TLS cert stays cached in `data/` — Caddy will reuse it if the domain comes back.)
