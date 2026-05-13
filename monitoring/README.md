# Monitoring (Prometheus + Grafana)

Self-contained observability stack for the TakeCare backend.

## What it scrapes

Prometheus scrapes the Express API on `http://express:4000/metrics`.
The endpoint exposes:

- HTTP metrics from `express-prom-bundle` (`http_request_duration_seconds_*`)
- Custom business metrics from `src/config/metrics.ts`
  (`user_created_total`, `quizz_completed_total`, `api_request_total`,
  `api_error_total`, `api_response_duration_seconds_*`)
- Default Node.js process metrics (`process_*`, `nodejs_*`)

Both registries are merged in `src/app.ts` via `promRegistry: register`.

## First-time setup

```bash
# 1) Shared network between the API container and the monitoring stack
docker network create takecare_net

# 2) Make sure the API joins it (in the API compose file, or at runtime):
#    services.express.networks: [takecare_net]
#    (the service name must be "express" to match prometheus.yml)

# 3) Configure Grafana admin password
cp monitoring/.env.example monitoring/.env
$EDITOR monitoring/.env

# 4) Start the stack
cd monitoring
docker compose up -d
```

## Endpoints (localhost-only by design)

| Service    | URL                       | Credentials             |
| ---------- | ------------------------- | ----------------------- |
| Prometheus | http://127.0.0.1:9090     | none                    |
| Grafana    | http://127.0.0.1:7001     | admin / `$GRAFANA_PASSWORD` |

The `TakeCare Backend` dashboard is auto-provisioned on first boot
(folder: "TakeCare").

## Local dev (API running on the host, not in Docker)

Edit `monitoring/prometheus.yml` and change the target:

```yaml
- targets: ["host.docker.internal:4000"] # Docker Desktop
# or: ["172.17.0.1:4000"] on Linux (host IP from the docker0 bridge)
```

## Adding a custom metric

1. Register it in `src/config/metrics.ts` against the exported `register`.
2. Import and update it from your handler/service.
3. It will show up automatically at `/metrics` and in Prometheus on the
   next scrape (15s).
