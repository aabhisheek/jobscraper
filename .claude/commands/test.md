Run the test suite using Vitest. Narrowest scope: if a file path is provided, test only that file. Otherwise run all tests.

If argument is a file path:
  pnpm exec vitest run $ARGUMENTS
Else:
  pnpm exec vitest run

Report: total passed, failed, duration. If any fail, show the failure message and file:line.
