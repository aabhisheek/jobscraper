---
name: perf-check
description: Node.js and TypeScript hot-path performance checklist — event loop, memory, Playwright, PostgreSQL, Redis
---

# Performance Check Skill

## Node.js Hot-Path Checklist

### Event Loop Blocking
- [ ] No `fs.readFileSync()` — use `fs.promises.readFile()`
- [ ] No `JSON.parse()` on strings > 1MB in the main thread — use streaming parser or worker thread
- [ ] No `crypto.pbkdf2Sync()` — use `crypto.pbkdf2()` (async)
- [ ] No CPU-bound loops processing > 10,000 items without yielding (`setImmediate`)
- [ ] Regex patterns on job descriptions are pre-compiled outside the loop with `new RegExp()`
- [ ] No `Array.prototype.sort()` on arrays > 10,000 items without benchmarking the comparator

### Memory Leaks (Node.js Specific)
- [ ] Closures in event handlers do not capture large objects (Playwright pages, DOM snapshots)
- [ ] `setInterval` / `setTimeout` are cleared when no longer needed
- [ ] Streams are properly consumed or destroyed — no hanging readable streams
- [ ] BullMQ `removeOnComplete: { count: 100 }` and `removeOnFail: { count: 500 }` are set
- [ ] No unbounded `Map` or `Set` used as caches — use LRU with max size

### Playwright Specific
- [ ] Single `Browser` instance, multiple `BrowserContext` instances (one per session)
- [ ] `context.close()` called in `finally` — even on error
- [ ] Images/CSS/fonts blocked for scraping: `page.route('**/*.{png,jpg,gif,css,woff}', r => r.abort())`
- [ ] `page.waitForLoadState('networkidle')` preferred over `page.waitForTimeout()`
- [ ] Screenshots taken only on failure, not every step
- [ ] No `page.waitForTimeout()` with values > 5000ms — use `waitForSelector` or `waitForLoadState`

### PostgreSQL via Prisma
- [ ] Bulk operations use `createMany()` or `$transaction()`, not loops of `create()`
- [ ] Queries filter on indexed columns (check `@@index` in schema.prisma)
- [ ] Full-text search uses `@db.TsVector` index, not `contains` string filter
- [ ] Pagination is cursor-based (`where: { id: { gt: cursor } }`) not offset-based (`skip`)
- [ ] `select` is used to fetch only needed columns for large tables
- [ ] Connection pool size matches concurrency (`connection_limit` param in DATABASE_URL)

### Redis via ioredis
- [ ] Single connection pool shared across the application — not per-operation connections
- [ ] `SCAN` used instead of `KEYS` for iteration (KEYS blocks Redis)
- [ ] TTL set on all cache keys — no unbounded cache growth
- [ ] Pipeline used for multiple sequential commands (`redis.pipeline()`)

### General
- [ ] `Promise.all()` used for independent async operations instead of sequential `await`
- [ ] Pino uses async transport in production (`pino.transport({ target: 'pino/file' })`)
- [ ] HTTP keep-alive enabled for repeated requests to same host
- [ ] Error objects include context but not full stack traces in production logs
