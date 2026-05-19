# ═══════════════════════════════════════════════════════════════════════
# Makefile — Yoga Platform
#
# Delivery targets:
#   make all                → generate .env + SSL, build images, start
#   make up / down          → start / stop services
#   make restart            → down + up
#   make status             → docker compose ps
#   make logs               → stream logs from every service
#   make logs-fullstack     → stream Nuxt logs only
#   make seed               → load the editorial catalogue (idempotent)
#   make test               → insert demo + tester accounts (needs seed)
#   make preview            → build prod and run it on :3000 without nginx/SSL
#   make vimeo-check        → smoke-test the Vimeo proxy (IV.9 healthcheck)
#   make api                → smoke-test the Public API key gate (IV.1)
#   make directus-snapshot  → save Directus schema to snapshots/
#   make directus-apply     → load snapshots/ into Directus
#   make clean              → down + remove volumes (wipes DB)
#   make fclean             → clean + remove images
#   make re                 → fclean + all
#
# Prerequisites (must be present on the host):
#   - docker engine 24.x + docker compose plugin v2.x
#   - openssl (used by `setup` to generate the self-signed certificate)
#   - make
# ═══════════════════════════════════════════════════════════════════════

NAME    = yoga
SRCS    = srcs
COMPOSE = docker compose -f $(SRCS)/docker-compose.yml --project-directory $(SRCS)

