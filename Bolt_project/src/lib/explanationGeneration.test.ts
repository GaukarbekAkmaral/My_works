import { describe, it, expect } from 'vitest';
import { ExplanationGeneration } from './explanation';

describe('ExplanationGeneration (stale-completion guard)', () => {
  it('token from begin() is current until invalidated or re-begun', () => {
    const gen = new ExplanationGeneration();
    const token = gen.begin();
    expect(gen.isCurrent(token)).toBe(true);
  });

  it('invalidate() makes prior tokens stale', () => {
    const gen = new ExplanationGeneration();
    const token = gen.begin();
    gen.invalidate();
    expect(gen.isCurrent(token)).toBe(false);
  });

  it('a newer begin() makes the older token stale (fix 1: stale async ignored)', () => {
    const gen = new ExplanationGeneration();
    const oldToken = gen.begin();
    const newToken = gen.begin();
    expect(gen.isCurrent(oldToken)).toBe(false);
    expect(gen.isCurrent(newToken)).toBe(true);
  });

  it('stale completions are ignored while fresh ones proceed', () => {
    const gen = new ExplanationGeneration();
    const stale = gen.begin();
    gen.begin(); // inputs changed; stale request superseded
    expect(gen.isCurrent(stale)).toBe(false);
  });
});
