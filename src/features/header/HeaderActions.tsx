// SPDX-License-Identifier: MIT

// Settings + Export icon buttons in the header. Clicking either sets the
// corresponding uiStore flag; the actual overlays (Settings drawer, Export
// modal) are mounted in App.tsx so they can access app-level context.

import { Download, Settings } from 'lucide-react';

import { Button } from '../../components/primitives/Button';
import { Drawer } from '../../components/primitives/Drawer';
import { Tooltip } from '../../components/primitives/Tooltip';
import { useUiStore } from '../../app/stores';

export function HeaderActions(): React.JSX.Element {
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setSettingsOpen = useUiStore.getState().setSettingsOpen;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setExportOpen = useUiStore.getState().setExportOpen;

  return (
    <>
      <Tooltip content="Settings">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Open settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
        </Button>
      </Tooltip>
      <Tooltip content="Export">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Open export"
          onClick={() => setExportOpen(true)}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
        </Button>
      </Tooltip>

      <Drawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Settings"
        description="Token storage, theme, and defaults. Full UI lands in Phase 11."
      >
        <p className="text-xs text-text-secondary">Settings drawer content arrives in Phase 11.</p>
      </Drawer>
    </>
  );
}
