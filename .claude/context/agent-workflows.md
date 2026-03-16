# Agent Workflows

This document defines when and how to use the JobPilot agent system. The coordinator agent reads this document to decide which specialists to invoke.

## Agent Selection Decision Table

| User Request | Primary Agent | Support Agents | Workflow |
|---|---|---|---|
| "Add a new scraper for [site]" | architect | test-writer, reviewer | Design → Implement → Test → Review |
| "Add an apply bot for [platform]" | architect | security-analyst, test-writer, reviewer | Design → Security review → Implement → Test → Review |
| "This scraper is broken" | debugger | — | 7-phase debugging |
| "The apply bot fails on [site]" | debugger | security-analyst | Debug → Verify no security regression |
| "Make the pipeline faster" | performance-analyst | refactorer | Profile → Identify bottlenecks → Refactor |
| "Refactor [module]" | refactorer | reviewer | Refactor with tests green → Review |
| "Add a new field to jobs table" | migrator | test-writer | Schema change → Migration → Update code → Test |
| "Review this code" | reviewer | — | Full checklist review |
| "Write tests for [module]" | test-writer | — | Test plan → Implementation → Run |
| "Is this code secure?" | security-analyst | — | Full security audit |
| "Design [new feature]" | architect | — | Interface design + data flow |
| "Rename [symbol] across codebase" | migrator | — | Find all usages → Rename → Verify |
| "Upgrade [dependency]" | migrator | test-writer | Read changelog → Apply changes → Test |
| "Ship this" | coordinator | reviewer, security-analyst | Review → Security → Test → Lint → Ship |

## Five Standard Workflow Patterns

### Pattern 1: New Feature
```
architect → test-writer → [implement] → reviewer
```
1. Architect designs interfaces, types, and data flow.
2. Test-writer creates test plan and skeleton tests.
3. Implementation fills in the skeleton (guided by interfaces and tests).
4. Reviewer checks the complete change against the checklist.

### Pattern 2: Bug Fix
```
debugger → [fix] → test-writer → reviewer
```
1. Debugger reproduces, isolates, and identifies the root cause.
2. Fix is applied (minimal change).
3. Test-writer adds a regression test.
4. Reviewer confirms the fix is correct and complete.

### Pattern 3: Refactoring
```
refactorer → reviewer
```
1. Refactorer makes structural changes with tests green at every step.
2. Reviewer confirms no behavior change and no regressions.

### Pattern 4: Migration
```
migrator → test-writer → reviewer
```
1. Migrator applies the schema/API/dependency change across the codebase.
2. Test-writer updates or adds tests for the changed interfaces.
3. Reviewer confirms everything is consistent.

### Pattern 5: Pre-Ship
```
coordinator → reviewer → security-analyst → [all checks]
```
1. Coordinator orchestrates the full quality gate.
2. Reviewer runs the code review checklist.
3. Security analyst runs the security audit.
4. All automated checks: `pnpm exec vitest run`, `pnpm exec eslint . --max-warnings 0`, `pnpm exec prettier --check .`, `pnpm exec tsc --noEmit`, `pnpm audit`.

## Handoff Protocol

When one agent hands off to another:

1. **Context document**: The first agent writes a summary of its findings/outputs as a message to the next agent. This includes: what was done, what files were changed, what decisions were made, and what the next agent should focus on.

2. **File list**: The handoff includes the list of files that were read, created, or modified.

3. **Open questions**: Any unresolved issues or design decisions that need input.

4. **Verification state**: Whether tests pass, whether lint passes, whether the build compiles.

Example handoff from architect to test-writer:
```
## Handoff: architect → test-writer

### What was designed
- Greenhouse scraper implementing the Scraper interface
- New types: GreenhouseRawJob, GreenhouseConfig
- New error variants: BOARD_NOT_FOUND, PAGINATION_FAILED

### Files created
- src/scrapers/greenhouse.ts (interfaces and type stubs, no implementation)
- src/common/types.ts (updated with GreenhouseRawJob)

### Test strategy
- Unit tests for normalizeGreenhouseJob with HTML fixtures
- Integration test for scrapeGreenhouse with a mocked HTTP response
- Error path tests for each ScraperError variant

### Open questions
- None

### Verification
- tsc --noEmit: passes (interfaces only, no implementation)
- vitest: passes (no tests yet)
```

## Escalation

If an agent cannot complete its task:
1. It reports what it attempted and why it failed.
2. The coordinator decides: retry with more context, try a different agent, or escalate to the user.
3. Never retry more than once without changing the approach.
4. Always escalate to the user if: the fix requires a design decision, the change affects more than 10 files, or the issue involves external systems (job board API changes, infrastructure).

## Single-Agent vs Multi-Agent

Use a single agent when:
- The task is isolated to one module (e.g., "fix the Lever scraper").
- The task is a pure analysis (e.g., "review this code", "explain this function").
- The task is a pure generation (e.g., "write tests for the ranker").

Use multiple agents when:
- The task crosses module boundaries (e.g., "add a new job source" touches scrapers, parser, database, queue).
- The task requires both design and implementation.
- The task requires security review (any change to apply bots or credential handling).
- The task is a pre-ship quality gate.
