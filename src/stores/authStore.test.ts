// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Storage, StorageMode } from '../lib/storage';
import { PREF_KEYS, TOKEN_KEY, createAuthStore, readDefaultsFromEnv } from './authStore';

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

const okClient = { validateToken: vi.fn().mockResolvedValue({ kind: 'ok', value: true }) };

describe('authStore — initial state hydration', () => {
  it('uses defaults when storage is empty', () => {
    const store = createAuthStore({
      prefsStorage: makeMemoryStorage(),
      makeTokenStorage: () => makeMemoryStorage(),
      client: okClient,
    });
    const s = store.getState();
    expect(s.token).toBe('');
    expect(s.region).toBe('eu');
    expect(s.storageMode).toBe('local');
    expect(s.validation).toBe('idle');
  });

  it('hydrates region and storageMode from prefsStorage', () => {
    const prefs = makeMemoryStorage();
    prefs.set(PREF_KEYS.region, 'us');
    prefs.set(PREF_KEYS.storageMode, 'session');
    const store = createAuthStore({
      prefsStorage: prefs,
      makeTokenStorage: () => makeMemoryStorage(),
      client: okClient,
    });
    expect(store.getState().region).toBe('us');
    expect(store.getState().storageMode).toBe('session');
  });

  it('falls back to defaults when prefsStorage holds garbage', () => {
    const prefs = makeMemoryStorage();
    prefs.set(PREF_KEYS.region, 'apac');
    prefs.set(PREF_KEYS.storageMode, 'mars');
    const store = createAuthStore({
      prefsStorage: prefs,
      makeTokenStorage: () => makeMemoryStorage(),
      client: okClient,
    });
    expect(store.getState().region).toBe('eu');
    expect(store.getState().storageMode).toBe('local');
  });

  it('uses deps.defaults when prefsStorage is empty', () => {
    const store = createAuthStore({
      prefsStorage: makeMemoryStorage(),
      makeTokenStorage: () => makeMemoryStorage(),
      client: okClient,
      defaults: { storageMode: 'session', region: 'us' },
    });
    expect(store.getState().storageMode).toBe('session');
    expect(store.getState().region).toBe('us');
  });

  it('persisted user choice wins over deps.defaults', () => {
    const prefs = makeMemoryStorage();
    prefs.set(PREF_KEYS.storageMode, 'memory');
    prefs.set(PREF_KEYS.region, 'eu');
    const store = createAuthStore({
      prefsStorage: prefs,
      makeTokenStorage: () => makeMemoryStorage(),
      client: okClient,
      defaults: { storageMode: 'session', region: 'us' },
    });
    expect(store.getState().storageMode).toBe('memory');
    expect(store.getState().region).toBe('eu');
  });

  it('partial deps.defaults still falls through to project default for the missing field', () => {
    const store = createAuthStore({
      prefsStorage: makeMemoryStorage(),
      makeTokenStorage: () => makeMemoryStorage(),
      client: okClient,
      defaults: { region: 'us' },
    });
    expect(store.getState().region).toBe('us');
    expect(store.getState().storageMode).toBe('local');
  });

  it('reads the token from the storage matching the persisted mode', () => {
    const prefs = makeMemoryStorage();
    prefs.set(PREF_KEYS.storageMode, 'session');
    const sessionStore = makeMemoryStorage();
    sessionStore.set(TOKEN_KEY, 'squ_existing');
    const localStore = makeMemoryStorage();
    localStore.set(TOKEN_KEY, 'squ_wrong-mode'); // shouldn't be picked up
    const store = createAuthStore({
      prefsStorage: prefs,
      makeTokenStorage: (mode) => (mode === 'session' ? sessionStore : localStore),
      client: okClient,
    });
    expect(store.getState().token).toBe('squ_existing');
  });
});

