// SPDX-License-Identifier: MIT

// Keyboard shortcuts reference modal. Triggered by the ? key (via
// useKeyboardShortcuts) and mounted in App.tsx.

import { Modal } from '../../components/primitives/Modal';
import { useUiStore } from '../../app/stores';

interface ShortcutRow {
  key: string;
  description: string;
}

const SHORTCUTS: readonly ShortcutRow[] = [
  { key: '?', description: 'Show this shortcuts reference' },
  { key: 'e', description: 'Open the Export dialog' },
  { key: 'j', description: 'Move focus to next row' },
  { key: 'k', description: 'Move focus to previous row' },
  { key: 'Enter', description: 'Expand focused row' },
  { key: '/', description: 'Focus the search / filter field' },
];

export function ShortcutsModal(): React.JSX.Element {
  const shortcutsOpen = useUiStore((s) => s.shortcutsOpen);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setShortcutsOpen = useUiStore.getState().setShortcutsOpen;

  return (
    <Modal open={shortcutsOpen} onOpenChange={setShortcutsOpen} title="Keyboard shortcuts">
      <table className="w-full text-xs">
        <tbody>
          {SHORTCUTS.map(({ key, description }) => (
            <tr key={key} className="border-b border-border-subtle last:border-0">
              <td className="py-1.5 pr-4">
                <kbd className="rounded border border-border bg-bg-surface px-1.5 py-0.5 font-mono text-text-primary">
                  {key}
                </kbd>
              </td>
              <td className="py-1.5 text-text-secondary">{description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
