# ═══════════════════════════════════════════════════════════════════════
# Makefile — ft_transcendence
#
# Main targets:
#   make all        → Install deps, generate SSL, build images, start services
#   make up         → Start all services
#   make down       → Stop all services
#   make logs       → Stream logs from all services
# ═══════════════════════════════════════════════════════════════════════

NAME = transcendence

# Terminal colours
GREEN  = \033[0;32m
YELLOW = \033[0;33m
RED    = \033[0;31m
BLUE   = \033[0;34m
RESET  = \033[0m

# ── Entry point ────────────────────────────────────────────────────
all: deps setup build up
	@printf "$(GREEN)Platform running at https://localhost$(RESET)\n"
	@printf "$(BLUE)Directus CMS at https://localhost/cms$(RESET)\n"

# ── System dependencies ────────────────────────────────────────────
deps:
	@printf "$(BLUE)═══ Checking system dependencies ═══$(RESET)\n"
	@IS_WSL=false; \
	if grep -qi 'microsoft\|WSL' /proc/version 2>/dev/null; then \
		IS_WSL=true; \
		printf "$(BLUE)Detected: WSL (Windows Subsystem for Linux)$(RESET)\n"; \
	fi; \
	\
	DISTRO="unknown"; \
	PKG_MANAGER=""; \
	if [ -f /etc/os-release ]; then \
		. /etc/os-release; \
		DISTRO="$$ID"; \
		case "$$ID" in \
			ubuntu|debian|linuxmint|pop|elementary|zorin|kali) \
				PKG_MANAGER="apt";; \
			arch|endeavouros|cachyos|manjaro|garuda|artix) \
				PKG_MANAGER="pacman";; \
			fedora|nobara) \
				PKG_MANAGER="dnf";; \
			*) \
				if command -v apt-get >/dev/null 2>&1; then \
					PKG_MANAGER="apt"; \
				elif command -v pacman >/dev/null 2>&1; then \
					PKG_MANAGER="pacman"; \
				fi;; \
		esac; \
	fi; \
	printf "$(BLUE)OS: $$DISTRO ($$PKG_MANAGER)$(RESET)\n"; \
	\
	missing=""; \
	command -v docker >/dev/null 2>&1 || missing="$$missing docker"; \
	command -v openssl >/dev/null 2>&1 || missing="$$missing openssl"; \
	if command -v docker >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then \
		missing="$$missing docker-compose"; \
	fi; \
	\
	if [ -n "$$missing" ]; then \
		printf "$(YELLOW)Missing:$$missing$(RESET)\n"; \
		if [ "$$IS_WSL" = "true" ] && echo "$$missing" | grep -q "docker"; then \
			printf "\n$(YELLOW)══════════════════════════════════════════════════════$(RESET)\n"; \
			printf "$(YELLOW)  WSL detected: two options for Docker$(RESET)\n"; \
			printf "$(YELLOW)══════════════════════════════════════════════════════$(RESET)\n"; \
			printf "$(BLUE)  Option A (recommended):$(RESET)\n"; \
			printf "    Install Docker Desktop on Windows and enable\n"; \
			printf "    'Use the WSL 2 based engine' in Settings.\n\n"; \
			printf "$(BLUE)  Option B (native Docker in WSL):$(RESET)\n"; \
			printf "    Continue and Docker will be installed inside WSL.\n"; \
			printf "    You will need to start the daemon manually:\n"; \
			printf "      sudo dockerd &\n\n"; \
		fi; \
		case "$$PKG_MANAGER" in \
			apt) \
				printf "$(YELLOW)Installing via apt...$(RESET)\n"; \
				sudo apt-get update -qq; \
				sudo apt-get install -y --no-install-recommends \
					docker.io docker-compose-v2 openssl ca-certificates curl;; \
			pacman) \
				printf "$(YELLOW)Installing via pacman...$(RESET)\n"; \
				sudo pacman -Sy --needed --noconfirm \
					docker docker-compose docker-buildx openssl;; \
			dnf) \
				printf "$(YELLOW)Installing via dnf...$(RESET)\n"; \
				sudo dnf install -y docker docker-compose-plugin openssl;; \
			*) \
				printf "$(RED)Cannot install automatically on: $$DISTRO$(RESET)\n"; \
				printf "$(RED)Install manually:$$missing$(RESET)\n"; \
				exit 1;; \
		esac; \
		printf "$(GREEN)Packages installed$(RESET)\n"; \
	else \
		printf "$(GREEN)All dependencies present$(RESET)\n"; \
	fi; \
	\
	if ! groups 2>/dev/null | grep -qw docker; then \
		printf "$(YELLOW)Your user is not in the 'docker' group.$(RESET)\n"; \
		printf "$(YELLOW)Run the following then LOG OUT and back in:$(RESET)\n"; \
		printf "$(BLUE)  sudo usermod -aG docker $$USER$(RESET)\n"; \
	else \
		printf "$(GREEN)User in docker group$(RESET)\n"; \
	fi
	@if ! docker info >/dev/null 2>&1; then \
		printf "$(YELLOW)Docker daemon not running. Starting...$(RESET)\n"; \
		if command -v systemctl >/dev/null 2>&1; then \
			sudo systemctl enable docker 2>/dev/null || true; \
			sudo systemctl start docker 2>/dev/null; \
		else \
			sudo service docker start 2>/dev/null || true; \
		fi; \
		sleep 2; \
		if ! docker info >/dev/null 2>&1; then \
			printf "$(RED)Could not start Docker. Try manually:$(RESET)\n"; \
			printf "$(RED)  sudo systemctl start docker$(RESET)\n"; \
			exit 1; \
		fi; \
		printf "$(GREEN)Docker daemon started and enabled$(RESET)\n"; \
	else \
		printf "$(GREEN)Docker daemon running$(RESET)\n"; \
	fi
	@if ! docker compose version >/dev/null 2>&1; then \
		printf "$(RED)'docker compose' not available after install.$(RESET)\n"; \
		exit 1; \
	fi
	@printf "$(GREEN)═══ System ready ═══$(RESET)\n"

