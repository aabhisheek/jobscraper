Perform a safe refactoring operation.

1. Ask the user what type: extract, rename, restructure, simplify, or type-tighten.
2. Run pnpm exec vitest run to confirm tests pass before starting.
3. Delegate to the refactorer agent with the refactoring type and target files.
4. Verify tests pass after each step. Report all changes made.
