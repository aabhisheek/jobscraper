# JobPilot

JobPilot is an automated job scraping and application pipeline that collects job listings from multiple platforms (Greenhouse, Lever, LinkedIn, Wellfound, Naukri), normalizes and stores them in PostgreSQL, ranks them against a candidate profile using configurable scoring rules, and auto-applies via Playwright browser automation with rate limiting and anti-detection. Built for a solo developer who wants to apply to hundreds of relevant jobs per day without manual effort.

## Tech Stack

| Layer               | Technology              | Version | Chosen because                                                                                   |
| ------------------- | ----------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| Language            | TypeScript              | 5.7     | Type safety for complex pipeline logic; Node.js ecosystem has best scraping/automation libraries |
| Runtime             | Node.js                 | 22 LTS  | Long-term support, native fetch, stable worker threads for scrapers                              |
| API Framework       | Fastify                 | 5       | Fastest Node HTTP framework, async-first, schema validation built in                             |
| Queue               | BullMQ                  | 5       | Redis-backed job queue with rate limiting, retries, backoff — purpose-built for this pipeline    |
| Cache/Queue Backend | Redis                   | 7       | Required by BullMQ; also used for scraper deduplication and rate limit state                     |
| Database            | PostgreSQL              | 16      | Relational model fits jobs→applications→companies; full-text search for job descriptions         |
| ORM                 | Prisma                  | 6       | Type-safe queries generated from schema; migration system built in                               |
| Migrations          | Prisma Migrate          | 6       | Integrated with Prisma ORM; generates SQL from schema diffs                                      |
| Scraping            | Playwright              | 1.50    | Handles JS-rendered pages, stealth mode, form automation — all in one tool                       |
| Test Runner         | Vitest                  | 3       | TypeScript-native, fast, compatible with Node APIs, built-in mocking                             |
| Assertions          | Vitest built-in         | 3       | expect/assert included, no extra dependency needed                                               |
| Mocking             | Vitest built-in         | 3       | vi.mock, vi.spyOn — integrated with the runner                                                   |
| Linter              | ESLint                  | 9       | Flat config, strict TypeScript rules via typescript-eslint                                       |
| Formatter           | Prettier                | 3       | Industry standard, zero-config opinionated formatting                                            |
| Logging             | Pino                    | 9       | Fastest structured JSON logger for Node; async transport support                                 |
| Metrics             | prom-client             | 15      | Standard Prometheus client; track scrape rates, apply rates, error rates                         |
| Tracing             | @opentelemetry/sdk-node | 1.x     | Industry standard distributed tracing; trace requests across pipeline stages                     |
| Error Handling      | neverthrow              | 8       | Typed Result<T, E> pattern — no thrown exceptions in business logic                              |
| CI                  | GitHub Actions          | —       | Free for public repos, YAML workflows, good Action marketplace                                   |
| Deployment          | Docker Compose          | —       | Self-hosted; bundles Node app + PostgreSQL + Redis in one command                                |
| Package Manager     | pnpm                    | 9       | Strict dependency resolution, fast installs, disk-efficient                                      |

## Project Structure

```
jobpilot/
├── src/
│   ├── scrapers/           # One file per job board (greenhouse.ts, lever.ts, linkedin.ts, etc.)
│   ├── parser/             # Job normalization and field extraction
│   ├── ranker/             # Job scoring engine with configurable rules
│   ├── apply/              # Auto-apply bots per platform (applyGreenhouse.ts, applyLever.ts, etc.)
│   ├── queue/              # BullMQ queue definitions, workers, rate limiting
│   ├── database/           # Prisma client, repository layer, queries
│   ├── api/                # Fastify routes for dashboard API
│   ├── safety/             # Anti-detection: delays, mouse movement, typing simulation
│   ├── common/             # Shared types, errors, config loader, logger setup
│   └── index.ts            # Main entry point — starts workers and API server
├── tests/
│   ├── unit/               # Pure logic tests (ranker, parser, normalizer)
│   ├── integration/        # Tests hitting real DB and Redis
│   └── fixtures/           # Sample job HTML, mock API responses
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Generated migration SQL
├── config/
│   └── default.ts          # Environment-based config (dotenv + typed config)
├── profile/
│   └── profile.json        # Candidate data (name, email, phone, links, resume path)
├── resume/
│   └── .gitkeep            # Resume PDF goes here (gitignored)
├── scripts/
│   ├── seed.ts             # Seed database with test data
│   └── scrape-once.ts      # One-shot scraper for testing
├── docs/
│   └── architecture.md     # System architecture overview
├── .claude/                # Claude Code configuration (agents, commands, skills, hooks)
├── .github/workflows/
│   └── ci.yml              # Lint → Test → Build pipeline
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── eslint.config.mjs
├── .prettierrc
├── vitest.config.ts
├── .env.example
├── .gitignore
├── .claudeignore
├── docker-compose.yml
├── Dockerfile
├── CLAUDE.md
├── README.md
└── CHANGELOG.md
```

## Commands

```bash
# === Project Setup (run once) ===
pnpm init
pnpm add fastify @fastify/cors bullmq ioredis playwright @prisma/client pino neverthrow dotenv
pnpm add -D typescript @types/node vitest eslint @eslint/js typescript-eslint prettier prisma @playwright/test prom-client @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
npx playwright install chromium
npx prisma generate

# === Development ===
pnpm exec tsx watch src/index.ts

# === Testing ===
pnpm exec vitest run                          # run all tests
pnpm exec vitest run tests/unit/ranker.test.ts # run single test file
pnpm exec vitest                               # run in watch mode
pnpm exec vitest run --coverage                # run with coverage

# === Linting ===
pnpm exec eslint . --max-warnings 0           # check mode (strict)
pnpm exec eslint . --fix                       # auto-fix mode
pnpm exec prettier --check .                   # format check
pnpm exec prettier --write .                   # format fix

# === Database ===
pnpm exec prisma migrate dev --name <name>     # create migration
pnpm exec prisma migrate deploy                # run migrations (production)
pnpm exec prisma migrate reset                 # reset database (destructive)
pnpm exec tsx scripts/seed.ts                  # seed database

# === Build ===
pnpm exec tsc --build                          # production build

# === Clean ===
rm -rf dist node_modules .vitest coverage
```

