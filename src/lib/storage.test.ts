// SPDX-License-Identifier: MIT

// @vitest-environment jsdom

// storage.test.ts opts into jsdom via the directive above so the Web
// Storage modes (local/session) and cookie mode have a real document
// to talk to. The file lives in src/lib/ alongside the rest of the
// pure-utility tests; the per-file env directive is the smallest
// override that keeps the project routing intact.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { StorageMode } from './storage';
import { createStorage } from './storage';

const wipeAllBackings = (): void => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  for (const raw of document.cookie.split(';')) {
    const cookie = raw.trim();
    if (cookie.length === 0) continue;
    const eq = cookie.indexOf('=');
    const name = eq === -1 ? cookie : cookie.slice(0, eq);
    document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
};

beforeEach(wipeAllBackings);
afterEach(wipeAllBackings);

const MODES: readonly StorageMode[] = ['local', 'session', 'cookie', 'memory'];

describe.each(MODES)('createStorage(%s)', (mode) => {
  it('round-trips set + get', () => {
    const s = createStorage(mode);
    s.set('token', 'squ_abc123');
    expect(s.get('token')).toBe('squ_abc123');
  });

  it('returns null for an unset key', () => {
    const s = createStorage(mode);
    expect(s.get('never-set')).toBeNull();
  });

  it('overwrites an existing value with set', () => {
    const s = createStorage(mode);
    s.set('region', 'eu');
    s.set('region', 'us');
    expect(s.get('region')).toBe('us');
  });

  it('delete removes only the targeted key', () => {
    const s = createStorage(mode);
    s.set('a', '1');
    s.set('b', '2');
    s.delete('a');
    expect(s.get('a')).toBeNull();
    expect(s.get('b')).toBe('2');
  });

  it('clear empties every key the adapter set', () => {
    const s = createStorage(mode);
    s.set('a', '1');
    s.set('b', '2');
    s.clear();
    expect(s.get('a')).toBeNull();
    expect(s.get('b')).toBeNull();
  });

  it('isolates keys (no accidental aliasing)', () => {
    const s = createStorage(mode);
    s.set('foo', 'first');
    s.set('foobar', 'second');
    expect(s.get('foo')).toBe('first');
    expect(s.get('foobar')).toBe('second');
  });

  it('round-trips values containing special characters', () => {
    const s = createStorage(mode);
    const value = 'spaces, ; semicolons, "quotes", and = equals';
    s.set('weird', value);
    expect(s.get('weird')).toBe(value);
  });

  it('two adapters of the same mode see each other (shared backing)', () => {
    // memory mode is the exception: each createStorage('memory') gets its
    // own Map so adapters are isolated by construction. Web Storage and
    // cookies are origin-global, so two adapters share state.
    const a = createStorage(mode);
    const b = createStorage(mode);
    a.set('shared', 'yes');
    if (mode === 'memory') {
      expect(b.get('shared')).toBeNull();
    } else {
      expect(b.get('shared')).toBe('yes');
    }
  });
});

describe('createStorage — backing isolation between modes', () => {
  it('does not leak values between local and session', () => {
    const local = createStorage('local');
    const session = createStorage('session');
    local.set('only-local', 'L');
    session.set('only-session', 'S');
    expect(session.get('only-local')).toBeNull();
    expect(local.get('only-session')).toBeNull();
  });

  it('cookie mode does not leak into Web Storage', () => {
    const cookie = createStorage('cookie');
    const local = createStorage('local');
    cookie.set('cookie-only', 'C');
    expect(local.get('cookie-only')).toBeNull();
  });
});
