# Anti-Patterns

These are the 20 most common mistakes in TypeScript/Node.js pipeline projects like JobPilot. Each entry shows the smell, why it is wrong, and the correct pattern.

## 1. Untyped Error Handling
```typescript
// Smell
try { await scrape(); } catch (e) { console.log(e); }

// Fix — use Result type
const result = await scrape();
if (result.isErr()) logger.error({ error: result.error }, 'scrape failed');
```

## 2. Any Type Escape Hatch
```typescript
// Smell
const data: any = JSON.parse(response);

// Fix — parse into a validated type
const data = parseJobResponse(response); // returns Result<JobResponse, ParseError>
```

## 3. Floating Promises
```typescript
// Smell — promise is not awaited, errors are silently lost
page.close();

// Fix
await page.close();
```

## 4. Console.log in Production
```typescript
// Smell
console.log('scraping', url);

// Fix
logger.info({ url }, 'scraping started');
```

## 5. Hardcoded Selectors Without Constants
```typescript
// Smell
await page.click('#apply-button > div.btn-primary');

// Fix
const SELECTORS = { applyButton: '#apply-button > div.btn-primary' } as const;
await page.click(SELECTORS.applyButton);
```

## 6. Fixed Delays Instead of Waits
```typescript
// Smell
await page.waitForTimeout(5000);

// Fix
await page.waitForSelector(SELECTORS.formLoaded, { timeout: 10000 });
```

## 7. N+1 Database Queries
```typescript
// Smell
for (const job of jobs) {
  const company = await prisma.company.findUnique({ where: { id: job.companyId } });
}

// Fix
const jobs = await prisma.job.findMany({ include: { company: true } });
```

## 8. Unbounded Queries
```typescript
// Smell
const allJobs = await prisma.job.findMany(); // loads entire table into memory

// Fix
const jobs = await prisma.job.findMany({ take: 100, cursor: { id: lastId } });
```

## 9. String Interpolation in Selectors
```typescript
// Smell — injection risk
await page.locator(`input[name="${fieldName}"]`).fill(value);

// Fix — use CSS.escape or validated constants
await page.locator(`input[name="${CSS.escape(fieldName)}"]`).fill(value);
```

## 10. Shared Browser Context Between Apply Sessions
```typescript
// Smell — cookies and state leak between applications
const page = await browser.newPage();

// Fix — new context per session
const context = await browser.newContext({ ...stealthConfig });
const page = await context.newPage();
// ... apply ...
await context.close();
```

## 11. Synchronous File Operations
```typescript
// Smell — blocks event loop
const resume = fs.readFileSync('./resume.pdf');

// Fix
const resume = await fs.promises.readFile('./resume.pdf');
```

## 12. Missing Cleanup in Error Paths
```typescript
// Smell — page leaks on error
const page = await context.newPage();
await page.goto(url);
await page.fill('#name', name); // if this throws, page is never closed

// Fix
const page = await context.newPage();
try {
  await page.goto(url);
  await page.fill('#name', name);
} finally {
  await page.close();
}
```

## 13. Scattered Environment Access
```typescript
// Smell — process.env accessed everywhere
const dbUrl = process.env.DATABASE_URL!;

// Fix — centralized typed config
import { config } from '../common/config';
const dbUrl = config.database.url; // validated at startup
```

## 14. Queue Bypass
```typescript
// Smell — applying without going through rate-limited queue
await applyGreenhouse(job, profile, page);

// Fix — always enqueue
await applyQueue.add('apply', { jobId: job.id, platform: 'greenhouse' });
```

## 15. Logging Personal Data
```typescript
// Smell
logger.info({ profile }, 'applying to job');

// Fix — Pino redact configured, or manually exclude
logger.info({ jobId, platform }, 'applying to job');
```

## 16. Mutable Shared State
```typescript
// Smell — global array mutated by multiple scrapers
const allJobs: Job[] = [];
scrapers.forEach(s => s.scrape().then(jobs => allJobs.push(...jobs)));

// Fix — each scraper returns its results, merged at the caller
const results = await Promise.all(scrapers.map(s => s.scrape()));
const allJobs = results.flatMap(r => r.isOk() ? r.value : []);
```

## 17. Ignoring Rate Limit Errors
```typescript
// Smell
if (result.isErr() && result.error.code === 'RATE_LIMITED') {
  // just skip
}

// Fix — exponential backoff via BullMQ
// BullMQ handles this automatically when configured with backoff
```

## 18. Testing Implementation Instead of Behavior
```typescript
// Smell
expect(scraper.fetchPage).toHaveBeenCalledWith(url);

// Fix — test the output
expect(result.isOk()).toBe(true);
expect(result.value).toHaveLength(25);
```

## 19. Manual Type Definitions for Database Models
```typescript
// Smell
interface Job { id: string; title: string; ... }

// Fix — use Prisma generated types
import type { Job } from '@prisma/client';
```

## 20. Catching and Re-Throwing Without Context
```typescript
// Smell
catch (e) { throw new Error('scrape failed'); }

// Fix — wrap with context using Result
return err(new ScraperError('FETCH_FAILED', { url, cause: e instanceof Error ? e.message : String(e) }));
```
