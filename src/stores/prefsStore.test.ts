// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';

import type { Storage } from '../lib/storage';
import { PREF_KEYS, createPrefsStore } from './prefsStore';

const makeMemoryStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => {
      map.set(k, v);
    },
    delete: (k) => {
      map.delete(k);
    },
    clear: () => {
      map.clear();
    },
  };
};

describe('prefsStore — initial state hydration', () => {
  it('uses defaults when storage is empty', () => {
    const s = createPrefsStore({ storage: makeMemoryStorage() }).getState();
    expect(s.theme).toBe('system');
    expect(s.defaultPageSize).toBe(100);
    expect(s.defaultMarkdownTemplate).toBe('triage');
    expect(s.lastTab).toBe('issues');
  });

  it('hydrates every preference from storage', () => {
    const storage = makeMemoryStorage();
    storage.set(PREF_KEYS.theme, 'dark');
    storage.set(PREF_KEYS.defaultPageSize, '200');
    storage.set(PREF_KEYS.defaultMarkdownTemplate, 'llm-remediation');
    storage.set(PREF_KEYS.lastTab, 'hotspots');

    const s = createPrefsStore({ storage }).getState();
    expect(s.theme).toBe('dark');
    expect(s.defaultPageSize).toBe(200);
    expect(s.defaultMarkdownTemplate).toBe('llm-remediation');
    expect(s.lastTab).toBe('hotspots');
  });

  it.each([
    ['theme', 'pink'],
    ['defaultMarkdownTemplate', 'novel'],
    ['lastTab', 'spaceship'],
  ] as const)('falls back to default when storage holds garbage in %s', (field, garbage) => {
    const storage = makeMemoryStorage();
    storage.set(PREF_KEYS[field], garbage);
    const s = createPrefsStore({ storage }).getState();
    if (field === 'theme') expect(s.theme).toBe('system');
    else if (field === 'defaultMarkdownTemplate') expect(s.defaultMarkdownTemplate).toBe('triage');
    else expect(s.lastTab).toBe('issues');
  });

  it('falls back to default page size on a non-numeric value', () => {
    const storage = makeMemoryStorage();
    storage.set(PREF_KEYS.defaultPageSize, 'definitely not a number');
    expect(createPrefsStore({ storage }).getState().defaultPageSize).toBe(100);
  });

  it('falls back to default page size on a non-positive number', () => {
    const storage = makeMemoryStorage();
    storage.set(PREF_KEYS.defaultPageSize, '0');
    expect(createPrefsStore({ storage }).getState().defaultPageSize).toBe(100);
    storage.set(PREF_KEYS.defaultPageSize, '-50');
    expect(createPrefsStore({ storage }).getState().defaultPageSize).toBe(100);
  });
});

describe('prefsStore — setters persist and update state', () => {
  it('setTheme', () => {
    const storage = makeMemoryStorage();
    const store = createPrefsStore({ storage });
    store.getState().setTheme('dark');
    expect(store.getState().theme).toBe('dark');
    expect(storage.get(PREF_KEYS.theme)).toBe('dark');
  });

  it('setDefaultPageSize', () => {
    const storage = makeMemoryStorage();
    const store = createPrefsStore({ storage });
    store.getState().setDefaultPageSize(50);
    expect(store.getState().defaultPageSize).toBe(50);
    expect(storage.get(PREF_KEYS.defaultPageSize)).toBe('50');
  });

  it('setDefaultMarkdownTemplate', () => {
    const storage = makeMemoryStorage();
    const store = createPrefsStore({ storage });
    store.getState().setDefaultMarkdownTemplate('by-file');
    expect(store.getState().defaultMarkdownTemplate).toBe('by-file');
    expect(storage.get(PREF_KEYS.defaultMarkdownTemplate)).toBe('by-file');
  });

  it('setLastTab', () => {
    const storage = makeMemoryStorage();
    const store = createPrefsStore({ storage });
    store.getState().setLastTab('quality-gate');
    expect(store.getState().lastTab).toBe('quality-gate');
    expect(storage.get(PREF_KEYS.lastTab)).toBe('quality-gate');
  });
});

describe('prefsStore.reset', () => {
  it('wipes every key from storage and restores defaults', () => {
    const storage = makeMemoryStorage();
    const store = createPrefsStore({ storage });
    store.getState().setTheme('light');
    store.getState().setDefaultPageSize(500);
    store.getState().setDefaultMarkdownTemplate('by-rule');
    store.getState().setLastTab('hotspots');

    store.getState().reset();

    const s = store.getState();
    expect(s.theme).toBe('system');
    expect(s.defaultPageSize).toBe(100);
    expect(s.defaultMarkdownTemplate).toBe('triage');
    expect(s.lastTab).toBe('issues');
    for (const key of Object.values(PREF_KEYS)) {
      expect(storage.get(key)).toBeNull();
    }
  });
});
