.PHONY: help build up down logs shell test ngrok ngrok-stop

# Variables
DOCKER  := docker compose
SERVICE := express      # Service name in docker-compose.yml
PORT    := 4000     # Port exposed by the app
NGROK   := ngrok
NGROK_PID_FILE := .ngrok.pid

## --------------------------------------------------
## Help
## --------------------------------------------------
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort \
	| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

## --------------------------------------------------
## Docker lifecycle
## --------------------------------------------------
build: ## Build the docker image
	$(DOCKER) build

run: build ## Start the app in background
	$(DOCKER) up -d $(SERVICE)

teardown: ## Stop the app
	$(DOCKER) down

logs: ## Show logs of the app
	$(DOCKER) logs -f $(SERVICE)

shell: ## Open a shell inside the container
	$(DOCKER) exec -it $(SERVICE) sh

## --------------------------------------------------
## Tests
## --------------------------------------------------
test: ## Run Jest tests inside the container
	$(DOCKER) run --rm $(SERVICE) npm test

## --------------------------------------------------
## Dev tools
## --------------------------------------------------
ngrok: up ## Start ngrok, kill previous one if exists, copy URL to clipboard
	@if [ -f $(NGROK_PID_FILE) ]; then \
		echo "Killing previous ngrok process..."; \
		kill `cat $(NGROK_PID_FILE)` 2>/dev/null || true; \
		rm -f $(NGROK_PID_FILE); \
	fi
	@echo "Starting ngrok on port $(PORT)..."
	@$(NGROK) http $(PORT) --log=stdout > /dev/null 2>&1 & echo $$! > $(NGROK_PID_FILE)
	@sleep 2
	@URL=$$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o 'https://[0-9a-z]*\.ngrok-free.app' | head -n1); \
	if [ -n "$$URL" ]; then \
		printf "\033[36m🔗 %s\033[0m\n" "$$URL"; \
		echo $$URL | pbcopy; \
		echo "✅ ngrok tunnel started and URL copied to clipboard!"; \
	else \
		echo "❌ Failed to retrieve ngrok URL"; \
	fi

ngrok-stop: down ## Stop ngrok if running
	@if [ -f $(NGROK_PID_FILE) ]; then \
		echo "Stopping ngrok..."; \
		kill `cat $(NGROK_PID_FILE)` 2>/dev/null || true; \
		rm -f $(NGROK_PID_FILE); \
	else \
		echo "No ngrok process running."; \
	fi
