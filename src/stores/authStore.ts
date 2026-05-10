// SPDX-License-Identifier: MIT

// authStore — token, region, storage-mode, and validation state.
//
// Separation per ARCHITECTURE.md §3:
//   - `token` is the credential. It rides whichever Storage backend the
//     user picks (local / session / cookie / memory) so privacy choice
//     stays the user's call.
//   - `region` and `storageMode` are *preferences* — they always live in
//     a fixed local backend. Otherwise the cold-start chicken-and-egg is
//     unsolvable: we need to know the storage mode before we know where
//     to look for the token.
//
// The store factory takes its dependencies as injected `Storage`
// instances + a SonarClient (or a getter so the client can read the
// current token by reference). In production a small wiring file calls
// `createAuthStore` once with the real `createStorage` and a real
// `SonarClient`. Tests inject in-memory `Storage` doubles and a mock
// client to drive every Result variant deterministically.

import { create } from 'zustand';

import type { SonarClient } from '../api/SonarClient';
import { cleanToken } from '../lib/sanitize';
import type { Storage, StorageMode } from '../lib/storage';

export type Region = 'eu' | 'us';
export type ValidationState = 'idle' | 'pending' | 'valid' | 'invalid';

export interface AuthState {
  token: string;
  region: Region;
  storageMode: StorageMode;
  validation: ValidationState;
}

export interface AuthActions {
  setToken(raw: string): void;
  setRegion(region: Region): void;
  setStorageMode(mode: StorageMode): void;
  validate(): Promise<void>;
  clear(): void;
}

export type AuthStore = AuthState & AuthActions;

export const PREF_KEYS = {
  storageMode: 'sift.storageMode',
  region: 'sift.region',
} as const;

export const TOKEN_KEY = 'sift.token';

const DEFAULT_REGION: Region = 'eu';
const DEFAULT_STORAGE_MODE: StorageMode = 'local';

type ListOrgs = Pick<SonarClient, 'listOrganizations'>;

export interface AuthStoreDeps {
  /** Persists region + storageMode. Always a fixed (local) backend. */
  prefsStorage: Storage;
  /** Factory for the token-bearing Storage given the user's chosen mode. */
  makeTokenStorage: (mode: StorageMode) => Storage;
  /**
   * SonarClient (or a getter that returns one). A function lets the caller
   * close over the current token so `validate()` always sends the latest.
   */
  client: ListOrgs | (() => ListOrgs);
  /**
   * Cold-start defaults a self-hoster can override at deploy time. A
   * persisted user choice always wins; these only apply on a first visit
   * (or after `clear()` wipes the prefs). Wiring at composition time
   * reads these from `import.meta.env.VITE_DEFAULT_*` — see
   * `readDefaultsFromEnv` below.
   */
  defaults?: {
    storageMode?: StorageMode;
    region?: Region;
  };
}

const isRegion = (v: string | null | undefined): v is Region => v === 'eu' || v === 'us';
const isStorageMode = (v: string | null | undefined): v is StorageMode =>
  v === 'local' || v === 'session' || v === 'cookie' || v === 'memory';

/**
 * Read deploy-time defaults from `import.meta.env` (Vite). A self-hosting
 * fork sets `VITE_DEFAULT_STORAGE_MODE` and/or `VITE_DEFAULT_REGION` at
 * build time; this helper validates the values and returns a defaults
 * object suitable for passing to `createAuthStore`. Unset or unrecognised
 * values are simply omitted, falling through to the project-wide
 * defaults (`'local'` / `'eu'`).
 */
export function readDefaultsFromEnv(): NonNullable<AuthStoreDeps['defaults']> {
  const env = import.meta.env;
  const defaults: NonNullable<AuthStoreDeps['defaults']> = {};
  const sm = env.VITE_DEFAULT_STORAGE_MODE;
  if (isStorageMode(sm)) defaults.storageMode = sm;
  const r = env.VITE_DEFAULT_REGION;
  if (isRegion(r)) defaults.region = r;
  return defaults;
}

export function createAuthStore(deps: AuthStoreDeps) {
  // Resolution order for cold-start defaults:
  //   1. persisted user choice (always wins once a user has touched it)
  //   2. deploy-time default from deps.defaults (self-hoster's knob)
  //   3. project-wide default constant
  const fallbackMode = deps.defaults?.storageMode ?? DEFAULT_STORAGE_MODE;
  const fallbackRegion = deps.defaults?.region ?? DEFAULT_REGION;

  // Hydrate from storage at construction time. The storeMode value drives
  // *where* we read the token from, so its lookup runs first.
  const persistedMode = deps.prefsStorage.get(PREF_KEYS.storageMode);
  const initialMode: StorageMode = isStorageMode(persistedMode) ? persistedMode : fallbackMode;

  const persistedRegion = deps.prefsStorage.get(PREF_KEYS.region);
  const initialRegion: Region = isRegion(persistedRegion) ? persistedRegion : fallbackRegion;

  const initialToken = deps.makeTokenStorage(initialMode).get(TOKEN_KEY) ?? '';

  const resolveClient = (): ListOrgs =>
    typeof deps.client === 'function' ? deps.client() : deps.client;

  return create<AuthStore>((set, get) => ({
    token: initialToken,
    region: initialRegion,
    storageMode: initialMode,
    validation: 'idle',

    setToken(raw) {
      const cleaned = cleanToken(raw);
      const storage = deps.makeTokenStorage(get().storageMode);
      if (cleaned.length > 0) {
        storage.set(TOKEN_KEY, cleaned);
      } else {
        storage.delete(TOKEN_KEY);
      }
      // A token change always invalidates any prior validation result —
      // 'idle' rather than 'invalid' so the UI can show a neutral state
      // until validate() runs.
      set({ token: cleaned, validation: 'idle' });
    },

    setRegion(region) {
      deps.prefsStorage.set(PREF_KEYS.region, region);
      // Region changes mean the prior validation was against a different
      // upstream — drop it.
      set({ region, validation: 'idle' });
    },

    setStorageMode(mode) {
      const oldMode = get().storageMode;
      if (oldMode === mode) return;
      // Migrate any existing token from the old backend to the new one
      // so users don't lose state when toggling the privacy knob.
      const oldStorage = deps.makeTokenStorage(oldMode);
      const newStorage = deps.makeTokenStorage(mode);
      const carry = oldStorage.get(TOKEN_KEY);
      oldStorage.delete(TOKEN_KEY);
      if (carry !== null && carry.length > 0) {
        newStorage.set(TOKEN_KEY, carry);
      }
      deps.prefsStorage.set(PREF_KEYS.storageMode, mode);
      set({ storageMode: mode });
    },

    async validate() {
      const { token } = get();
      if (token.length === 0) {
        set({ validation: 'invalid' });
        return;
      }
      set({ validation: 'pending' });
      const result = await resolveClient().listOrganizations();
      set({ validation: result.kind === 'ok' ? 'valid' : 'invalid' });
    },

    clear() {
      deps.makeTokenStorage(get().storageMode).delete(TOKEN_KEY);
      set({ token: '', validation: 'idle' });
    },
  }));
}
