---
name: write-test
description: Test generation with Vitest — plan test cases, write idiomatic TypeScript tests, mock Prisma/BullMQ/Playwright
---

# Write Test Skill

## Process
1. Read the source file. Identify every public function and its Result/return type.
2. Plan test cases: happy path, edge cases, error paths.
3. Write tests using Vitest idioms.
4. Run `pnpm exec vitest run <test-file>` to confirm they pass.

## Vitest Idioms

### Test Structure
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rankJob } from '../../src/ranker/rankJob';
import type { NormalizedJob, RankingRules } from '../../src/common/types';

describe('rankJob', () => {
  const defaultRules: RankingRules = {
    titleKeywords: { backend: 5, engineer: 3 },
    locationBonus: { remote: 2 },
    skillBonus: { typescript: 3, node: 3, python: 2 },
    experienceMax: 2,
  };

  it('gives maximum score to a remote backend TypeScript role', () => {
    const job: NormalizedJob = {
      title: 'Backend Engineer',
      company: 'Stripe',
      location: 'Remote',
      skills: ['typescript', 'node', 'postgresql'],
      experience: '0-2',
      applyLink: 'https://boards.greenhouse.io/stripe/jobs/123',
      applyType: 'greenhouse',
      source: 'greenhouse',
    };
    expect(rankJob(job, defaultRules)).toBeGreaterThanOrEqual(10);
  });

  it('returns zero for unrelated roles', () => {
    const job: NormalizedJob = {
      title: 'Marketing Manager',
      company: 'Acme',
      location: 'NYC',
      skills: ['excel', 'powerpoint'],
      experience: '5+',
      applyLink: 'https://example.com',
      applyType: 'external',
      source: 'linkedin',
    };
    expect(rankJob(job, defaultRules)).toBe(0);
  });
});
```

### Mocking Prisma
```typescript
vi.mock('../../src/database/client', () => ({
  prisma: {
    job: { upsert: vi.fn(), findMany: vi.fn() },
    application: { create: vi.fn(), update: vi.fn() },
  },
}));
```

### Mocking Playwright Pages
```typescript
function createMockPage(): Partial<Page> {
  return {
    goto: vi.fn(),
    fill: vi.fn(),
    click: vi.fn(),
    setInputFiles: vi.fn(),
    waitForSelector: vi.fn().mockResolvedValue({}),
    waitForLoadState: vi.fn(),
    screenshot: vi.fn(),
    close: vi.fn(),
  };
}
```

### Testing Result Types
```typescript
it('returns err when selector is missing', async () => {
  const result = await scrapeGreenhouse('https://invalid.example.com');
  expect(result.isErr()).toBe(true);
  if (result.isErr()) {
    expect(result.error.code).toBe('SELECTOR_NOT_FOUND');
  }
});
```

## Rules
- Test behavior, not implementation. Test names read as specifications.
- One logical assertion per test.
- Fixtures go in `tests/fixtures/`, not inline.
- No `@ts-ignore` or `any` in tests.
- After writing, run `pnpm exec vitest run` to confirm.
