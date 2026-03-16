Run a code review on changed files.

1. Run git diff --name-only to find changed files. If $ARGUMENTS is a file path, review only that file.
2. Delegate to the reviewer agent with the list of changed files.
3. Report findings grouped by severity: BLOCKER, MAJOR, MINOR, NIT.
4. Run pnpm exec vitest run and pnpm exec eslint . --max-warnings 0 as part of the review.
