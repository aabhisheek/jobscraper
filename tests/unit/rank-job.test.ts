import { describe, it, expect } from 'vitest';
import { rankJob, meetsThreshold } from '../../src/ranker/rank-job.js';
import type { NormalizedJob, RankingRules } from '../../src/common/types.js';

const rules: RankingRules = {
  titleKeywords: ['backend', 'software engineer', 'developer'],
  desiredSkills: ['typescript', 'node', 'postgresql', 'redis', 'docker'],
  preferRemote: true,
  targetCompanies: ['stripe', 'vercel'],
  maxExperienceYears: 3,
  minimumScore: 8,
};

function makeJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    title: 'Software Engineer',
    company: 'acme',
    location: 'New York, NY',
    description: 'A job',
    skills: [],
    experience: null,
    salary: null,
    applyLink: 'https://example.com/apply',
    applyType: 'greenhouse',
    source: 'greenhouse',
    sourceId: '123',
    ...overrides,
  };
}

describe('rankJob', () => {
  it('should score +5 for matching title keyword', () => {
    const job = makeJob({ title: 'Backend Engineer' });
    expect(rankJob(job, rules)).toBe(5);
  });

  it('should score +3 per matching skill', () => {
    const job = makeJob({
      title: 'Product Manager', // no title match
      skills: ['typescript', 'node', 'postgresql'],
    });
    expect(rankJob(job, rules)).toBe(9); // 3 skills * 3
  });

  it('should cap skill score at 15', () => {
    const job = makeJob({
      title: 'Product Manager',
      skills: ['typescript', 'node', 'postgresql', 'redis', 'docker', 'aws'],
    });
    expect(rankJob(job, rules)).toBe(15); // capped at 15
  });

  it('should score +2 for remote location', () => {
    const job = makeJob({
      title: 'Product Manager',
      location: 'Remote - US',
    });
    expect(rankJob(job, rules)).toBe(2);
  });

  it('should score +2 for target company', () => {
    const job = makeJob({
      title: 'Product Manager',
      company: 'stripe',
    });
    expect(rankJob(job, rules)).toBe(2);
  });

  it('should score +1 for experience within range', () => {
    const job = makeJob({
      title: 'Product Manager',
      experience: '2 years',
    });
    expect(rankJob(job, rules)).toBe(1);
  });

  it('should not add experience score if above max', () => {
    const job = makeJob({
      title: 'Product Manager',
      experience: '5 years',
    });
    expect(rankJob(job, rules)).toBe(0);
  });

  it('should combine all scoring factors', () => {
    const job = makeJob({
      title: 'Senior Backend Engineer', // +5 title
      company: 'stripe', // +2 company
      location: 'Remote', // +2 remote
      skills: ['typescript', 'node', 'postgresql'], // +9 skills
      experience: '2 years', // +1 experience
    });
    expect(rankJob(job, rules)).toBe(19);
  });

  it('should score 0 for completely unmatched job', () => {
    const job = makeJob({
      title: 'Marketing Manager',
      company: 'unknown-corp',
      location: 'London',
      skills: ['excel', 'powerpoint'],
    });
    expect(rankJob(job, rules)).toBe(0);
  });

  it('should only count title keyword once', () => {
    const job = makeJob({
      title: 'Backend Software Engineer Developer',
    });
    expect(rankJob(job, rules)).toBe(5); // not 15
  });
});

describe('meetsThreshold', () => {
  it('should return true for score >= minimum', () => {
    expect(meetsThreshold(8, rules)).toBe(true);
    expect(meetsThreshold(20, rules)).toBe(true);
  });

  it('should return false for score < minimum', () => {
    expect(meetsThreshold(7, rules)).toBe(false);
    expect(meetsThreshold(0, rules)).toBe(false);
  });
});
