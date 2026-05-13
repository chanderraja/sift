// SPDX-License-Identifier: MIT

// Global keyboard shortcut handler per SPEC §16.8.
// Guards against firing inside text inputs so typing isn't hijacked.

import { useEffect } from 'react';

import { useUiStore } from '../../app/stores';

const TEXT_INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (target instanceof HTMLElement) {
    if (TEXT_INPUT_TAGS.has(target.tagName)) return true;
    if (target.isContentEditable) return true;
  }
  return false;
};

const dataRows = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-row]'));

const handleRowNav = (key: 'j' | 'k'): void => {
  const rows = dataRows();
  if (rows.length === 0) return;
  const idx = rows.indexOf(document.activeElement as HTMLElement);
  if (key === 'j') {
    const next = idx < 0 ? rows[0] : rows[Math.min(idx + 1, rows.length - 1)];
    next?.focus();
  } else {
    if (idx <= 0) return;
    rows[idx - 1]?.focus();
  }
};

const handleEnter = (): void => {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.dataset.row !== undefined) {
    active.click();
  }
};

const handleSlash = (e: KeyboardEvent): void => {
  e.preventDefault();
  const input = document.querySelector<HTMLElement>('[data-testid="issues-filter-sidebar"] input');
  input?.focus();
};

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (isTypingTarget(e.target)) return;
      if (e.key === '?') useUiStore.getState().setShortcutsOpen(true);
      if (e.key === 'e') useUiStore.getState().setExportOpen(true);
      if (e.key === 'j' || e.key === 'k') handleRowNav(e.key);
      if (e.key === 'Enter') handleEnter();
      if (e.key === '/') handleSlash(e);
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, []);
}
