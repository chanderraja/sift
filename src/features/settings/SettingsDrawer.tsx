// SPDX-License-Identifier: MIT

// Settings drawer — slides in from the right (Phase 11). Bound to
// uiStore.settingsOpen so it can be mounted once in App.tsx and
// controlled via the header gear button.

import { Button } from '../../components/primitives/Button';
import { Drawer } from '../../components/primitives/Drawer';
import { Radio, RadioGroup } from '../../components/primitives/RadioGroup';
import {
  useAuthStore,
  useFiltersStore,
  usePrefsStore,
  useSelectionStore,
  useUiStore,
} from '../../app/stores';
import type { StorageMode } from '../../lib/storage';
import type { Theme } from '../../stores/prefsStore';

const THEMES: readonly { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const STORAGE_MODES: readonly { value: StorageMode; label: string }[] = [
  { value: 'local', label: 'Local storage (persists across sessions)' },
  { value: 'session', label: 'Session storage (cleared on tab close)' },
  { value: 'cookie', label: 'Cookie' },
  { value: 'memory', label: 'Memory (cleared on page reload)' },
];

export function SettingsDrawer(): React.JSX.Element {
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setSettingsOpen = useUiStore.getState().setSettingsOpen;
  const theme = usePrefsStore((s) => s.theme);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setTheme = usePrefsStore.getState().setTheme;
  const storageMode = useAuthStore((s) => s.storageMode);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setStorageMode = useAuthStore.getState().setStorageMode;

  const forgetEverything = (): void => {
    useAuthStore.getState().clear();
    usePrefsStore.getState().reset();
    useSelectionStore.getState().reset();
    useFiltersStore.getState().reset();
    globalThis.location.reload();
  };

  return (
    <Drawer open={settingsOpen} onOpenChange={setSettingsOpen} title="Settings">
      <div className="flex flex-col gap-6">
        <section>
          <h3 className="mb-2 text-2xs font-medium uppercase tracking-wide text-text-secondary">
            Theme
          </h3>
          <RadioGroup
            value={theme}
            onValueChange={(v) => {
              setTheme(v as Theme);
            }}
          >
            {THEMES.map(({ value, label }) => (
              <Radio key={value} value={value}>
                {label}
              </Radio>
            ))}
          </RadioGroup>
        </section>

        <section>
          <h3 className="mb-2 text-2xs font-medium uppercase tracking-wide text-text-secondary">
            Token storage
          </h3>
          <RadioGroup
            value={storageMode}
            onValueChange={(v) => {
              setStorageMode(v as StorageMode);
            }}
          >
            {STORAGE_MODES.map(({ value, label }) => (
              <Radio key={value} value={value}>
                {label}
              </Radio>
            ))}
          </RadioGroup>
        </section>

        <section className="border-t border-border-subtle pt-4">
          <Button variant="danger" size="sm" onClick={forgetEverything}>
            Forget everything
          </Button>
          <p className="mt-1 text-2xs text-text-tertiary">
            Clears your token and all persisted state.
          </p>
        </section>

        <section className="border-t border-border-subtle pt-4">
          <p className="text-2xs text-text-tertiary">
            <span>v{__APP_VERSION__}</span>
            <span className="mx-1 opacity-40">·</span>
            <span className="font-mono">{__APP_COMMIT__}</span>
          </p>
        </section>
      </div>
    </Drawer>
  );
}
