---
name: add-observability
description: Wire Pino logging, prom-client metrics, and OpenTelemetry tracing into new or existing modules
---

# Add Observability Skill

## Pino Logging Setup

### Logger Configuration
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['email', 'phone', 'name', 'profile.email', 'profile.phone'],
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
```

### Child Loggers for Context
```typescript
// In a scraper
const scraperLog = logger.child({ scraper: 'greenhouse', runId: crypto.randomUUID() });
scraperLog.info({ url, jobCount: jobs.length }, 'scrape completed');
scraperLog.error({ url, error: err.message, code: err.code }, 'scrape failed');

// In an apply bot
const applyLog = logger.child({ bot: 'greenhouse', jobId, applicationId });
applyLog.info('form submission started');
applyLog.info({ step: 'upload_resume' }, 'resume uploaded');
applyLog.error({ step: 'submit', error: err.message }, 'form submission failed');
```

### What to Log
- Scraper: start, page count, job count, errors, duration.
- Parser: normalization failures with raw input summary.
- Ranker: top 10 scores for each run.
- Queue: job added, job started, job completed, job failed, rate limit hit.
- Apply bot: session start, each form step, submission result, session end.
- API: request received, response sent, duration.

## prom-client Metrics

```typescript
import { Counter, Histogram, Gauge, collectDefaultMetrics, register } from 'prom-client';

collectDefaultMetrics();

export const jobsScraped = new Counter({
  name: 'jobpilot_jobs_scraped_total',
  help: 'Total jobs scraped',
  labelNames: ['source', 'status'] as const,
});

export const applicationsSubmitted = new Counter({
  name: 'jobpilot_applications_submitted_total',
  help: 'Total applications submitted',
  labelNames: ['platform', 'status'] as const,
});

export const scrapeDuration = new Histogram({
  name: 'jobpilot_scrape_duration_seconds',
  help: 'Time to scrape a job board',
  labelNames: ['source'] as const,
  buckets: [1, 5, 10, 30, 60, 120],
});

export const queueDepth = new Gauge({
  name: 'jobpilot_queue_depth',
  help: 'Number of jobs waiting in apply queue',
});
```

Expose metrics endpoint:
```typescript
app.get('/metrics', async (_, reply) => {
  reply.header('Content-Type', register.contentType);
  return register.metrics();
});
```

## OpenTelemetry Tracing

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  serviceName: 'jobpilot',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

## Rules
- Never log personal data (email, phone, name) — use Pino redact.
- Always use structured logging (objects, not string interpolation).
- Metrics labels must be low-cardinality (source names, status codes — not job IDs).
- Tracing is optional for development but required for production.
