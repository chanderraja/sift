// SPDX-License-Identifier: MIT

// App-level composition wiring. Module-scope singletons for each
// Zustand store + a helper that constructs a SonarClient bound to the
// live auth state. The factories themselves live in `src/stores/` so
// they remain testable in isolation; this file is what production
// code imports when it wants the actually-running app instance.

import { SonarClient } from '../api/SonarClient';
import { createStorage } from '../lib/storage';
import { createAuthStore, readDefaultsFromEnv } from '../stores/authStore';
import { createFiltersStore } from '../stores/filtersStore';
import { createPrefsStore } from '../stores/prefsStore';
import { createSelectionStore } from '../stores/selectionStore';
import { createUiStore } from '../stores/uiStore';

// Preferences (region, storageMode, theme, etc.) always ride a fixed
// local backend so cold-start can find them before knowing the
// user's chosen mode for the credential.
const prefsStorage = createStorage('local');

// The SonarClient factory closes over the auth store, but the store
// is what we're building. Use a small forward-reference Box so the
// closure can read the store at validate-call-time without a
// chicken-and-egg `let`.
type AuthStore = ReturnType<typeof createAuthStore>;
const authStoreRef: { current: AuthStore | null } = { current: null };

const buildClient = (): SonarClient => {
  const store = authStoreRef.current;
  if (store === null) throw new Error('authStore not initialized');
  const { region } = store.getState();
  return new SonarClient({
    region,
    getToken: () => store.getState().token,
  });
};

const authStore = createAuthStore({
  prefsStorage,
  makeTokenStorage: createStorage,
  client: buildClient,
  defaults: readDefaultsFromEnv(),
});
authStoreRef.current = authStore;

export const useAuthStore = authStore;
export const useSelectionStore = createSelectionStore();
export const useFiltersStore = createFiltersStore();
export const usePrefsStore = createPrefsStore({ storage: prefsStorage });
export const useUiStore = createUiStore();

/**
 * Singleton SonarClient bound to the live auth store. Pickers and
 * tabs import this rather than constructing their own — TanStack Query
 * keys off the queryKey, not the client identity, but a stable client
 * keeps the query functions referentially stable too.
 */
export const sonarClient = buildClient();

/**
 * Build a fresh SonarClient bound to the current auth state. Use the
 * `sonarClient` singleton above for production paths; this factory is
 * here for tests and any caller that wants a one-off instance.
 */
export const makeAppSonarClient = (): SonarClient => buildClient();
