#!/usr/bin/env bash
set -euo pipefail

TITLE="${1:-}"
BODY="${2:-}"

# Permission denied hints
if echo "$BODY" | grep -qi "permission\|denied\|not allowed"; then
  echo "[hint] Permission issue detected."
  echo "  - If file permission: check file ownership and chmod"
  echo "  - If tool permission: the user may need to approve this action"
  echo "  - If git permission: check SSH keys or token auth"
  exit 0
fi

# Rate limit / API limit hints
if echo "$BODY" | grep -qi "rate.limit\|too many\|429\|throttl"; then
  echo "[hint] Rate limit hit."
  echo "  - Wait before retrying — exponential backoff recommended"
  echo "  - Check BullMQ rate limiter configuration"
  echo "  - For scraping: increase delay between requests"
  exit 0
fi

# Out of memory
if echo "$BODY" | grep -qi "out of memory\|heap\|ENOMEM"; then
  echo "[hint] Memory issue."
  echo "  - Increase Node heap: NODE_OPTIONS='--max-old-space-size=4096'"
  echo "  - Check for memory leaks: unclosed Playwright pages, unbounded arrays"
  echo "  - Check Redis memory: redis-cli info memory"
  exit 0
fi

# Connection errors
if echo "$BODY" | grep -qi "ECONNREFUSED\|ECONNRESET\|ETIMEDOUT"; then
  echo "[hint] Connection error."
  echo "  - PostgreSQL: check docker compose up -d postgres"
  echo "  - Redis: check docker compose up -d redis"
  echo "  - External site: may be down or blocking requests"
  exit 0
fi

# Context window / token limit
if echo "$BODY" | grep -qi "context\|token.*limit\|truncat"; then
  echo "[hint] Context limit approaching."
  echo "  - Consider breaking the task into smaller subtasks"
  echo "  - Use agents to parallelize independent work"
  echo "  - Focus on the most critical files only"
  exit 0
fi
