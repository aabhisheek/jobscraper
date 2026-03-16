import { describe, it, expect } from 'vitest';
import { normalizeGreenhouseJob, normalizeLeverJob } from '../../src/parser/normalizer.js';

describe('normalizeGreenhouseJob', () => {
  it('should normalize a Greenhouse job', () => {
    const raw = {
      id: 12345,
      title: 'Senior Software Engineer, Backend',
      updated_at: '2026-03-10T12:00:00Z',
      absolute_url: 'https://boards.greenhouse.io/testco/jobs/12345',
      location: { name: 'San Francisco, CA' },
      content:
        '<p>We are looking for a <strong>Senior Software Engineer</strong> with TypeScript and Node.js experience.</p>',
      departments: [{ name: 'Engineering' }],
      company: 'testco',
    };

    const result = normalizeGreenhouseJob(raw);
    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      const job = result.value;
      expect(job.title).toBe('Senior Software Engineer, Backend');
      expect(job.company).toBe('testco');
      expect(job.location).toBe('San Francisco, CA');
      expect(job.source).toBe('greenhouse');
      expect(job.sourceId).toBe('12345');
      expect(job.applyType).toBe('greenhouse');
      expect(job.applyLink).toBe('https://boards.greenhouse.io/testco/jobs/12345');
      expect(job.skills).toContain('typescript');
      expect(job.skills).toContain('node');
      expect(job.description).not.toContain('<p>');
    }
  });

  it('should normalize Remote location', () => {
    const raw = {
      id: 99,
      title: 'Engineer',
      updated_at: '2026-03-10T12:00:00Z',
      absolute_url: 'https://boards.greenhouse.io/testco/jobs/99',
      location: { name: 'Remote - US' },
      company: 'testco',
    };

    const result = normalizeGreenhouseJob(raw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.location).toBe('Remote');
    }
  });

  it('should normalize NYC location', () => {
    const raw = {
      id: 100,
      title: 'Engineer',
      updated_at: '2026-03-10T12:00:00Z',
      absolute_url: 'https://boards.greenhouse.io/testco/jobs/100',
      location: { name: 'NYC' },
      company: 'testco',
    };

    const result = normalizeGreenhouseJob(raw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.location).toBe('New York, NY');
    }
  });
});

describe('normalizeLeverJob', () => {
  it('should normalize a Lever job', () => {
    const raw = {
      id: 'abc-123',
      text: 'Backend Engineer',
      categories: {
        commitment: 'Full-time',
        department: 'Engineering',
        location: 'Remote',
        team: 'Platform',
      },
      description: '<p>Build our platform with Go and PostgreSQL.</p>',
      descriptionPlain: 'Build our platform with Go and PostgreSQL.',
      lists: [
        {
          text: 'Requirements',
          content: '<li>Go experience</li><li>Docker knowledge</li>',
        },
      ],
      hostedUrl: 'https://jobs.lever.co/testco/abc-123',
      applyUrl: 'https://jobs.lever.co/testco/abc-123/apply',
      createdAt: 1710000000000,
      company: 'testco',
    };

    const result = normalizeLeverJob(raw);
    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      const job = result.value;
      expect(job.title).toBe('Backend Engineer');
      expect(job.company).toBe('testco');
      expect(job.location).toBe('Remote');
      expect(job.source).toBe('lever');
      expect(job.sourceId).toBe('abc-123');
      expect(job.applyType).toBe('lever');
      expect(job.applyLink).toBe('https://jobs.lever.co/testco/abc-123/apply');
      expect(job.skills).toContain('go');
      expect(job.skills).toContain('postgresql');
      expect(job.skills).toContain('docker');
    }
  });

  it('should fail if no apply URL', () => {
    const raw = {
      id: 'no-url',
      text: 'Test Job',
      categories: { location: 'Remote' },
      createdAt: 1710000000000,
      company: 'testco',
    };

    const result = normalizeLeverJob(raw);
    expect(result.isErr()).toBe(true);
  });

  it('should use hostedUrl as fallback for applyUrl', () => {
    const raw = {
      id: 'fallback-url',
      text: 'Test Job',
      categories: { location: 'SF' },
      hostedUrl: 'https://jobs.lever.co/testco/fallback-url',
      createdAt: 1710000000000,
      company: 'testco',
    };

    const result = normalizeLeverJob(raw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.applyLink).toBe('https://jobs.lever.co/testco/fallback-url');
      expect(result.value.location).toBe('San Francisco, CA');
    }
  });
});
