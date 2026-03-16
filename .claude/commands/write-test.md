Generate tests for the specified file or function.

Target: $ARGUMENTS (file path or function name).

1. Read the target source file completely.
2. Delegate to the test-writer agent with the source code.
3. The agent produces a test plan, then implements it using Vitest.
4. Run pnpm exec vitest run to confirm all new tests pass.
5. Run pnpm exec vitest run --coverage to report coverage for the tested module.