## Architecture Decisions

See `.claude/context/decisions.md` for full ADRs. Key decisions:

- **TypeScript over Python**: Playwright + BullMQ + Fastify are all TypeScript-native; single language across scraper, queue, API, and auto-apply bot eliminates context switching
- **PostgreSQL over MongoDB**: Jobs, applications, and companies have clear relational structure with foreign keys; full-text search on job descriptions via tsvector; ACID guarantees for application tracking
- **BullMQ over custom cron**: Built-in rate limiting (1 apply per 30s), exponential backoff on failure, Redis-backed persistence, dashboard via Bull Board — solves the anti-ban timing problem natively
- **Fastify over Express**: 2-3x faster, built-in JSON schema validation for API routes, TypeScript-first, async/await native
- **neverthrow over try/catch**: Forces callers to handle errors explicitly; scrapers and apply bots have many failure modes that must be handled, not swallowed

## Multi-Agent System

| Type    | Name                | Purpose                                   |
| ------- | ------------------- | ----------------------------------------- |
| Agent   | coordinator         | Multi-agent workflow orchestration        |
| Agent   | architect           | System design before coding               |
| Agent   | reviewer            | Code review with full checklist           |
| Agent   | debugger            | Structured 7-phase debugging              |
| Agent   | test-writer         | Test generation with plan                 |
| Agent   | security-analyst    | OWASP + secrets + dependency audit        |
| Agent   | performance-analyst | Hot-path profiling for scrapers and queue |
| Agent   | refactorer          | Safe refactoring protocol                 |
| Agent   | migrator            | Bulk symbol/API migration                 |
| Command | /test               | Run vitest (narrowest scope)              |
| Command | /lint               | ESLint + Prettier auto-fix                |
| Command | /debug              | Start debugging session                   |
| Command | /review             | Code review                               |
| Command | /refactor           | Safe refactor                             |
| Command | /explain            | 5-layer explanation                       |
| Command | /write-test         | Generate tests                            |
| Command | /architect          | Design session                            |
| Command | /perf               | Performance scan                          |
| Command | /security           | Security scan                             |
| Command | /changelog          | Generate changelog entry                  |
| Command | /ship               | Pre-ship quality gate                     |
| Skill   | refactor            | 5 refactor types + safety rules           |
| Skill   | explain             | 5-layer explanation framework             |
| Skill   | write-test          | Test plan + Vitest idioms                 |
| Skill   | perf-check          | Node.js hot-path checklist                |
| Skill   | security-check      | OWASP + secrets + pnpm audit              |
| Skill   | code-review         | Full review protocol                      |
| Skill   | changelog           | Conventional changelog format             |
| Skill   | add-observability   | Pino + prom-client + OpenTelemetry setup  |
| Hook    | pre-commit          | vitest run before every commit            |
| Hook    | on-bash-complete    | PR checklist + error hints                |
| Hook    | on-notification     | Permission/error/limit hints              |

## Engineering Rules

**Always do:**

- Read the complete file before proposing any change to it
- Make the smallest change that solves the actual problem
- Run `pnpm exec vitest run` after every code change before reporting done
- Name things for what they represent, not how they work
- Handle every error explicitly using `Result<T, E>` from neverthrow — no silent failures
- Validate all external input at the Fastify route level using JSON schema
- Write tests alongside code — test-first when possible
- Use the project's established patterns — consistency beats local perfection
- Prefer immutable data; use `readonly` and `as const` liberally
- Log at system boundaries with Pino (scrape start/end, apply attempt, API request/response, errors)

**Never do:**

- Never run destructive commands (rm -rf, git clean -f, DROP TABLE) without approval
- Never git push --force to main or master
- Never commit .env, secrets, credentials, API keys, profile.json with real data, or resume.pdf
- Never skip tests (--no-verify, vitest --skip) to unblock something
- Never add a dependency without stating why and getting approval
- Never break a public API or change the Prisma schema without flagging it
- Never amend a published commit — always create a new one
- Never suppress ESLint errors — fix the underlying issue
- Never use unsafe patterns: eval(), new Function(), innerHTML, raw SQL string concatenation, any without type narrowing, catching unknown errors silently
- Never leave debug logging (console.log) in committed code — use Pino logger
- Never apply to jobs faster than the rate limit (1 per 30 seconds minimum)
- Never store plaintext passwords or API keys in profile.json — use .env

## Getting Started

After reading this CLAUDE.md, the first session should:

1. Run `pnpm init` and install all dependencies from the setup commands above
2. Create the directory structure defined in Project Structure
3. Set up `eslint.config.mjs` with strict TypeScript rules and `.prettierrc`
4. Set up `vitest.config.ts` with one example passing test
5. Create `prisma/schema.prisma` with the jobs, applications, and companies tables
6. Create `.env.example` with all required environment variables (DATABASE_URL, REDIS_URL, etc.)
7. Create `.gitignore` for Node/TypeScript/Prisma
8. Create `.github/workflows/ci.yml` with install → lint → test → build stages
9. Create `docker-compose.yml` with PostgreSQL and Redis services
10. Initialize git and make the initial commit with this skeleton