GREEN  = \033[0;32m
YELLOW = \033[0;33m
RED    = \033[0;31m
BLUE   = \033[0;34m
RESET  = \033[0m

# ── Entry point ─────────────────────────────────────────────────────
all: setup build up
	@HTTPS_PORT=$$(grep -E '^NGINX_HTTPS_PORT=' $(SRCS)/.env 2>/dev/null | cut -d= -f2); \
	HTTPS_PORT=$${HTTPS_PORT:-443}; \
	printf "$(GREEN)Platform running at https://localhost:$$HTTPS_PORT$(RESET)\n"; \
	printf "$(BLUE)Directus CMS at https://localhost:$$HTTPS_PORT/cms$(RESET)\n"

# ── Initial setup: .env + SSL certs ─────────────────────────────────
# Creates srcs/.env from the example if missing, syncs new keys from the
# example, injects the host UID/GID, makes the directus bind-mount dirs
# and generates the self-signed certificate when absent. Idempotent.
setup:
	@if [ ! -f $(SRCS)/.env ]; then \
		cp $(SRCS)/.env.example $(SRCS)/.env; \
		printf "$(YELLOW)$(SRCS)/.env created from .env.example — review the values$(RESET)\n"; \
	else \
		while IFS= read -r line; do \
			case "$$line" in ''|\#*) continue;; \
				*=*) key=$${line%%=*}; \
					grep -q "^$$key=" $(SRCS)/.env 2>/dev/null || printf "%s\n" "$$line" >> $(SRCS)/.env;; \
			esac; \
		done < $(SRCS)/.env.example; \
	fi
	@CURRENT_UID=$$(id -u); CURRENT_GID=$$(id -g); \
	sed -i "s/^UID=.*/UID=$$CURRENT_UID/" $(SRCS)/.env; \
	sed -i "s/^GID=.*/GID=$$CURRENT_GID/" $(SRCS)/.env
	@mkdir -p $(SRCS)/requirements/directus/extensions $(SRCS)/requirements/directus/snapshots
	@mkdir -p $(SRCS)/requirements/nginx/ssl
	@CRT=$(SRCS)/requirements/nginx/ssl/selfsigned.crt; \
	KEY=$(SRCS)/requirements/nginx/ssl/selfsigned.key; \
	if [ ! -s "$$CRT" ] || [ ! -s "$$KEY" ] || ! openssl x509 -in "$$CRT" -noout >/dev/null 2>&1; then \
		printf "$(YELLOW)Generating self-signed SSL certificate...$(RESET)\n"; \
		rm -f "$$CRT" "$$KEY"; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout "$$KEY" -out "$$CRT" \
			-subj "/C=ES/ST=Madrid/L=Madrid/O=YogaPlatform/CN=localhost" >/dev/null 2>&1; \
		printf "$(GREEN)SSL certificate generated$(RESET)\n"; \
	fi
	@printf "$(GREEN)Setup complete$(RESET)\n"

# ── Build images ────────────────────────────────────────────────────
build: setup
	@printf "$(BLUE)Building images...$(RESET)\n"
	$(COMPOSE) build

# ── Lifecycle ───────────────────────────────────────────────────────
up: setup
	@printf "$(GREEN)Starting $(NAME)...$(RESET)\n"
	$(COMPOSE) up -d

down:
	@printf "$(RED)Stopping $(NAME)...$(RESET)\n"
	$(COMPOSE) down

restart: down up

status:
	$(COMPOSE) ps

# ── Logs ────────────────────────────────────────────────────────────
logs:
	$(COMPOSE) logs -f

logs-fullstack:
	$(COMPOSE) logs -f fullstack

# ── Database ────────────────────────────────────────────────────────
# `make seed`  → editorial catalogue only (modules, classes, tags, faqs).
# `make test`  → demo + tester accounts on top of the catalogue.
# Both are idempotent.
seed:
	@printf "$(BLUE)Seeding default catalogue...$(RESET)\n"
	$(COMPOSE) exec fullstack npx prisma db seed
	@printf "$(GREEN)Seed complete$(RESET)\n"

test:
	@printf "$(BLUE)Inserting QA test users...$(RESET)\n"
	$(COMPOSE) exec fullstack npm run test:users
	@printf "$(GREEN)Test users ready$(RESET)\n"

# ── Production preview (no nginx, no SSL) ───────────────────────────
# Spawns a one-off fullstack container that builds the Nitro bundle and
# serves it on host port 3000, bypassing nginx and TLS termination
# entirely. The dev fullstack container is stopped first so the build
# volumes are not contended. Resume the normal stack with `make up`
# once you are done.
# Hit http://localhost:3000.
preview:
	@printf "$(YELLOW)Stopping dev fullstack (port 3000 needs to be free)...$(RESET)\n"
	@$(COMPOSE) stop fullstack >/dev/null 2>&1 || true
	@printf "$(BLUE)Building production bundle + serving on http://localhost:3000$(RESET)\n"
	@printf "$(BLUE)Press Ctrl-C to stop, then run `make up` to resume normal stack.$(RESET)\n"
	$(COMPOSE) run --rm --service-ports --publish 3000:3000 \
		--entrypoint sh fullstack \
		-c 'npm run build && exec node .output/server/index.mjs'

# ── Health & Vimeo smoke check (IV.9 DevOps healthcheck) ────────────
# The fullstack container exposes /api/health and /api/status. The
# Vimeo proxy is wrapped so that a missing token returns 503 and a
# non-existent video returns 404 — neither crashes the app. Run this
# target to verify the platform is responsive even with no Vimeo
# content uploaded.
vimeo-check:
	@printf "$(BLUE)═══ Healthcheck (IV.9 DevOps) ═══$(RESET)\n"
	@HEALTH=$$($(COMPOSE) exec -T fullstack curl -fsS http://localhost:3000/api/health 2>/dev/null); \
	if echo "$$HEALTH" | grep -qE '"status"[[:space:]]*:[[:space:]]*"ok"'; then \
		printf "$(GREEN)✓ /api/health OK$(RESET)  → $$HEALTH\n"; \
	else \
		printf "$(RED)✗ /api/health failed$(RESET)\n"; exit 1; \
	fi
	@printf "$(BLUE)Probing Vimeo proxy with non-existent video id 999999999...$(RESET)\n"
	@CODE=$$($(COMPOSE) exec -T fullstack curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/videos/999999999/embed); \
	case "$$CODE" in \
		404) printf "$(GREEN)✓ Vimeo proxy answered 404 (video not found) — handled gracefully$(RESET)\n";; \
		503) printf "$(GREEN)✓ Vimeo proxy answered 503 (token not configured) — handled gracefully$(RESET)\n";; \
		400) printf "$(GREEN)✓ Vimeo proxy answered 400 — handled gracefully$(RESET)\n";; \
		*)   printf "$(RED)✗ Unexpected response code: $$CODE$(RESET)\n"; exit 1;; \
	esac
	@printf "$(GREEN)═══ Healthcheck OK ═══$(RESET)\n"

# ── Public API smoke test (IV.1 Major) ──────────────────────────────
# Reads API_KEY from srcs/.env and exercises POST /api/v1/reviews:
#   1) sin header        → 401
#   2) header incorrecto → 401
#   3) header correcto   → 201
# Falla si alguno de los códigos no es el esperado. No depende del
# host: las tres llamadas se hacen desde dentro del contenedor nginx.
api:
	@printf "$(BLUE)═══ Public API smoke test (POST /api/v1/reviews) ═══$(RESET)\n"
	@API_KEY=$$(grep -E '^API_KEY=' $(SRCS)/.env | cut -d= -f2-); \
	if [ -z "$$API_KEY" ]; then \
		printf "$(RED)✗ API_KEY no configurada en $(SRCS)/.env$(RESET)\n"; exit 1; \
	fi; \
	HTTPS_PORT=$$(grep -E '^NGINX_HTTPS_PORT=' $(SRCS)/.env | cut -d= -f2); \
	HTTPS_PORT=$${HTTPS_PORT:-443}; \
	BASE="https://localhost:$$HTTPS_PORT/api/v1/reviews"; \
	PAYLOAD='{"locale":"es_es","name":"smoke","title":"smoke","imageUrl":"https://example.com/x.png","description":"smoke"}'; \
	printf "$(BLUE)→ Sin X-API-Key (esperado 401)...$(RESET)\n"; \
	CODE=$$(curl -k -s -o /dev/null -w '%{http_code}' -X POST "$$BASE" -H 'Content-Type: application/json' -d "$$PAYLOAD"); \
	if [ "$$CODE" = "401" ]; then printf "$(GREEN)  ✓ 401$(RESET)\n"; else printf "$(RED)  ✗ esperado 401, obtenido $$CODE$(RESET)\n"; exit 1; fi; \
	printf "$(BLUE)→ X-API-Key incorrecta (esperado 401)...$(RESET)\n"; \
	CODE=$$(curl -k -s -o /dev/null -w '%{http_code}' -X POST "$$BASE" -H 'Content-Type: application/json' -H 'X-API-Key: wrong' -d "$$PAYLOAD"); \
	if [ "$$CODE" = "401" ]; then printf "$(GREEN)  ✓ 401$(RESET)\n"; else printf "$(RED)  ✗ esperado 401, obtenido $$CODE$(RESET)\n"; exit 1; fi; \
	printf "$(BLUE)→ X-API-Key correcta (esperado 201)...$(RESET)\n"; \
	CODE=$$(curl -k -s -o /dev/null -w '%{http_code}' -X POST "$$BASE" -H 'Content-Type: application/json' -H "X-API-Key: $$API_KEY" -d "$$PAYLOAD"); \
	if [ "$$CODE" = "201" ]; then printf "$(GREEN)  ✓ 201$(RESET)\n"; else printf "$(RED)  ✗ esperado 201, obtenido $$CODE$(RESET)\n"; exit 1; fi; \
	printf "$(GREEN)═══ Public API OK ═══$(RESET)\n"

# ── Directus schema (version-controlled CMS model) ──────────────────
directus-snapshot:
	@printf "$(BLUE)Saving Directus schema snapshot...$(RESET)\n"
	$(COMPOSE) exec directus npx directus schema snapshot --yes ./snapshots/schema.yaml
	@printf "$(GREEN)Snapshot saved to srcs/requirements/directus/snapshots/schema.yaml$(RESET)\n"

directus-apply:
	@printf "$(YELLOW)Applying Directus schema snapshot...$(RESET)\n"
	$(COMPOSE) exec directus npx directus schema apply --yes ./snapshots/schema.yaml
	@printf "$(GREEN)Schema applied$(RESET)\n"

# ── shell-db ────────────────────────────────────────────────────────
shell-db:
	$(COMPOSE) exec db psql -U $${POSTGRES_USER:-yoga_dev} -d $${POSTGRES_DB:-yoga_dev}

# ── Cleanup ─────────────────────────────────────────────────────────
clean: down
	@printf "$(RED)Removing volumes...$(RESET)\n"
	$(COMPOSE) down -v

fclean: clean
	@printf "$(RED)Removing images...$(RESET)\n"
	docker rmi -f $$(docker images -q $(NAME)-* 2>/dev/null) 2>/dev/null || true
	docker system prune -f

re: fclean all

.PHONY: all setup build up down restart status \
        logs logs-fullstack seed test preview vimeo-check api \
        directus-snapshot directus-apply clean fclean re
