# Engineering Principles

These principles govern every line of code in the JobPilot project. They are not aspirational — they are the minimum standard for merged code.

## 1. Errors Are Data, Not Exceptions

Every function that can fail returns `Result<T, E>` from neverthrow. The caller matches on the result. Nothing is swallowed. Nothing is silent.

```typescript
// Correct
function parseJobTitle(raw: string): Result<string, ParseError> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return err(new ParseError('EMPTY_TITLE', { raw }));
  return ok(trimmed);
}

// Wrong — thrown exceptions are invisible in the type signature
function parseJobTitle(raw: string): string {
  if (!raw.trim()) throw new Error('empty title');
  return raw.trim();
}
```

Exceptions are reserved for truly unrecoverable situations: out of memory, corrupted state, programmer errors (assertion failures). Business logic errors — scraper timeouts, missing form fields, invalid job data — are Result errors.

## 2. Pipeline Thinking

JobPilot is a pipeline: scrape → parse → store → rank → queue → apply → track. Each stage is a function (or set of functions) with a defined input type, output type, and error type. Stages are composable: you can run scrape → parse → store without rank → queue → apply.

```typescript
// Each stage has a clear signature
type ScrapeStage = (config: ScrapeConfig) => Promise<Result<RawJob[], ScraperError>>;
type ParseStage = (raw: RawJob) => Result<NormalizedJob, ParseError>;
type StoreStage = (job: NormalizedJob) => Promise<Result<Job, DatabaseError>>;
type RankStage = (job: Job, rules: RankingRules) => number;
type QueueStage = (job: Job, score: number) => Promise<Result<QueuedJob, QueueError>>;
```

## 3. Test What Can Break

Test the ranker with edge cases because the scoring logic has real branching. Test the parser with fixtures from real job boards because HTML structures vary. Test the apply bot with mock pages because form detection is fragile.

Do not test that Prisma can insert a row. Do not test that Pino can write a log line. Do not test that BullMQ can enqueue a job. Those libraries have their own tests. Test your logic, your transformations, your decisions.

```typescript
// Good — tests a real decision
it('ranks a remote backend role higher than an onsite frontend role', () => {
  const remote = rankJob(backendRemoteJob, rules);
  const onsite = rankJob(frontendOnsiteJob, rules);
  expect(remote).toBeGreaterThan(onsite);
});

// Bad — tests Prisma, not your code
it('inserts a job into the database', async () => {
  await prisma.job.create({ data: testJob });
  const found = await prisma.job.findUnique({ where: { id: testJob.id } });
  expect(found).toBeTruthy();
});
```

## 4. Immutability by Default

Use `readonly` on every property, parameter, and array that should not be mutated. Use `as const` on literal objects. Only use mutable state when there is a clear, documented reason.

```typescript
interface NormalizedJob {
  readonly title: string;
  readonly company: string;
  readonly location: string;
  readonly skills: readonly string[];
  readonly applyLink: string;
  readonly source: JobSource;
}
```

Mutability is reserved for Playwright page interactions (inherently stateful) and database transactions (inherently sequential). Everything else is immutable.

## 5. Observability From Day One

Every pipeline stage logs its entry, exit, duration, and error state using Pino structured logging. Every scraper and apply bot has a unique `runId` for traceability. Metrics (prom-client) track throughput and error rates. Tracing (OpenTelemetry) connects stages end-to-end.

You do not add observability after the first incident. You add it when you write the code, so the first incident is diagnosable.

## 6. Anti-Detection Is a System Concern

Rate limiting, delays, fingerprint randomization, and session isolation are enforced at the infrastructure level (BullMQ rate limiter, Playwright context factory) — not sprinkled through application code. No individual scraper or apply bot manages its own timing. The queue handles it.

## 7. Explicit Over Implicit

Every configuration value has a name, a type, a default, and a validation rule. No magic strings. No ambient globals. No `process.env.FOO` scattered across files — all environment access goes through a typed config module loaded at startup.

```typescript
// Correct — typed, validated, centralized
const config = loadConfig(); // throws at startup if invalid
config.redis.url; // string, validated

// Wrong — implicit, scattered, no validation
process.env.REDIS_URL!; // might be undefined at runtime
```

## 8. Small, Focused Commits

Each commit does one thing: add a scraper, fix a parser bug, update a dependency. The commit message explains why, not what (the diff shows what). Conventional commit format: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.

## 9. Dependencies Are Liabilities

Every dependency is a maintenance burden, a security surface, and a potential breaking change. Add a dependency only when the alternative is significantly more work or significantly less reliable. Justify every addition. Pin versions. Audit regularly with `pnpm audit`.

## 10. Production Readiness Is Not Optional

Docker Compose works on the first `docker compose up`. Environment variables are documented in `.env.example`. Migrations run automatically on startup. Health checks are exposed. Graceful shutdown is implemented. These are not "nice to haves" — they are part of the feature.
