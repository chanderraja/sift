// SPDX-License-Identifier: MIT

// Settings + Export icon buttons in the header. Each toggles a flag on
// uiStore; the actual overlay content (Settings drawer, Export modal)
// lands in Phase 10 / Phase 11. Phase 6 mounts placeholder Drawer /
// Modal so the open / close transition is visible end-to-end and the
// button wiring has something to point at.

import { Download, Settings } from 'lucide-react';

import { Button } from '../../components/primitives/Button';
import { Drawer } from '../../components/primitives/Drawer';
import { Modal } from '../../components/primitives/Modal';
import { Tooltip } from '../../components/primitives/Tooltip';
import { useUiStore } from '../../app/stores';

export function HeaderActions(): React.JSX.Element {
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const exportOpen = useUiStore((s) => s.exportOpen);
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

      <Modal
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export findings"
        description="Markdown / CSV. Full UI lands in Phase 10."
      >
        <p className="text-xs text-text-secondary">Export modal content arrives in Phase 10.</p>
      </Modal>
    </>
  );
}
