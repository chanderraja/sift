// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';

import { parse, serialize } from './hashSync';

describe('serialize', () => {
  it('always prepends v=1 first', () => {
    expect(serialize({}).startsWith('v=1')).toBe(true);
  });

  it('emits a single version-only parameter for empty state', () => {
    expect(serialize({})).toBe('v=1');
  });

  it('appends user keys after the version', () => {
    const result = serialize({ region: 'eu', branch: 'main' });
    expect(result.startsWith('v=1')).toBe(true);
    expect(result).toContain('region=eu');
    expect(result).toContain('branch=main');
  });

  it('URL-encodes values with special characters', () => {
    const result = serialize({ branch: 'feature/foo bar', tag: 'a&b' });
    expect(result).toContain('branch=feature%2Ffoo+bar');
    expect(result).toContain('tag=a%26b');
  });

  it('drops any user-supplied "v" key (the version is reserved)', () => {
    // Even if a misbehaving caller passes v, the schema version wins.
    const out = serialize({ v: 'malicious', region: 'us' });
    expect(out).toContain('v=1');
    expect(out).not.toContain('v=malicious');
  });
});

describe('parse', () => {
  it('returns empty state for empty hash', () => {
    expect(parse('')).toEqual({});
  });

  it('returns empty state for empty hash with leading #', () => {
    expect(parse('#')).toEqual({});
  });

  it('strips a leading # before parsing', () => {
    expect(parse('#v=1&region=eu')).toEqual({ region: 'eu' });
  });

  it('returns empty state when the version parameter is missing', () => {
    // Hash from a non-Sift hash router or a manual edit — refuse rather
    // than risk mis-applying defaults.
    expect(parse('region=eu&branch=main')).toEqual({});
  });

  it('returns empty state when the version is unknown', () => {
    expect(parse('v=99&region=eu')).toEqual({});
  });

  it('parses a single non-version key', () => {
    expect(parse('v=1&region=eu')).toEqual({ region: 'eu' });
  });

  it('parses multiple keys and excludes the version itself', () => {
    expect(parse('v=1&region=us&branch=main&tab=issues')).toEqual({
      region: 'us',
      branch: 'main',
      tab: 'issues',
    });
  });

  it('decodes URL-encoded values', () => {
    expect(parse('v=1&branch=feature%2Ffoo+bar&tag=a%26b')).toEqual({
      branch: 'feature/foo bar',
      tag: 'a&b',
    });
  });

  it('passes unknown keys through (the integration layer filters them)', () => {
    expect(parse('v=1&region=eu&futureField=xyz')).toEqual({
      region: 'eu',
      futureField: 'xyz',
    });
  });

  it('handles malformed key=value pairs without throwing', () => {
    // A trailing `&` and a key with no value: URLSearchParams tolerates both.
    const result = parse('v=1&region=eu&&orphan');
    expect(result.region).toBe('eu');
    // The `orphan` key is included with an empty string value — that's the
    // URLSearchParams behaviour. Important: it doesn't throw.
    expect(result.orphan).toBe('');
  });
});

describe('round-trip', () => {
  const cases: Readonly<Record<string, string>>[] = [
    {},
    { region: 'eu' },
    { region: 'us', branch: 'main', tab: 'issues' },
    { sev: 'BLOCKER,CRITICAL', type: 'BUG,VULNERABILITY' },
    { branch: 'feature/foo bar', tag: 'a&b=c' },
  ];

  it.each(cases)('parse(serialize(%j)) deep-equals input', (state) => {
    expect(parse(serialize(state))).toEqual(state);
  });
});
