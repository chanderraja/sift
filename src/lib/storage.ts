// SPDX-License-Identifier: MIT

// Storage adapter — the *only* place in the codebase that touches
// `window.localStorage`, `window.sessionStorage`, or `document.cookie`.
// Stores (Phase 4) and any later persistence consumer go through this
// interface so the underlying mode is a single user-controlled knob in
// the Settings drawer.
//
// Tradeoffs across modes (also documented in SECURITY.md):
//
//   - `local`   : persists across tabs and browser restarts. Most ergonomic;
//                 worst-case if a shared machine is used.
//   - `session` : persists only for the current tab's session. Cleared
//                 when the tab closes. Better default on shared machines.
//   - `cookie`  : session-scoped (no Max-Age set), `Path=/`, NOT HttpOnly
//                 (the SPA must read it). Provided so users on locked-down
//                 corporate browsers without Web Storage have a fallback.
//   - `memory`  : in-memory Map. Token gone on reload. Best privacy.
//
// `clear()` removes every key the adapter knows about. For Web Storage
// modes this means the entire backing storage; for cookies it removes only
// keys carrying the `SIFT_COOKIE_PREFIX`. The SPA is the sole writer to
// this origin (no third-party scripts per SPEC §13), so clearing the
// whole Web Storage is safe today.

export interface Storage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
  clear(): void;
}

export type StorageMode = 'local' | 'session' | 'cookie' | 'memory';

const SIFT_COOKIE_PREFIX = 'sift.';

export function createStorage(mode: StorageMode): Storage {
  switch (mode) {
    case 'local':
      return webStorageAdapter(window.localStorage);
    case 'session':
      return webStorageAdapter(window.sessionStorage);
    case 'cookie':
      return cookieAdapter();
    case 'memory':
      return memoryAdapter();
  }
}

const memoryAdapter = (): Storage => {
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

const webStorageAdapter = (backing: globalThis.Storage): Storage => ({
  get: (k) => backing.getItem(k),
  set: (k, v) => {
    backing.setItem(k, v);
  },
  delete: (k) => {
    backing.removeItem(k);
  },
  clear: () => {
    backing.clear();
  },
});

const cookieAdapter = (): Storage => {
  const cookieKey = (k: string): string => `${SIFT_COOKIE_PREFIX}${k}`;

  return {
    get: (k) => {
      const target = `${cookieKey(k)}=`;
      for (const raw of document.cookie.split(';')) {
        const cookie = raw.trim();
        if (cookie.startsWith(target)) {
          return decodeURIComponent(cookie.slice(target.length));
        }
      }
      return null;
    },
    set: (k, v) => {
      // Session-scoped: no Max-Age / Expires so the cookie dies with the
      // browser session. Path=/ so reload from any subpath sees it.
      document.cookie = `${cookieKey(k)}=${encodeURIComponent(v)}; Path=/; SameSite=Lax`;
    },
    delete: (k) => {
      document.cookie = `${cookieKey(k)}=; Path=/; Max-Age=0; SameSite=Lax`;
    },
    clear: () => {
      for (const raw of document.cookie.split(';')) {
        const cookie = raw.trim();
        if (!cookie.startsWith(SIFT_COOKIE_PREFIX)) continue;
        const eq = cookie.indexOf('=');
        const name = eq === -1 ? cookie : cookie.slice(0, eq);
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
      }
    },
  };
};
