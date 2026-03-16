---
name: changelog
description: Generate conventional changelog entries from git history — grouped by Added, Changed, Fixed, Removed, Security
---

# Changelog Skill

## Format

Follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [Unreleased]

### Added
- New Greenhouse scraper supporting pagination (#12)
- Job ranking engine with configurable scoring rules (#15)

### Changed
- Increased apply queue rate limit from 1/30s to 1/45s for safety (#18)

### Fixed
- Lever scraper failing on jobs with no location field (#20)
- Application tracker not updating status after successful apply (#22)

### Removed
- Deprecated Naukri scraper (site blocked automation) (#25)

### Security
- Redacted email and phone from Pino log output (#27)
```

## Process

1. Run `git log --oneline --since="last tag or last entry"` to find commits since last changelog entry.
2. Categorize each commit:
   - `feat:` → Added
   - `fix:` → Fixed
   - `refactor:` / `perf:` → Changed
   - `BREAKING:` → Changed (with breaking change note)
   - `security:` → Security
   - `revert:` → Removed
3. Write human-readable descriptions (not commit messages verbatim).
4. Reference PR/issue numbers where available.
5. Place under `## [Unreleased]` heading at the top of CHANGELOG.md.

## Rules
- Never modify entries under a released version heading.
- Each entry is one line, starts with a capital letter, ends with a PR/issue reference.
- Group related changes into one entry rather than listing each commit separately.
- Security changes always get their own entry, even if they seem minor.
