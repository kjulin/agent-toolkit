import { describe, it, expect } from 'vitest';
import { capitalize } from '../src/string-utils';

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });
});
