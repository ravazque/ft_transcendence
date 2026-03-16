NAME = ft_transcendence

# Colors
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
RESET = \033[0m

all: setup build up

setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(YELLOW).env file created from .env.example - edit it with your values$(RESET)"; \
	fi
	@if [ ! -f nginx/ssl/selfsigned.crt ]; then \
		echo "$(YELLOW)Generating self-signed SSL certificate...$(RESET)"; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout nginx/ssl/selfsigned.key \
			-out nginx/ssl/selfsigned.crt \
			-subj "/C=ES/ST=Madrid/L=Madrid/O=42/CN=localhost"; \
		echo "$(GREEN)SSL certificate generated$(RESET)"; \
	fi

build:
	@echo "$(GREEN)Building containers...$(RESET)"
	docker compose build

up:
	@echo "$(GREEN)Starting $(NAME)...$(RESET)"
	docker compose up -d

down:
	@echo "$(RED)Stopping $(NAME)...$(RESET)"
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
	@echo "$(RED)Removing volumes...$(RESET)"
	docker compose down -v

fclean: clean
	@echo "$(RED)Removing all images...$(RESET)"
	docker rmi -f $$(docker images -q $(NAME)-* 2>/dev/null) 2>/dev/null || true
	docker system prune -f

re: fclean all

status:
	docker compose ps

.PHONY: all setup build up down restart logs logs-front logs-back logs-db clean fclean re status
