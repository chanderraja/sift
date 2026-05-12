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

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (isTypingTarget(e.target)) return;
      if (e.key === '?') useUiStore.getState().setShortcutsOpen(true);
      if (e.key === 'e') useUiStore.getState().setExportOpen(true);
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, []);
}
