#!/usr/bin/env bash
set -euo pipefail

echo "[pre-commit] Running Vitest..."
pnpm exec vitest run --reporter=verbose 2>&1

if [ $? -ne 0 ]; then
  echo "[pre-commit] BLOCKED: Tests failed. Fix failing tests before committing."
  exit 1
fi

echo "[pre-commit] Running ESLint..."
pnpm exec eslint . --max-warnings 0 2>&1

if [ $? -ne 0 ]; then
  echo "[pre-commit] BLOCKED: Lint errors found. Run 'pnpm exec eslint . --fix' to auto-fix."
  exit 1
fi

echo "[pre-commit] Running Prettier check..."
pnpm exec prettier --check . 2>&1

if [ $? -ne 0 ]; then
  echo "[pre-commit] BLOCKED: Formatting issues. Run 'pnpm exec prettier --write .' to fix."
  exit 1
fi

echo "[pre-commit] All checks passed."
