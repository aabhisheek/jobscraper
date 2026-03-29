#!/usr/bin/env bash
set -euo pipefail

echo "==> Starting infrastructure (PostgreSQL + Redis)..."
docker compose up -d

echo "==> Installing pnpm..."
npm install -g pnpm@9

echo "==> Installing dependencies..."
pnpm install

echo "==> Copying .env.example to .env..."
if [ ! -f .env ]; then
  cp .env.example .env
fi

echo "==> Installing Playwright Chromium..."
pnpm exec playwright install chromium --with-deps

echo "==> Generating Prisma client..."
pnpm exec prisma generate

echo "==> Waiting for PostgreSQL to be ready..."
until docker exec jobpilot-postgres pg_isready -U jobpilot > /dev/null 2>&1; do
  sleep 1
done

echo "==> Running database migrations..."
pnpm exec prisma migrate deploy

echo ""
echo "JobPilot is ready!"
echo "  Run the app:   pnpm dev"
echo "  Run tests:     pnpm test"
echo "  DB studio:     pnpm db:studio"
