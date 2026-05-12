// SPDX-License-Identifier: MIT

// Settings + Export icon buttons in the header. Clicking either sets the
// corresponding uiStore flag; the actual overlays (Settings drawer, Export
// modal) are mounted in App.tsx so they can access app-level context.

import { Download, Settings } from 'lucide-react';

import { Button } from '../../components/primitives/Button';
import { Tooltip } from '../../components/primitives/Tooltip';
import { useUiStore } from '../../app/stores';

// Settings drawer and Export modal are mounted in App.tsx; HeaderActions
// only owns the icon buttons and writes the uiStore flags.
export function HeaderActions(): React.JSX.Element {
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
    </>
  );
}