describe('authStore.setToken', () => {
  it('sanitizes via cleanToken (strips whitespace and zero-width space)', () => {
    const tokenStore = makeMemoryStorage();
    const store = createAuthStore({
      prefsStorage: makeMemoryStorage(),
      makeTokenStorage: () => tokenStore,
      client: okClient,
    });
    store.getState().setToken('   abc​def   ');
    expect(store.getState().token).toBe('abcdef');
    expect(tokenStore.get(TOKEN_KEY)).toBe('abcdef');
  });

  it('deletes the storage entry when the cleaned token is empty', () => {
    const tokenStore = makeMemoryStorage();
    tokenStore.set(TOKEN_KEY, 'previous');
    const store = createAuthStore({
      prefsStorage: makeMemoryStorage(),
      makeTokenStorage: () => tokenStore,
      client: okClient,
    });
    store.getState().setToken('   ');
    expect(store.getState().token).toBe('');
    expect(tokenStore.get(TOKEN_KEY)).toBeNull();
  });

  it('resets validation to idle when token changes', () => {
    const store = createAuthStore({
      prefsStorage: makeMemoryStorage(),
      makeTokenStorage: () => makeMemoryStorage(),
      client: okClient,
    });
    // Force validation into a non-idle state, then change the token.
    store.setState({ validation: 'valid' });
    store.getState().setToken('squ_new');
    expect(store.getState().validation).toBe('idle');
  });
});

describe('authStore.setRegion', () => {
  it('persists region and resets validation', () => {
    const prefs = makeMemoryStorage();
    const store = createAuthStore({
      prefsStorage: prefs,
      makeTokenStorage: () => makeMemoryStorage(),
      client: okClient,
    });
    store.setState({ validation: 'valid' });
    store.getState().setRegion('us');
    expect(store.getState().region).toBe('us');
    expect(prefs.get(PREF_KEYS.region)).toBe('us');
    expect(store.getState().validation).toBe('idle');
  });
});

describe('authStore.setStorageMode', () => {
  const makeMultiStorageFactory = () => {
    const storages: Record<StorageMode, Storage> = {
      local: makeMemoryStorage(),
      session: makeMemoryStorage(),
      cookie: makeMemoryStorage(),
      memory: makeMemoryStorage(),
    };
    return { storages, factory: (mode: StorageMode): Storage => storages[mode] };
  };

  it('migrates the token from the old mode to the new mode', () => {
    const { storages, factory } = makeMultiStorageFactory();
    const store = createAuthStore({
      prefsStorage: makeMemoryStorage(),
      makeTokenStorage: factory,
      client: okClient,
    });
    store.getState().setToken('squ_abc');
    expect(storages.local.get(TOKEN_KEY)).toBe('squ_abc');

    store.getState().setStorageMode('session');
    expect(store.getState().storageMode).toBe('session');
    expect(storages.local.get(TOKEN_KEY)).toBeNull();
    expect(storages.session.get(TOKEN_KEY)).toBe('squ_abc');
  });

  it('persists the new mode to prefsStorage', () => {
    const { factory } = makeMultiStorageFactory();
    const prefs = makeMemoryStorage();
    const store = createAuthStore({
      prefsStorage: prefs,
      makeTokenStorage: factory,
      client: okClient,
    });
    store.getState().setStorageMode('memory');
    expect(prefs.get(PREF_KEYS.storageMode)).toBe('memory');
  });

  it('is a no-op when the new mode equals the current mode', () => {
    const { storages, factory } = makeMultiStorageFactory();
    const store = createAuthStore({
      prefsStorage: makeMemoryStorage(),
      makeTokenStorage: factory,
      client: okClient,
    });
    store.getState().setToken('squ_abc');
    store.getState().setStorageMode('local');
    expect(storages.local.get(TOKEN_KEY)).toBe('squ_abc');
  });
});

