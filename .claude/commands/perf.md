Run a performance scan on the codebase or a specific module.

Target: $ARGUMENTS (file path, module name, or "all").

1. Delegate to the performance-analyst agent with the target.
2. Check: event loop blocking, memory leaks, slow queries, Playwright resource waste, queue config.
3. Report findings with impact level (high/medium/low), current behavior, and proposed fix.
