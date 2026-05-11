// SPDX-License-Identifier: MIT

// HotspotExpandPanel — details panel rendered below an expanded
// Hotspot row. Mirrors IssueExpandPanel in shape: rule key, message,
// file:line. The lazy-loaded rule description lands when
// SonarClient.getRule() is wired (same follow-up as the Issue panel).

import type { Hotspot } from '../../types/sonar';

const fileFromComponent = (component: string): string => {
  const colon = component.indexOf(':');
  return colon === -1 ? component : component.slice(colon + 1);
};

export interface HotspotExpandPanelProps {
  hotspot: Hotspot;
}

export function HotspotExpandPanel({ hotspot }: HotspotExpandPanelProps): React.JSX.Element {
  return (
    <div
      data-testid="hotspot-expand-panel"
      className="flex flex-col gap-2 text-xs text-text-secondary"
    >
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-text-primary">{hotspot.ruleKey}</span>
        <span className="font-mono">
          {fileFromComponent(hotspot.component)}:{String(hotspot.line)}
        </span>
        <span className="text-text-tertiary">{hotspot.securityCategory}</span>
      </div>
      <p className="text-text-primary">{hotspot.message}</p>
    </div>
  );
}
