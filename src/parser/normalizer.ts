import { ok, err, type Result } from 'neverthrow';
import { ScraperError } from '../common/errors.js';
import type { NormalizedJob } from '../common/types.js';
import type { GreenhouseRawJob } from '../scrapers/greenhouse.js';
import type { LeverRawJob } from '../scrapers/lever.js';
import { extractSkills } from './skill-extractor.js';

const LOCATION_NORMALIZATIONS: Record<string, string> = {
  nyc: 'New York, NY',
  'new york city': 'New York, NY',
  sf: 'San Francisco, CA',
  'san francisco': 'San Francisco, CA',
  la: 'Los Angeles, CA',
  'los angeles': 'Los Angeles, CA',
  dc: 'Washington, DC',
  'washington dc': 'Washington, DC',
};

function normalizeLocation(raw: string): string {
  const lower = raw.toLowerCase().trim();

  if (lower.includes('remote')) return 'Remote';

  for (const [key, value] of Object.entries(LOCATION_NORMALIZATIONS)) {
    if (lower.includes(key)) return value;
  }

  return raw.trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeGreenhouseJob(
  raw: GreenhouseRawJob & { company: string },
): Result<NormalizedJob, ScraperError> {
  try {
    const description = raw.content ? stripHtml(raw.content) : '';
    const skills = extractSkills(description + ' ' + raw.title);

    return ok({
      title: raw.title.trim(),
      company: raw.company,
      location: normalizeLocation(raw.location.name),
      description,
      skills,
      experience: null,
      salary: null,
      applyLink: raw.absolute_url,
      applyType: 'greenhouse',
      source: 'greenhouse',
      sourceId: String(raw.id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return err(new ScraperError('PARSE_FAILED', 'greenhouse', message));
  }
}

export function normalizeLeverJob(
  raw: LeverRawJob & { company: string },
): Result<NormalizedJob, ScraperError> {
  try {
    const descriptionParts: string[] = [];
    if (raw.descriptionPlain) {
      descriptionParts.push(raw.descriptionPlain);
    } else if (raw.description) {
      descriptionParts.push(stripHtml(raw.description));
    }
    if (raw.lists) {
      for (const list of raw.lists) {
        descriptionParts.push(`${list.text}: ${stripHtml(list.content)}`);
      }
    }

    const description = descriptionParts.join('\n\n');
    const skills = extractSkills(description + ' ' + raw.text);
    const location = raw.categories.location ?? 'Unknown';
    const applyLink = raw.applyUrl ?? raw.hostedUrl ?? '';

    if (!applyLink) {
      return err(new ScraperError('PARSE_FAILED', 'lever', `No apply URL for ${raw.id}`));
    }

    return ok({
      title: raw.text.trim(),
      company: raw.company,
      location: normalizeLocation(location),
      description,
      skills,
      experience: null,
      salary: null,
      applyLink,
      applyType: 'lever',
      source: 'lever',
      sourceId: raw.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return err(new ScraperError('PARSE_FAILED', 'lever', message));
  }
}
