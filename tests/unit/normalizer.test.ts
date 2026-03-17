import { describe, it, expect } from 'vitest';
import {
  normalizeGreenhouseJob,
  normalizeLeverJob,
  normalizeLinkedInJob,
  normalizeWellfoundJob,
  normalizeNaukriJob,
} from '../../src/parser/normalizer.js';

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

describe('normalizeLinkedInJob', () => {
  it('should normalize a LinkedIn job', () => {
    const raw = {
      title: 'Senior Backend Engineer',
      company: 'stripe',
      location: 'San Francisco, CA',
      description: 'Build with TypeScript and Node.js and PostgreSQL.',
      jobUrl: 'https://www.linkedin.com/jobs/view/111111',
      linkedinJobId: '111111',
      isEasyApply: false,
    };

    const result = normalizeLinkedInJob(raw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const job = result.value;
      expect(job.title).toBe('Senior Backend Engineer');
      expect(job.company).toBe('stripe');
      expect(job.source).toBe('linkedin');
      expect(job.sourceId).toBe('111111');
      expect(job.skills).toContain('typescript');
      expect(job.skills).toContain('node');
      expect(job.skills).toContain('postgresql');
    }
  });

  it('should set applyType to linkedin_easy when isEasyApply is true', () => {
    const raw = {
      title: 'Engineer',
      company: 'test',
      location: 'Remote',
      description: '',
      jobUrl: 'https://www.linkedin.com/jobs/view/1',
      linkedinJobId: '1',
      isEasyApply: true,
    };

    const result = normalizeLinkedInJob(raw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.applyType).toBe('linkedin_easy');
    }
  });

  it('should set applyType to external when isEasyApply is false', () => {
    const raw = {
      title: 'Engineer',
      company: 'test',
      location: 'NYC',
      description: '',
      jobUrl: 'https://www.linkedin.com/jobs/view/2',
      linkedinJobId: '2',
      isEasyApply: false,
    };

    const result = normalizeLinkedInJob(raw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.applyType).toBe('external');
      expect(result.value.location).toBe('New York, NY');
    }
  });
});

describe('normalizeWellfoundJob', () => {
  it('should normalize a Wellfound job', () => {
    const raw = {
      title: 'Full Stack Engineer',
      company: 'linear',
      location: 'Remote',
      description: 'Build with TypeScript, React, and PostgreSQL.',
      salary: '$120k - $180k',
      jobUrl: 'https://wellfound.com/company/linear/jobs/fs-1',
      wellfoundJobId: 'fs-1',
    };

    const result = normalizeWellfoundJob(raw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const job = result.value;
      expect(job.title).toBe('Full Stack Engineer');
      expect(job.company).toBe('linear');
      expect(job.location).toBe('Remote');
      expect(job.source).toBe('wellfound');
      expect(job.sourceId).toBe('fs-1');
      expect(job.applyType).toBe('external');
      expect(job.salary).toBe('$120k - $180k');
      expect(job.skills).toContain('typescript');
      expect(job.skills).toContain('react');
    }
  });

  it('should handle null salary', () => {
    const raw = {
      title: 'Engineer',
      company: 'test',
      location: 'SF',
      description: '',
      salary: null,
      jobUrl: 'https://wellfound.com/company/test/jobs/1',
      wellfoundJobId: '1',
    };

    const result = normalizeWellfoundJob(raw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.salary).toBeNull();
      expect(result.value.location).toBe('San Francisco, CA');
    }
  });
});

describe('normalizeNaukriJob', () => {
  it('should normalize a Naukri job', () => {
    const raw = {
      title: 'Senior TypeScript Developer',
      company: 'TCS',
      location: 'Bangalore',
      description: 'TypeScript developer with React and Node.js experience.',
      experience: '3-5 Yrs',
      salary: '12-18 Lacs PA',
      skills: ['typescript', 'react'],
      jobUrl: 'https://www.naukri.com/job-listings-100001',
      naukriJobId: '100001',
    };

    const result = normalizeNaukriJob(raw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const job = result.value;
      expect(job.title).toBe('Senior TypeScript Developer');
      expect(job.company).toBe('TCS');
      expect(job.source).toBe('naukri');
      expect(job.sourceId).toBe('100001');
      expect(job.applyType).toBe('external');
      expect(job.experience).toBe('3-5 Yrs');
      expect(job.salary).toBe('12-18 Lacs PA');
      expect(job.skills).toContain('typescript');
      expect(job.skills).toContain('react');
      expect(job.skills).toContain('node');
    }
  });

  it('should merge card skills with extracted skills', () => {
    const raw = {
      title: 'Developer',
      company: 'test',
      location: 'Pune',
      description: 'Work with Docker and AWS.',
      experience: null,
      salary: null,
      skills: ['custom-framework', 'docker'],
      jobUrl: 'https://www.naukri.com/job-listings-2',
      naukriJobId: '2',
    };

    const result = normalizeNaukriJob(raw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.skills).toContain('docker');
      expect(result.value.skills).toContain('aws');
      expect(result.value.skills).toContain('custom-framework');
    }
  });

  it('should normalize Indian city locations', () => {
    const cases = [
      { input: 'Bengaluru', expected: 'Bangalore, India' },
      { input: 'Mumbai', expected: 'Mumbai, India' },
      { input: 'Gurgaon', expected: 'Gurugram, India' },
      { input: 'Chennai', expected: 'Chennai, India' },
      { input: 'Noida', expected: 'Noida, India' },
    ];

    for (const { input, expected } of cases) {
      const raw = {
        title: 'Dev',
        company: 'test',
        location: input,
        description: '',
        experience: null,
        salary: null,
        skills: [],
        jobUrl: 'https://www.naukri.com/job-listings-x',
        naukriJobId: 'x',
      };

      const result = normalizeNaukriJob(raw);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.location).toBe(expected);
      }
    }
  });
});
