import { describe, it, expect } from 'vitest';

describe('project setup', () => {
  it('should run tests successfully', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support async tests', async () => {
    const result = await Promise.resolve('ok');
    expect(result).toBe('ok');
  });
});
