# Conventions

All code in JobPilot follows these conventions. No exceptions. No "just this once."

## Naming

### Variables and Functions
camelCase. Name for what the value represents, not how it was computed.

```typescript
// Good
const unappliedJobs = await jobRepo.findUnapplied(filters);
const rankedJobs = unappliedJobs.map(job => ({ job, score: rankJob(job, rules) }));

// Bad
const data = await jobRepo.findUnapplied(filters);
const result = data.map(job => ({ job, score: rankJob(job, rules) }));
```

### Types and Interfaces
PascalCase. Prefix interfaces with nothing (not `I`). Suffix error types with `Error`.

```typescript
type JobSource = 'greenhouse' | 'lever' | 'linkedin' | 'wellfound' | 'naukri';
type ApplyPlatform = 'greenhouse' | 'lever' | 'linkedin_easy' | 'external';
type JobStatus = 'scraped' | 'ranked' | 'queued' | 'applied' | 'failed';

interface NormalizedJob { ... }
interface RankingRules { ... }
class ScraperError extends Error { ... }
class ApplyError extends Error { ... }
```

### Constants
SCREAMING_SNAKE_CASE for true constants. Use `as const` for literal objects.

```typescript
const MAX_DAILY_APPLICATIONS = 100;
const RATE_LIMIT_MS = 30_000;

const GREENHOUSE_SELECTORS = {
  jobTitle: 'h1.app-title',
  applyButton: '#apply_button',
  nameField: '#first_name',
} as const;
```

### Files
kebab-case for all filenames. One module per file. Test files mirror source: `src/ranker/rank-job.ts` → `tests/unit/rank-job.test.ts`.

```
src/scrapers/greenhouse.ts
src/scrapers/lever.ts
src/apply/apply-greenhouse.ts
src/ranker/rank-job.ts
src/common/types.ts
src/common/errors.ts
tests/unit/rank-job.test.ts
tests/unit/normalize-job.test.ts
```

## File Layout

Every TypeScript file follows this order:
1. Imports (external packages first, then internal modules, then types)
2. Constants
3. Types (if not in a shared types file)
4. Exported functions
5. Internal helper functions (not exported)

```typescript
// 1. Imports
import { ok, err, type Result } from 'neverthrow';
import type { Job } from '@prisma/client';
import { logger } from '../common/logger';
import type { RankingRules, NormalizedJob } from '../common/types';

// 2. Constants
const DEFAULT_SCORE = 0;

// 3. Types (module-specific)
interface ScoreBreakdown {
  readonly titleScore: number;
  readonly locationScore: number;
  readonly skillScore: number;
  readonly total: number;
}

// 4. Exported functions
export function rankJob(job: NormalizedJob, rules: RankingRules): number {
  const breakdown = computeBreakdown(job, rules);
  return breakdown.total;
}

// 5. Internal helpers
function computeBreakdown(job: NormalizedJob, rules: RankingRules): ScoreBreakdown {
  // ...
}
```

## Imports

- Use `import type` for type-only imports.
- Never use `require()`.
- Never use wildcard imports (`import * as`).
- Order: external packages → internal modules → type imports.
- Use relative paths for internal imports (`../common/logger`), never path aliases unless configured in tsconfig.

## Error Handling

- Business logic returns `Result<T, E>` from neverthrow.
- Error types are defined in `src/common/errors.ts` as classes extending `Error`.
- Error classes include a `code` field (string literal union) and a `context` field (structured data).

```typescript
export class ScraperError extends Error {
  constructor(
    public readonly code: 'SELECTOR_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'NETWORK_ERROR',
    public readonly context: Record<string, unknown>,
  ) {
    super(`Scraper error: ${code}`);
    this.name = 'ScraperError';
  }
}
```

## Testing

- Test files use `.test.ts` suffix.
- Unit tests in `tests/unit/`, integration tests in `tests/integration/`.
- Fixtures in `tests/fixtures/` as static files (HTML, JSON).
- Use `describe` for grouping, `it` for individual cases.
- Test names are sentences: `it('ranks remote jobs 2 points higher', ...)`.
- One logical assertion per `it` block.
- Use `vi.mock()` for module-level mocks, `vi.spyOn()` for function-level spies.
- Clean up after each test: `afterEach(() => { vi.restoreAllMocks(); })`.

## Commits

Conventional Commits format:
```
feat: add Greenhouse scraper with pagination support
fix: handle missing location field in Lever job listings
refactor: extract job normalizer into separate module
test: add edge case tests for ranking engine
docs: document anti-detection configuration
chore: upgrade Playwright to 1.50.1
```

- Subject line: imperative mood, lowercase, no period, under 72 characters.
- Body (optional): explain why, not what.
- Footer (optional): `BREAKING CHANGE:` for breaking changes.

## Git Branching

- `main` — production-ready code. Protected.
- `feat/<name>` — new features.
- `fix/<name>` — bug fixes.
- `refactor/<name>` — refactoring.
- Always branch from `main`. Always merge via PR.

## Configuration

All environment-dependent values go in `.env` (loaded by dotenv) and are validated at startup by the config module. The config module exports a typed, frozen object. No `process.env` access outside the config module.

Required environment variables are documented in `.env.example` with placeholder values and comments explaining each one.