describe('authStore.validate', () => {
  it('sets invalid immediately when token is empty', async () => {
    const client = { validateToken: vi.fn() };
    const store = createAuthStore({
      prefsStorage: makeMemoryStorage(),
      makeTokenStorage: () => makeMemoryStorage(),
      client,
    });
    await store.getState().validate();
    expect(store.getState().validation).toBe('invalid');
    expect(client.validateToken).not.toHaveBeenCalled();
  });

  it('transitions idle → pending → valid on Result.ok true', async () => {
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const client = {
      validateToken: vi.fn().mockImplementation(async () => {
        await pending;
        return { kind: 'ok', value: true };
      }),
    };
    const store = createAuthStore({
      prefsStorage: makeMemoryStorage(),
      makeTokenStorage: () => makeMemoryStorage(),
      client,
    });
    store.getState().setToken('squ_abc');
    const validatePromise = store.getState().validate();
    expect(store.getState().validation).toBe('pending');
    release();
    await validatePromise;
    expect(store.getState().validation).toBe('valid');
  });

  it('sets invalid when validateToken resolves to ok false (revoked token)', async () => {
    const client = { validateToken: vi.fn().mockResolvedValue({ kind: 'ok', value: false }) };
    const store = createAuthStore({
      prefsStorage: makeMemoryStorage(),
      makeTokenStorage: () => makeMemoryStorage(),
      client,
    });
    store.getState().setToken('squ_revoked');
    await store.getState().validate();
    expect(store.getState().validation).toBe('invalid');
  });

  it.each([['unauthorized'], ['forbidden'], ['rate_limited'], ['server_error'], ['network_error']])(
    'sets invalid when validateToken resolves to %s',
    async (kind) => {
      const client = { validateToken: vi.fn().mockResolvedValue({ kind }) };
      const store = createAuthStore({
        prefsStorage: makeMemoryStorage(),
        makeTokenStorage: () => makeMemoryStorage(),
        client,
      });
      store.getState().setToken('squ_bad');
      await store.getState().validate();
      expect(store.getState().validation).toBe('invalid');
    },
  );

  it('uses the latest token when client is provided as a getter', async () => {
    let lastToken = '';
    const store = createAuthStore({
      prefsStorage: makeMemoryStorage(),
      makeTokenStorage: () => makeMemoryStorage(),
      client: () => ({
        validateToken: () => {
          lastToken = store.getState().token;
          return Promise.resolve({ kind: 'ok', value: true });
        },
      }),
    });
    store.getState().setToken('squ_first');
    await store.getState().validate();
    expect(lastToken).toBe('squ_first');
    store.getState().setToken('squ_second');
    await store.getState().validate();
    expect(lastToken).toBe('squ_second');
  });
});

describe('readDefaultsFromEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns an empty object when neither env var is set', () => {
    expect(readDefaultsFromEnv()).toEqual({});
  });

  it('reads VITE_DEFAULT_STORAGE_MODE when valid', () => {
    vi.stubEnv('VITE_DEFAULT_STORAGE_MODE', 'session');
    expect(readDefaultsFromEnv()).toEqual({ storageMode: 'session' });
  });

  it('reads VITE_DEFAULT_REGION when valid', () => {
    vi.stubEnv('VITE_DEFAULT_REGION', 'us');
    expect(readDefaultsFromEnv()).toEqual({ region: 'us' });
  });

  it('reads both when both valid', () => {
    vi.stubEnv('VITE_DEFAULT_STORAGE_MODE', 'cookie');
    vi.stubEnv('VITE_DEFAULT_REGION', 'us');
    expect(readDefaultsFromEnv()).toEqual({ storageMode: 'cookie', region: 'us' });
  });

  it('rejects garbage values without throwing', () => {
    vi.stubEnv('VITE_DEFAULT_STORAGE_MODE', 'mars');
    vi.stubEnv('VITE_DEFAULT_REGION', 'apac');
    expect(readDefaultsFromEnv()).toEqual({});
  });
});

describe('authStore.clear', () => {
  it('wipes token from in-memory state and storage', () => {
    const tokenStore = makeMemoryStorage();
    const store = createAuthStore({
      prefsStorage: makeMemoryStorage(),
      makeTokenStorage: () => tokenStore,
      client: okClient,
    });
    store.getState().setToken('squ_abc');
    expect(tokenStore.get(TOKEN_KEY)).toBe('squ_abc');
    store.setState({ validation: 'valid' });

    store.getState().clear();

    expect(store.getState().token).toBe('');
    expect(tokenStore.get(TOKEN_KEY)).toBeNull();
    expect(store.getState().validation).toBe('idle');
  });
});
