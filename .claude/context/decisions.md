# Architecture Decision Records

## ADR Template

```
### ADR-NNN: [Title]
**Status:** Accepted | Superseded | Deprecated
**Date:** YYYY-MM-DD
**Context:** What is the problem?
**Decision:** What did we decide?
**Alternatives considered:** What else was evaluated?
**Consequences:** What are the tradeoffs?
```

---

### ADR-001: TypeScript over Python for the entire stack

**Status:** Accepted
**Date:** 2026-03-16

**Context:** JobPilot is a pipeline system with four major components: web scrapers (Playwright), a job queue (BullMQ), a database layer (Prisma), and an optional dashboard API (Fastify). The primary developer has Node.js backend experience. The system needs strong typing to manage the complexity of normalizing data from 5+ different job board formats and automating form submissions across multiple platforms.

**Decision:** Use TypeScript 5.7 on Node.js 22 LTS for all components.

**Alternatives considered:**
- **Python**: Stronger scraping ecosystem (Scrapy, BeautifulSoup), but Playwright is equally good in both ecosystems. Python's type system (mypy/pyright) is bolt-on and weaker than TypeScript's structural type system. Would require a separate tool for the queue (Celery + Redis) and a separate web framework (FastAPI), fragmenting the ecosystem.
- **Go**: Excellent performance and concurrency. But Playwright support is unofficial (playwright-go). No equivalent to Prisma. Would require more boilerplate for JSON parsing and type conversions. Overkill for a solo developer building a pipeline.

**Consequences:** Single language across all components. TypeScript's type system catches data shape mismatches at compile time (critical when normalizing job data from 5+ sources). The entire BullMQ + Prisma + Fastify + Playwright ecosystem is TypeScript-native. Tradeoff: Node.js single-threaded model means CPU-heavy regex parsing of job descriptions can block the event loop — mitigated by using worker threads or keeping regex simple.

---

### ADR-002: PostgreSQL over MongoDB for job storage

**Status:** Accepted
**Date:** 2026-03-16

**Context:** JobPilot stores jobs, applications, and companies. Jobs have a fixed schema (title, company, location, skills, apply link, source, status). Applications reference jobs via foreign key. Companies have career page URLs and tech stacks. The system needs full-text search on job descriptions and reliable tracking of application status transitions.

**Decision:** Use PostgreSQL 16 with Prisma 6 ORM and Prisma Migrate.

**Alternatives considered:**
- **MongoDB**: Flexible schema is unnecessary — job data has a well-defined structure. No foreign key enforcement — application→job references could become orphaned. Full-text search requires Atlas Search (paid) or manual indexing. Prisma supports MongoDB but the experience is weaker than PostgreSQL.
- **SQLite**: Simpler to deploy (no server). But no concurrent write support — problematic when multiple scrapers and the apply worker write simultaneously. No built-in full-text search with ranking (FTS5 exists but is limited). No connection pooling.

**Consequences:** PostgreSQL provides ACID transactions for application status updates (critical: marking a job as "applied" and creating an application record must be atomic). Full-text search via `tsvector` enables searching job descriptions by keywords without an external search service. Prisma generates type-safe queries from the schema, eliminating SQL injection and type mismatches. Tradeoff: requires a running PostgreSQL server (solved by Docker Compose).

---

### ADR-003: BullMQ over custom cron scheduling for the apply pipeline

**Status:** Accepted
**Date:** 2026-03-16

**Context:** The auto-apply pipeline must process jobs at a controlled rate (maximum 1 application per 30 seconds) to avoid detection and bans. Failed applications must be retried with exponential backoff. The system must not lose queued jobs if the process restarts. The daily application count must be capped.

**Decision:** Use BullMQ 5 with Redis 7 as the job queue for the apply pipeline.

**Alternatives considered:**
- **node-cron + custom logic**: Simple to set up. But no built-in rate limiting — must implement from scratch. No persistence — queued jobs are lost on restart. No backoff — must implement retry logic. No monitoring — must build a dashboard from scratch.
- **Agenda (MongoDB-backed queue)**: Adds MongoDB as a dependency (we chose PostgreSQL). Fewer features than BullMQ. Smaller community and slower updates.
- **AWS SQS**: Overkill for a solo developer project. Adds cloud dependency. Rate limiting must be implemented at the consumer level.

**Consequences:** BullMQ provides: rate limiting (`limiter: { max: 1, duration: 30000 }`), exponential backoff on failure, Redis-backed persistence (jobs survive restarts), stalled job detection, and a monitoring dashboard (Bull Board). The apply worker is a BullMQ worker that processes one job at a time. Tradeoff: requires a running Redis server (solved by Docker Compose).

---

### ADR-004: Feature-grouped project structure over layer-grouped

**Status:** Accepted
**Date:** 2026-03-16

**Context:** The project has clear functional domains: scrapers (one per job board), apply bots (one per platform), a parser/normalizer, a ranker, a queue system, a database layer, and an API. Code in each domain changes together — when Greenhouse changes their HTML, only the Greenhouse scraper and its tests change.

**Decision:** Group code by feature/domain (`src/scrapers/`, `src/apply/`, `src/ranker/`, `src/queue/`) rather than by layer (`src/controllers/`, `src/services/`, `src/models/`).

**Alternatives considered:**
- **Layer-grouped** (`controllers/`, `services/`, `models/`): Standard for web apps but poor for pipeline systems. Adding a new job board would touch every layer directory. Changes are scattered across the codebase instead of isolated to one directory.
- **Monorepo with packages** (`packages/scraper`, `packages/applier`): Overkill for a solo developer. Adds package management overhead (workspace config, cross-package linking). The codebase is not large enough to justify the separation.

**Consequences:** Each domain is a self-contained directory. Adding a new scraper means adding one file in `src/scrapers/` and one test file. The `src/common/` directory holds truly shared code (types, errors, config, logger). Dependencies between domains are explicit imports, visible in the dependency graph. Tradeoff: shared types must be carefully managed in `src/common/types.ts` to avoid circular dependencies.

---

### ADR-005: neverthrow Result pattern over try/catch for error handling

**Status:** Accepted
**Date:** 2026-03-16

**Context:** JobPilot has many failure modes: scrapers fail when HTML changes, apply bots fail when forms change, network requests time out, databases reject duplicates. In a pipeline system, most failures should be handled gracefully (log, skip, retry) rather than crashing. TypeScript's `try/catch` does not encode error types in function signatures — callers cannot know what errors a function produces without reading the implementation.

**Decision:** Use neverthrow's `Result<T, E>` type for all business logic error handling. Reserve thrown exceptions for programmer errors and truly unrecoverable situations.

**Alternatives considered:**
- **Standard try/catch**: No type-level error information. Easy to forget to catch. Easy to catch too broadly (`catch (e: any)`). Encourages swallowing errors. The default for most TypeScript projects but poorly suited for pipelines with many failure modes.
- **fp-ts Either**: More powerful (full functional programming toolkit) but heavier learning curve. Overkill when all we need is Result<T, E>. neverthrow is simpler and has better ergonomics for imperative-style TypeScript.
- **Custom Result type**: Reinventing the wheel. neverthrow is well-tested, well-typed, and well-documented.

**Consequences:** Every function that can fail returns `Result<T, E>`. Callers must check `.isOk()` or `.isErr()` before accessing the value — the compiler enforces this. Error types are visible in function signatures. Scraper code becomes a chain of Result operations that short-circuit on the first error. Tradeoff: slightly more verbose than try/catch for simple operations. Team members must learn the Result pattern. But the explicitness prevents the silent error swallowing that plagues scraper projects.