# ── Initial setup ──────────────────────────────────────────────────
setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		printf "$(YELLOW).env created from .env.example — review the values$(RESET)\n"; \
	fi
	@if [ ! -f nginx/ssl/selfsigned.crt ]; then \
		printf "$(YELLOW)Generating self-signed SSL certificate...$(RESET)\n"; \
		mkdir -p nginx/ssl; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout nginx/ssl/selfsigned.key \
			-out nginx/ssl/selfsigned.crt \
			-subj "/C=ES/ST=Madrid/L=Madrid/O=ft_transcendence/CN=localhost" \
			2>/dev/null; \
		printf "$(GREEN)SSL certificate generated$(RESET)\n"; \
	fi

# ── Docker Compose ─────────────────────────────────────────────────
build:
	@printf "$(BLUE)Building images...$(RESET)\n"
	docker compose build

up:
	@printf "$(GREEN)Starting $(NAME)...$(RESET)\n"
	docker compose up -d

down:
	@printf "$(RED)Stopping $(NAME)...$(RESET)\n"
	docker compose down

restart: down up

# ── Logs ───────────────────────────────────────────────────────────
logs:
	docker compose logs -f

logs-nginx:
	docker compose logs -f nginx

logs-app:
	docker compose logs -f fullstack

logs-db:
	docker compose logs -f db

logs-redis:
	docker compose logs -f redis

logs-directus:
	docker compose logs -f directus

# ── Cleanup ────────────────────────────────────────────────────────
clean: down
	@printf "$(RED)Removing volumes...$(RESET)\n"
	docker compose down -v

fclean: clean
	@printf "$(RED)Removing images...$(RESET)\n"
	docker rmi -f $$(docker images -q $(NAME)-* 2>/dev/null) 2>/dev/null || true
	docker system prune -f

re: fclean all

# ── Status ─────────────────────────────────────────────────────────
status:
	docker compose ps

# ── Development utilities ──────────────────────────────────────────
shell-app:
	docker compose exec fullstack sh

shell-db:
	docker compose exec db psql -U $${POSTGRES_USER:-transcendence_dev} -d $${POSTGRES_DB:-transcendence_dev}

shell-redis:
	docker compose exec redis redis-cli

shell-directus:
	docker compose exec directus sh

# Prisma database migrations
prisma-migrate:
	docker compose exec fullstack npx prisma migrate dev

prisma-studio:
	@printf "$(YELLOW)Prisma Studio at http://localhost:5555$(RESET)\n"
	docker compose exec fullstack npx prisma studio

# ── Help ───────────────────────────────────────────────────────────
help:
	@printf "$(BLUE)═══ ft_transcendence — Commands ═══$(RESET)\n"
	@printf "  $(GREEN)make all$(RESET)             First-time setup: deps → SSL → build → up\n"
	@printf "  $(GREEN)make setup$(RESET)           Create .env + generate SSL certs\n"
	@printf "  $(GREEN)make up$(RESET)              Start all services\n"
	@printf "  $(GREEN)make down$(RESET)            Stop all services\n"
	@printf "  $(GREEN)make restart$(RESET)         Restart all services\n"
	@printf "  $(GREEN)make clean$(RESET)           Stop + remove volumes (wipes DB)\n"
	@printf "  $(GREEN)make re$(RESET)              Full rebuild from scratch\n"
	@printf "  $(BLUE)make logs$(RESET)            All service logs\n"
	@printf "  $(BLUE)make logs-app$(RESET)         Fullstack (Nuxt) logs\n"
	@printf "  $(BLUE)make logs-nginx$(RESET)       Nginx logs\n"
	@printf "  $(BLUE)make logs-directus$(RESET)    Directus CMS logs\n"
	@printf "  $(YELLOW)make shell-app$(RESET)       Shell in fullstack container\n"
	@printf "  $(YELLOW)make shell-db$(RESET)        PostgreSQL psql\n"
	@printf "  $(YELLOW)make shell-directus$(RESET)  Shell in Directus container\n"
	@printf "  $(YELLOW)make prisma-migrate$(RESET)  Run Prisma migrations\n"
	@printf "  $(YELLOW)make prisma-studio$(RESET)   Prisma Studio (localhost:5555)\n"
	@printf "  $(YELLOW)make status$(RESET)          Show running containers\n"

.PHONY: all deps setup build up down restart \
        logs logs-nginx logs-app logs-db logs-redis logs-directus \
        clean fclean re status help \
        shell-app shell-db shell-redis shell-directus \
        prisma-migrate prisma-studio
