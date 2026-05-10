// SPDX-License-Identifier: MIT

// Long-lived UI preferences: theme, default page size, default
// Markdown export template, last-active tab. None of these are
// credentials, so they all ride a single fixed (typically local)
// Storage backend rather than the user's chosen-mode auth backend.
//
// Each setter persists synchronously and updates the in-memory state
// in the same call, so a Settings drawer toggle takes effect on the
// next render. Hydration reads from storage at construction time and
// falls back to defaults for missing or malformed values.

import { create } from 'zustand';

import type { Storage } from '../lib/storage';

export type Theme = 'system' | 'light' | 'dark';
export type MarkdownTemplate = 'triage' | 'by-file' | 'by-rule' | 'llm-remediation';
export type PrefsTab = 'issues' | 'hotspots' | 'quality-gate';

export interface PrefsState {
  theme: Theme;
  defaultPageSize: number;
  defaultMarkdownTemplate: MarkdownTemplate;
  lastTab: PrefsTab;
}

export interface PrefsActions {
  setTheme(theme: Theme): void;
  setDefaultPageSize(n: number): void;
  setDefaultMarkdownTemplate(t: MarkdownTemplate): void;
  setLastTab(t: PrefsTab): void;
  reset(): void;
}

export type PrefsStore = PrefsState & PrefsActions;

export const PREF_KEYS = {
  theme: 'sift.prefs.theme',
  defaultPageSize: 'sift.prefs.defaultPageSize',
  defaultMarkdownTemplate: 'sift.prefs.defaultMarkdownTemplate',
  lastTab: 'sift.prefs.lastTab',
} as const;

const DEFAULTS: PrefsState = {
  theme: 'system',
  defaultPageSize: 100,
  defaultMarkdownTemplate: 'triage',
  lastTab: 'issues',
};

const isTheme = (v: string | null): v is Theme => v === 'system' || v === 'light' || v === 'dark';

const isTemplate = (v: string | null): v is MarkdownTemplate =>
  v === 'triage' || v === 'by-file' || v === 'by-rule' || v === 'llm-remediation';

const isTab = (v: string | null): v is PrefsTab =>
  v === 'issues' || v === 'hotspots' || v === 'quality-gate';

const parsePageSize = (v: string | null): number | null => {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export interface PrefsStoreDeps {
  storage: Storage;
}

export function createPrefsStore(deps: PrefsStoreDeps) {
  const t = deps.storage.get(PREF_KEYS.theme);
  const dt = deps.storage.get(PREF_KEYS.defaultMarkdownTemplate);
  const lt = deps.storage.get(PREF_KEYS.lastTab);
  const ps = parsePageSize(deps.storage.get(PREF_KEYS.defaultPageSize));

  const initial: PrefsState = {
    theme: isTheme(t) ? t : DEFAULTS.theme,
    defaultPageSize: ps ?? DEFAULTS.defaultPageSize,
    defaultMarkdownTemplate: isTemplate(dt) ? dt : DEFAULTS.defaultMarkdownTemplate,
    lastTab: isTab(lt) ? lt : DEFAULTS.lastTab,
  };

  return create<PrefsStore>((set) => ({
    ...initial,

    setTheme(theme) {
      deps.storage.set(PREF_KEYS.theme, theme);
      set({ theme });
    },

    setDefaultPageSize(n) {
      deps.storage.set(PREF_KEYS.defaultPageSize, String(n));
      set({ defaultPageSize: n });
    },

    setDefaultMarkdownTemplate(t) {
      deps.storage.set(PREF_KEYS.defaultMarkdownTemplate, t);
      set({ defaultMarkdownTemplate: t });
    },

    setLastTab(t) {
      deps.storage.set(PREF_KEYS.lastTab, t);
      set({ lastTab: t });
    },

    reset() {
      for (const key of Object.values(PREF_KEYS)) deps.storage.delete(key);
      set({ ...DEFAULTS });
    },
  }));
}
