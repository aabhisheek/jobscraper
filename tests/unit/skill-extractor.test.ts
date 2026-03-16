import { describe, it, expect } from 'vitest';
import { extractSkills } from '../../src/parser/skill-extractor.js';

describe('extractSkills', () => {
  it('should extract known skills from text', () => {
    const text = 'We need experience with TypeScript, Node.js, and PostgreSQL';
    const skills = extractSkills(text);
    expect(skills).toContain('typescript');
    expect(skills).toContain('node');
    expect(skills).toContain('postgresql');
  });

  it('should be case insensitive', () => {
    const text = 'REACT and PYTHON and docker';
    const skills = extractSkills(text);
    expect(skills).toContain('react');
    expect(skills).toContain('python');
    expect(skills).toContain('docker');
  });

  it('should normalize aliases', () => {
    const text = 'Experience with Node.js and ReactJS and k8s';
    const skills = extractSkills(text);
    expect(skills).toContain('node');
    expect(skills).toContain('react');
    expect(skills).toContain('kubernetes');
  });

  it('should not duplicate skills', () => {
    const text = 'Node.js nodejs Node experience required';
    const skills = extractSkills(text);
    const nodeCount = skills.filter((s) => s === 'node').length;
    expect(nodeCount).toBe(1);
  });

  it('should return sorted skills', () => {
    const text = 'Python, TypeScript, AWS, Docker';
    const skills = extractSkills(text);
    const sorted = [...skills].sort();
    expect(skills).toEqual(sorted);
  });

  it('should return empty array for no matches', () => {
    const text = 'We need someone who is a good communicator';
    const skills = extractSkills(text);
    expect(skills).toEqual([]);
  });

  it('should match whole words only', () => {
    const text = 'We use a custom framework with goodies';
    const skills = extractSkills(text);
    expect(skills).not.toContain('go');
  });

  it('should extract cloud providers', () => {
    const text = 'Deploy to AWS and Google Cloud Platform with Terraform';
    const skills = extractSkills(text);
    expect(skills).toContain('aws');
    expect(skills).toContain('gcp');
    expect(skills).toContain('terraform');
  });
});
