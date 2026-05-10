// SPDX-License-Identifier: MIT

// Transient UI state — overlay open/close, drawer visibility, etc.
// Not persisted; lost on reload by design (no reason to remember
// "Settings drawer was open" across sessions).

import { create } from 'zustand';

export interface UiState {
  settingsOpen: boolean;
  exportOpen: boolean;
}

export interface UiActions {
  setSettingsOpen(open: boolean): void;
  setExportOpen(open: boolean): void;
  closeAll(): void;
}

export type UiStore = UiState & UiActions;

export function createUiStore() {
  return create<UiStore>((set) => ({
    settingsOpen: false,
    exportOpen: false,
    setSettingsOpen(settingsOpen) {
      set({ settingsOpen });
    },
    setExportOpen(exportOpen) {
      set({ exportOpen });
    },
    closeAll() {
      set({ settingsOpen: false, exportOpen: false });
    },
  }));
}
