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

## Manual deploy on the VPS

```bash
ssh <user>@<vps>
cd ~/takecare-monitoring/monitoring   # or wherever you placed it
cp .env.example .env && $EDITOR .env  # set GRAFANA_PASSWORD
docker compose up -d
```

## Endpoints (localhost-only by design)

| Service    | URL                       | Credentials                 |
| ---------- | ------------------------- | --------------------------- |
| Prometheus | http://127.0.0.1:9090     | none                        |
| Grafana    | http://127.0.0.1:7001     | admin / `$GRAFANA_PASSWORD` |

Access from your laptop via SSH tunnel:

```bash
ssh -L 9090:127.0.0.1:9090 -L 7001:127.0.0.1:7001 <user>@<vps>
```

The "TakeCare Backend" dashboard is auto-provisioned on first boot
(folder: "TakeCare").

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
