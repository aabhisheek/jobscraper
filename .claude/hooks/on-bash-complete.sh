#!/usr/bin/env bash
set -euo pipefail

TOOL_INPUT="${1:-}"
TOOL_OUTPUT="${2:-}"
EXIT_CODE="${3:-0}"

# Only process failures
if [ "$EXIT_CODE" = "0" ]; then
  exit 0
fi

# TypeScript compilation errors
if echo "$TOOL_OUTPUT" | grep -q "error TS"; then
  echo "[hint] TypeScript compilation failed. Check the error codes:"
  echo "  - TS2304: Cannot find name → missing import or typo"
  echo "  - TS2345: Argument type mismatch → check function signature"
  echo "  - TS2322: Type not assignable → check the expected type"
  echo "  - TS7006: Parameter has implicit 'any' → add explicit type annotation"
  exit 0
fi

# Vitest failures
if echo "$TOOL_OUTPUT" | grep -q "FAIL.*\.test\.ts"; then
  echo "[hint] Test failed. Read the assertion error carefully."
  echo "  - Expected vs Received: check test data matches implementation"
  echo "  - Timeout: async operation not resolving — check mocks or await"
  echo "  - Run single test: pnpm exec vitest run <path-to-test>"
  exit 0
fi

# ESLint errors
if echo "$TOOL_OUTPUT" | grep -q "eslint"; then
  echo "[hint] ESLint errors found."
  echo "  - Auto-fix: pnpm exec eslint . --fix"
  echo "  - Common issues: unused vars, missing return types, any usage"
  exit 0
fi

# Prisma errors
if echo "$TOOL_OUTPUT" | grep -q "prisma"; then
  echo "[hint] Prisma error."
  echo "  - P2002: Unique constraint violation → check upsert logic"
  echo "  - P2025: Record not found → check findUniqueOrThrow usage"
  echo "  - Migration: run 'pnpm exec prisma migrate dev'"
  echo "  - Client outdated: run 'pnpm exec prisma generate'"
  exit 0
fi

# Playwright errors
if echo "$TOOL_OUTPUT" | grep -q "playwright\|TimeoutError\|page\."; then
  echo "[hint] Playwright error."
  echo "  - TimeoutError: selector not found or page did not load"
  echo "  - Navigation: check URL is valid and site is accessible"
  echo "  - Selectors: verify with 'pnpm exec playwright codegen <url>'"
  exit 0
fi

# pnpm errors
if echo "$TOOL_OUTPUT" | grep -q "ERR_PNPM"; then
  echo "[hint] pnpm error."
  echo "  - Missing dependency: pnpm add <package>"
  echo "  - Lockfile conflict: rm pnpm-lock.yaml && pnpm install"
  echo "  - Peer dependency: pnpm add -D <peer-package>"
  exit 0
fi
