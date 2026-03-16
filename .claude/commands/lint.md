Run ESLint and Prettier with auto-fix on the codebase.

1. pnpm exec eslint . --fix --max-warnings 0
2. pnpm exec prettier --write .

If ESLint reports errors that cannot be auto-fixed, list each error with file:line and suggest the manual fix.
