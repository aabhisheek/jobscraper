---
name: code-review
description: Full code review protocol — correctness, types, errors, tests, security, performance, style
---

# Code Review Skill

## Review Protocol

### Step 1 — Understand the Change
- Read the diff or changed files completely.
- Identify: what was the intent? What behavior changed?
- Check: does the commit message match what was actually changed?

### Step 2 — Correctness
- Trace the happy path. Does it produce the expected output?
- Trace every error path. Are all `Result.err()` cases handled?
- Check boundary conditions: empty arrays, null/undefined, zero, negative numbers.
- Check async correctness: every `await` is present, no floating promises.
- Check Playwright flows: every `page.fill()` has a preceding `waitForSelector()`.

### Step 3 — Type Safety
- No `any` types. No `as` casts without justification.
- Function parameters and returns are explicitly typed.
- Prisma types are used directly — no manual type redefinition.
- Discriminated unions for state machines (job status, apply status, error types).
- `readonly` on data structures that should not be mutated.

### Step 4 — Error Handling
- `Result<T, E>` for business logic. No thrown exceptions except at system boundaries.
- Error types include context (which scraper, which URL, which step).
- No empty catch blocks. No `catch (e: any)`.
- Playwright timeouts have explicit error handling.

### Step 5 — Tests
- New logic has tests. New error paths have tests.
- Tests are in the right directory (unit vs integration).
- Test names describe behavior, not implementation.
- Run `pnpm exec vitest run` — all pass.

### Step 6 — Security
- No hardcoded secrets or personal data.
- No `eval()`, template injection, or raw SQL.
- Playwright sessions are isolated and cleaned up.
- Rate limiting is not bypassed.

### Step 7 — Performance
- No event loop blocking in hot paths.
- Playwright pages are closed.
- Database queries use indexes.
- No N+1 queries.

### Step 8 — Style
- `pnpm exec eslint . --max-warnings 0` passes.
- `pnpm exec prettier --check .` passes.
- No console.log — use Pino.
- No commented-out code.

## Verdict
- **Approve**: no blockers, no majors.
- **Request changes**: any blocker or 3+ majors.
