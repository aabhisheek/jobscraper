Pre-ship quality gate. Run all checks before merging or deploying.

1. pnpm exec vitest run — all tests must pass.
2. pnpm exec eslint . --max-warnings 0 — zero lint errors.
3. pnpm exec prettier --check . — formatting is clean.
4. pnpm exec tsc --noEmit — type checking passes.
5. pnpm audit — no high/critical vulnerabilities.
6. git status — no uncommitted changes.
7. Report: PASS or FAIL with details on any failing step. Do not proceed if any step fails.
