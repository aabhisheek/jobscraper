---
name: security-check
description: Security audit patterns for TypeScript/Node.js — OWASP checks, secret scanning, pnpm audit, Playwright session safety
---

# Security Check Skill

## Secret Scanning Patterns

Grep for these patterns in `src/` and `tests/`:
```
password\s*[:=]
api[_-]?key\s*[:=]
secret\s*[:=]
token\s*[:=]
PRIVATE[_-]KEY
Bearer\s+[A-Za-z0-9]
-----BEGIN.*PRIVATE KEY-----
```

Check these files are in `.gitignore`:
- `.env`, `.env.local`, `.env.production`
- `profile/profile.json` (contains real personal data)
- `resume/*.pdf`

## Dependency Audit
```bash
pnpm audit
pnpm audit --fix  # only if safe
```
Check for: high/critical vulnerabilities, outdated packages with known CVEs, unnecessary dependencies.

## OWASP Patterns for Node.js/TypeScript

### Injection
- [ ] No `eval()`, `new Function()`, `vm.runInContext()` with user input
- [ ] No template literal interpolation in Playwright selectors: `page.locator(\`${userInput}\`)` — use parameterized selectors
- [ ] No raw SQL — all queries through Prisma (parameterized by default)
- [ ] No `child_process.exec()` with string interpolation — use `execFile()` with args array

### Authentication / Session
- [ ] Playwright browser contexts are isolated per apply session
- [ ] Cookies and storage are cleared between sessions: `context.clearCookies()`
- [ ] No session tokens stored in plaintext files
- [ ] API endpoints (if dashboard exists) use authentication middleware

### Data Exposure
- [ ] Personal data (name, email, phone) is never logged by Pino — use `redact` option:
  ```typescript
  pino({ redact: ['email', 'phone', 'name', 'profile.email'] })
  ```
- [ ] Error responses do not include stack traces in production
- [ ] Database connection strings are in `.env`, not in source code
- [ ] Resume PDFs are not served by the API without auth

### Rate Limiting
- [ ] BullMQ rate limiter is configured: `limiter: { max: 1, duration: 30000 }`
- [ ] No code path bypasses the queue to apply directly
- [ ] Scraper respects `robots.txt` (check with `robotsparser` package)
- [ ] Maximum daily application count is enforced at the queue level

### Supply Chain
- [ ] `pnpm-lock.yaml` is committed — deterministic installs
- [ ] No `postinstall` scripts from unknown packages
- [ ] Playwright browser is downloaded from official CDN only
- [ ] No wildcard version ranges (`*`) in package.json

## Output
Report findings as:
```
[SEVERITY] Pattern — file:line — description — fix
```
