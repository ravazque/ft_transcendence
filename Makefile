NAME = ft_transcendence

# Colors
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
BLUE = \033[0;34m
RESET = \033[0m

all: deps setup build up

# Check and install system dependencies (docker, docker compose, openssl)
deps:
	@printf "$(BLUE)Checking system dependencies...$(RESET)\n"
	@missing=""; \
	command -v docker >/dev/null 2>&1 || missing="$$missing docker"; \
	command -v openssl >/dev/null 2>&1 || missing="$$missing openssl"; \
	if command -v docker >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then \
		missing="$$missing docker-compose-plugin"; \
	fi; \
	if [ -z "$$missing" ]; then \
		printf "$(GREEN)All dependencies are installed$(RESET)\n"; \
	else \
		printf "$(YELLOW)Missing:$$missing$(RESET)\n"; \
		if [ -f /etc/os-release ]; then \
			. /etc/os-release; \
			case "$$ID" in \
				ubuntu|debian|linuxmint) \
					printf "$(YELLOW)Installing via apt ($$ID)...$(RESET)\n"; \
					sudo apt-get update -qq && \
					sudo apt-get install -y docker.io docker-compose-v2 openssl;; \
				arch|endeavouros|cachyos|manjaro|garuda) \
					printf "$(YELLOW)Installing via pacman ($$ID)...$(RESET)\n"; \
					sudo pacman -Sy --needed --noconfirm docker docker-compose openssl;; \
				*) \
					printf "$(RED)Distribution not supported: $$ID$(RESET)\n"; \
					printf "$(RED)Install manually:$$missing$(RESET)\n"; \
					exit 1;; \
			esac; \
		else \
			printf "$(RED)Cannot detect OS. Install manually:$$missing$(RESET)\n"; \
			exit 1; \
		fi; \
		printf "$(GREEN)Dependencies installed$(RESET)\n"; \
	fi
	@if ! docker info >/dev/null 2>&1; then \
		printf "$(YELLOW)Starting Docker daemon...$(RESET)\n"; \
		sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null || true; \
		sleep 2; \
		if ! docker info >/dev/null 2>&1; then \
			printf "$(RED)Docker daemon is not running. Start it manually.$(RESET)\n"; \
			exit 1; \
		fi; \
		printf "$(GREEN)Docker daemon started$(RESET)\n"; \
	fi

setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		printf "$(YELLOW).env created from .env.example — edit it with your values$(RESET)\n"; \
	fi
	@if [ ! -f nginx/ssl/selfsigned.crt ]; then \
		printf "$(YELLOW)Generating self-signed SSL certificate...$(RESET)\n"; \
		mkdir -p nginx/ssl; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout nginx/ssl/selfsigned.key \
			-out nginx/ssl/selfsigned.crt \
			-subj "/C=ES/ST=Madrid/L=Madrid/O=42/CN=localhost"; \
		printf "$(GREEN)SSL certificate generated$(RESET)\n"; \
	fi

build:
	@printf "$(GREEN)Building containers...$(RESET)\n"
	docker compose build

up:
	@printf "$(GREEN)Starting $(NAME)...$(RESET)\n"
	docker compose up -d

down:
	@printf "$(RED)Stopping $(NAME)...$(RESET)\n"
	docker compose down

restart: down up

logs:
	docker compose logs -f

logs-front:
	docker compose logs -f frontend

logs-back:
	docker compose logs -f backend

logs-db:
	docker compose logs -f db

clean: down
	@printf "$(RED)Removing volumes...$(RESET)\n"
	docker compose down -v

fclean: clean
	@printf "$(RED)Removing all images...$(RESET)\n"
	docker rmi -f $$(docker images -q $(NAME)-* 2>/dev/null) 2>/dev/null || true
	docker system prune -f

re: fclean all

status:
	docker compose ps

.PHONY: all deps setup build up down restart logs logs-front logs-back logs-db clean fclean re status
