// SPDX-License-Identifier: MIT

// Header scaffold per SPEC §7.
//
// Left-to-right: app name → region → token → org → project → branch →
// settings → export. Phase 6 wires the token field, region selector,
// connection-status badge, and the settings/export buttons. The org /
// project / branch pickers are Phase 7 — placeholder slots for now so
// the Phase 6 layout doesn't drift from the documented order.

import { RegionSelector } from './RegionSelector';
import { TokenField } from './TokenField';

export function Header(): React.JSX.Element {
  return (
    <header
      data-testid="app-header"
      className="flex h-14 items-start gap-3 border-b border-border-subtle bg-bg-surface px-4 py-2"
    >
      <div className="self-center text-sm font-semibold text-text-primary">Sift</div>

      <div data-testid="header-region-slot" className="self-center">
        <RegionSelector />
      </div>
      <div data-testid="header-token-slot" className="self-start">
        <TokenField />
      </div>
      <div data-testid="header-org-slot" />
      <div data-testid="header-project-slot" />
      <div data-testid="header-branch-slot" />

      <div className="ml-auto flex items-center gap-1 self-center">
        <div data-testid="header-settings-slot" />
        <div data-testid="header-export-slot" />
      </div>
    </header>
  );
}
