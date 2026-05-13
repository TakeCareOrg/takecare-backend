# Monitoring (Prometheus + Grafana)

Self-contained observability stack for the TakeCare backend. Deployed on the
same VPS as the API.

## How it fits with the API deployment

`.github/workflows/deploy.yml` runs the API on the VPS with `--network host`,
binding ports on the host:

| Branch    | Container             | Port |
| --------- | --------------------- | ---- |
| `main`    | `takecare-api`        | 3001 |
| `develop` | `takecare-api-beta`   | 3002 |

The monitoring stack runs on the default Docker bridge network and reaches
those ports via `host.docker.internal`, which Docker resolves to the host
gateway thanks to the `extra_hosts: "host.docker.internal:host-gateway"`
entry in `docker-compose.yml`.

## What it scrapes

`/metrics` on each API instance exposes:

- HTTP metrics from `express-prom-bundle` (`http_request_duration_seconds_*`)
- Custom business metrics from `src/config/metrics.ts`
  (`user_created_total`, `quizz_completed_total`, `api_request_total`,
  `api_error_total`, `api_response_duration_seconds_*`)
- Default Node.js process metrics (`process_*`, `nodejs_*`)

Both registries are merged in `src/app.ts` via `promRegistry: register`.

## Deployment

Automatic, via [`.github/workflows/monitoring.yml`](../.github/workflows/monitoring.yml):

- runs on every push to `main` that touches `monitoring/**`
- can also be triggered manually (`workflow_dispatch`)
- `scp`s the `monitoring/` directory to the VPS, writes `.env` from the
  `GRAFANA_PASSWORD` secret, then `docker compose up -d` (idempotent)

### Required GitHub secrets

| Name               | Used for                              |
| ------------------ | ------------------------------------- |
| `VPS_HOST`         | SSH host (shared with `deploy.yml`)   |
| `VPS_USER`         | SSH user (shared with `deploy.yml`)   |
| `SSH_PRIVATE_KEY`  | SSH key (shared with `deploy.yml`)    |
| `GRAFANA_PASSWORD` | Grafana admin password                |

`GRAFANA_DOMAIN` is set as a plain workflow env (currently
`grafana-tc.loule.me`), since it's not sensitive.

## Manual deploy on the VPS

```bash
ssh <user>@<vps>
cd ~/takecare-monitoring/monitoring   # or wherever you placed it
cp .env.example .env && $EDITOR .env  # set GRAFANA_PASSWORD + GRAFANA_DOMAIN
docker compose up -d
```

## Endpoints

Both services keep their port bindings on `127.0.0.1` (the VPS itself).
Public access is provided by the existing nginx, following the same
`<service>-tc.loule.me` pattern as `api-tc.loule.me` and `vault-tc.loule.me`.

| Service    | Internal (on the VPS)     | Public                              |
| ---------- | ------------------------- | ----------------------------------- |
| Prometheus | http://127.0.0.1:9090     | none — not exposed (no auth)        |
| Grafana    | http://127.0.0.1:7001     | https://grafana-tc.loule.me         |

The "TakeCare Backend" dashboard is auto-provisioned on first boot
(folder: "TakeCare"). Log in as `admin` with `$GRAFANA_PASSWORD`.

### One-time nginx setup

Add a server block for `grafana-tc.loule.me` to the existing nginx config
on the VPS — same pattern as `api-tc.loule.me` / `vault-tc.loule.me`.
The upstream is `http://127.0.0.1:7001`. Don't forget WebSocket upgrade
headers (`Upgrade`, `Connection`) so Grafana Live works.

Also required:

- A DNS `A` record for `grafana-tc.loule.me` pointing to the VPS
- A TLS cert: `sudo certbot --nginx -d grafana-tc.loule.me`

### Reaching Prometheus

Prometheus has **no built-in auth** and is intentionally not exposed. Two
options if you need to query it directly:

```bash
# 1. SSH tunnel
ssh -L 9090:127.0.0.1:9090 <user>@<vps>
# then http://127.0.0.1:9090

# 2. Use Grafana's Explore tab — the Prometheus datasource is
#    auto-provisioned and proxies queries server-side.
```

## Local dev (API running on your laptop, not on the VPS)

`host.docker.internal` already resolves to your host on Docker Desktop. For
Docker on plain Linux it resolves via `host-gateway`. Either way:

```bash
cd monitoring
echo "GRAFANA_PASSWORD=dev" > .env
docker compose up -d
```

If your local API runs on a port other than 3001/3002, edit
`monitoring/prometheus.yml` targets.

## Adding a custom metric

1. Register it in `src/config/metrics.ts` against the exported `register`.
2. Import and update it from your handler / service.
3. It shows up automatically at `/metrics` and in Prometheus on the next
   scrape (15s).
