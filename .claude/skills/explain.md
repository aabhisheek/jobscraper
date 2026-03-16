---
name: explain
description: Five-layer explanation framework — from one-sentence summary to edge case analysis
---

# Explain Skill

Explain any code at five layers of increasing depth. The reader chooses how deep to go.

## Layer 1 — One Sentence
What does this code do? One sentence, no jargon.

Example: "This function takes a raw Greenhouse job listing and converts it into the standard format used by the rest of the pipeline."

## Layer 2 — Context
Where does this code fit in the system? What calls it? What does it call?

Example: "Called by the Greenhouse scraper after fetching the job board API. The output is passed to `jobRepository.upsert()` which stores it in PostgreSQL. If upsert fails, the error is logged and the scraper continues to the next job."

## Layer 3 — Step by Step
Walk through the logic line by line. Explain each decision.

Example:
- Line 12: Extract title, trim whitespace — some listings have trailing spaces.
- Line 13: Normalize location — map "NYC" and "New York" to the same value.
- Line 15: Extract skills from description using regex patterns — returns an array of matched skill keywords.
- Line 18: Return a `Result<NormalizedJob, ParseError>` — `err()` if the title is empty (indicates a bad listing).

## Layer 4 — Design Rationale
Why was it built this way? What alternatives were considered?

Example: "The normalizer is a pure function (no I/O, no side effects) so it can be tested with just input/output assertions. It returns `Result` instead of throwing because the scraper processes hundreds of jobs in a batch — one bad listing should not crash the entire run."

## Layer 5 — Edge Cases and Assumptions
What can go wrong? What does the code assume?

Example: "Assumes the Greenhouse API response always includes `title` and `absolute_url`. If Greenhouse changes their API schema, the normalizer will return `err(ParseError)` for every job — the scraper's error rate metric will spike and alert."

## Rules
- Always read the full file before explaining any part of it.
- Reference specific line numbers.
- Use the project's actual type names, function names, and module names.
- If the code has a bug or smell, mention it at Layer 5 — do not silently skip issues.
