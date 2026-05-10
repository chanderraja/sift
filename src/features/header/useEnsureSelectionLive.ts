// SPDX-License-Identifier: MIT

// ADR-009 — Graceful fallback when a persisted selection key is
// missing from the freshly-loaded option list.
//
//   - org missing      → clear org + project + branch, toast.
//   - project missing  → clear project + branch, toast.
//   - branch missing   → fall back to project's main branch (toast),
//                        or clear branch when no main exists.
//
// Filter selections in filtersStore are intentionally preserved; a
// shared URL whose project vanished still shouldn't strip the user's
// filter work. See ADR-009 §Decision.
//
// Implementation note: the three checks ride a SINGLE effect (rather
// than three separate effects) so cascading clears are visible to
// downstream checks within the same effect pass — otherwise a render
// where multiple queries resolve simultaneously could write a stale
// branch fall-back after a parallel org-missing reset already wiped
// state.

import { useEffect } from 'react';

import { useBranches, useOrganizations, useProjects } from '../../api/queries';
import { toast } from '../../components/primitives/Toast';
import { sonarClient, useSelectionStore } from '../../app/stores';

export function useEnsureSelectionLive(): void {
  const orgKey = useSelectionStore((s) => s.organizationKey);
  const projectKey = useSelectionStore((s) => s.projectKey);
  const branchName = useSelectionStore((s) => s.branchName);

  const orgsQuery = useOrganizations(sonarClient);
  const projectsQuery = useProjects(sonarClient, orgKey ?? '', { ps: 500 });
  const branchesQuery = useBranches(sonarClient, projectKey ?? '');

  useEffect(() => {
    // Re-read live state so a cascading clear earlier in this effect
    // is visible to the downstream checks. The destructured `orgKey`
    // / `projectKey` / `branchName` above are render snapshots —
    // only used as effect dependencies.
    const live = useSelectionStore.getState();

    // 1. Organization presence.
    if (live.organizationKey !== null && orgsQuery.data?.kind === 'ok') {
      const orgs = orgsQuery.data.value;
      if (!orgs.some((o) => o.key === live.organizationKey)) {
        toast.warn(`Selected organization "${live.organizationKey}" is no longer available.`);
        useSelectionStore.getState().reset();
        return;
      }
    }

    // Re-read in case the previous block cleared state.
    const afterOrg = useSelectionStore.getState();

    // 2. Project presence.
    if (
      afterOrg.organizationKey !== null &&
      afterOrg.projectKey !== null &&
      projectsQuery.data?.kind === 'ok'
    ) {
      const projects = projectsQuery.data.value.items;
      if (!projects.some((p) => p.key === afterOrg.projectKey)) {
        toast.warn(`Selected project "${afterOrg.projectKey}" is no longer available.`);
        useSelectionStore.setState({ projectKey: null, branchName: null });
        return;
      }
    }

    const afterProject = useSelectionStore.getState();

    // 3. Branch presence with main-branch fall-back.
    if (
      afterProject.projectKey !== null &&
      afterProject.branchName !== null &&
      branchesQuery.data?.kind === 'ok'
    ) {
      const branches = branchesQuery.data.value;
      if (!branches.some((b) => b.name === afterProject.branchName)) {
        const main = branches.find((b) => b.isMain);
        if (main !== undefined) {
          toast.warn(
            `Selected branch "${afterProject.branchName}" is no longer available — switched to "${main.name}".`,
          );
          useSelectionStore.setState({ branchName: main.name });
        } else {
          toast.warn(`Selected branch "${afterProject.branchName}" is no longer available.`);
          useSelectionStore.setState({ branchName: null });
        }
      }
    }
  }, [orgKey, projectKey, branchName, orgsQuery.data, projectsQuery.data, branchesQuery.data]);
}
