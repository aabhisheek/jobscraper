Run a security audit on the codebase.

1. Delegate to the security-analyst agent.
2. Run pnpm audit for dependency vulnerabilities.
3. Scan for: hardcoded secrets, credential exposure, Playwright session leaks, input validation gaps, rate limit bypasses.
4. Report findings by severity: CRITICAL, HIGH, MEDIUM, LOW.
