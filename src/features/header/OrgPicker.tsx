// SPDX-License-Identifier: MIT

// Organization picker. Bound to useOrganizations() and
// selectionStore.setOrganization. Behaviors per IMPLEMENTATION.md
// Phase 7:
//
//   - Disabled (with skeleton) until the auth store reports validation:
//     'valid'. No point pinging /organizations/search with a token the
//     proxy hasn't accepted.
//   - Single-org case: the picker auto-selects on first appearance and
//     stays compact. The user can still change region or clear the
//     token.
//   - Multi-org: a regular Select. Switching org clears project +
//     branch via the selectionStore cascade (already in Phase 4).
//
// Graceful-fallback validation (ADR-009) lives in a separate hook
// (`useEnsureSelectionLive`) so this component only renders.

import { useEffect } from 'react';

import { useOrganizations } from '../../api/queries';
import { Select, SelectItem } from '../../components/primitives/Select';
import { Skeleton } from '../../components/primitives/Skeleton';
import { sonarClient, useAuthStore, useSelectionStore } from '../../app/stores';
import type { OrgKey } from '../../types/sonar';

export function OrgPicker(): React.JSX.Element {
  const validation = useAuthStore((s) => s.validation);
  const enabled = validation === 'valid';

  const orgQuery = useOrganizations(sonarClient, enabled);
  const orgs = orgQuery.data?.kind === 'ok' ? orgQuery.data.value : [];

  const orgKey = useSelectionStore((s) => s.organizationKey);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setOrganization = useSelectionStore.getState().setOrganization;

  // Auto-select when there's exactly one org and nothing's chosen yet.
  useEffect(() => {
    if (!enabled) return;
    if (orgKey !== null) return;
    if (orgs.length !== 1) return;
    const onlyOrg = orgs[0];
    if (onlyOrg !== undefined) setOrganization(onlyOrg.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, orgs.length, orgKey]);

  if (!enabled) {
    return <Skeleton aria-hidden="true" className="h-8 w-32" />;
  }

  if (orgQuery.isLoading) {
    return <Skeleton className="h-8 w-32" />;
  }

  return (
    <Select
      value={orgKey ?? ''}
      onValueChange={(v) => {
        setOrganization(v as OrgKey);
      }}
      placeholder="Organization"
      aria-label="Organization"
      className="w-44"
    >
      {orgs.map((org) => (
        <SelectItem key={org.key} value={org.key}>
          {org.name}
        </SelectItem>
      ))}
    </Select>
  );
}
