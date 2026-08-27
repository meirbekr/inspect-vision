ifeq ($(OS),Windows_NT)
	PYTHON = .venv\Scripts\python
	COPY_ENV = if not exist .env copy .env.example .env
	SYS_PYTHON = python
else
	PYTHON = .venv/bin/python
	COPY_ENV = cp -n .env.example .env 2>/dev/null || true
	SYS_PYTHON = $(shell command -v /opt/homebrew/bin/python3 || command -v python3.14 || command -v python3.13 || command -v python3.12 || command -v python3.11 || command -v python3.10 || command -v python3 || echo python)
endif

.PHONY: install run dev-backend dev-frontend

install:
	rm -rf .venv
	$(SYS_PYTHON) -m venv --without-pip .venv || $(SYS_PYTHON) -m venv .venv
	@if [ -d ".venv/lib" ]; then \
		for d in .venv/lib/python3.*; do \
			if [ -d "$$d/site-packages" ]; then \
				echo "import sys, types, platform; sys.modules['xml.parsers.expat'] = types.ModuleType('expat'); platform.mac_ver = lambda: ('14.5.0', ('', '', ''), 'arm64')" > "$$d/site-packages/fix_env.pth"; \
			fi; \
		done; \
	fi
	$(PYTHON) -m ensurepip || true
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -r requirements.txt
	$(COPY_ENV)
	npm --prefix frontend install

run:
	npx -y concurrently -k -n "BACKEND,FRONTEND" -c "blue,magenta" "make dev-backend" "make dev-frontend"

dev-backend:
	$(PYTHON) -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	npm --prefix frontend run dev