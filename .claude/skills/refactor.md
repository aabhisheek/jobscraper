---
name: refactor
description: Five refactoring types with safety rules — extract, rename, restructure, simplify, type-tighten — for TypeScript codebases
---

# Refactor Skill

## Five Refactoring Types

### 1. Extract
Pull a code block into a named function. The function's signature becomes the contract.

```typescript
// Before
const jobs = await scrapeGreenhouse(url);
const normalized = jobs.map(job => ({
  title: job.title.trim().toLowerCase(),
  company: job.company_name,
  location: job.location || 'Unknown',
  skills: extractSkills(job.description),
  applyLink: job.absolute_url,
  source: 'greenhouse' as const,
}));

// After — extract normalizeGreenhouseJob
const normalized = jobs.map(normalizeGreenhouseJob);
```

### 2. Rename
Change a symbol name across all files. Always use Grep to find every usage first.

### 3. Restructure
Move files between directories. Update all imports. Run `pnpm exec tsc --noEmit` to catch broken paths.

### 4. Simplify
Reduce nesting, replace callbacks with async/await, replace conditionals with early returns.

```typescript
// Before
if (result.isOk()) {
  if (result.value.length > 0) {
    return result.value;
  } else {
    return [];
  }
} else {
  throw result.error;
}

// After
if (result.isErr()) return err(result.error);
return ok(result.value);
```

### 5. Type Tighten
Replace loose types with precise unions, branded types, or readonly modifiers.

```typescript
// Before
type JobStatus = string;

// After
type JobStatus = 'scraped' | 'ranked' | 'queued' | 'applied' | 'failed';
```

## Safety Rules

1. Run `pnpm exec vitest run` before starting. If tests fail, stop.
2. One step per commit. Tests must pass after each step.
3. Never change behavior. If you find a bug, document it separately.
4. Never add dependencies during a refactor.
5. Never change exported function signatures without approval.
