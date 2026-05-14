// SPDX-License-Identifier: MIT

// Project picker — Combobox bound to useProjects(orgKey) and
// selectionStore.setProject. Disabled (skeleton) until an organization
// is chosen. Search-as-you-type uses the Combobox primitive's internal
// filter on label; ARCHITECTURE.md §Phase 7 calls for server-side
// filtering at > 500 projects, which we can switch to by passing
// `query` + `onQueryChange` here later.

import { useProjects } from '../../api/queries';
import { Combobox } from '../../components/primitives/Combobox';
import { Skeleton } from '../../components/primitives/Skeleton';
import { sonarClient, useSelectionStore } from '../../app/stores';
import type { ProjectKey } from '../../types/sonar';

export function ProjectPicker(): React.JSX.Element {
  const orgKey = useSelectionStore((s) => s.organizationKey);
  const projectKey = useSelectionStore((s) => s.projectKey);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setProject = useSelectionStore.getState().setProject;

  const projectsQuery = useProjects(sonarClient, orgKey, { ps: 500 });

  if (orgKey === null) {
    // Disabled cascade per ARCHITECTURE.md: project picker waits for
    // org. Skeleton placeholder keeps the layout stable.
    return <Skeleton aria-hidden="true" className="h-8 w-44" />;
  }

  if (projectsQuery.isLoading) {
    return <Skeleton className="h-8 w-44" />;
  }

  const items = projectsQuery.data?.kind === 'ok' ? projectsQuery.data.value.items : [];
  const options = items.map((p) => ({ value: p.key, label: p.name }));

  return (
    <Combobox
      value={projectKey ?? ''}
      onValueChange={(v) => {
        setProject(v as ProjectKey);
      }}
      options={options}
      placeholder="Project"
      searchPlaceholder="Search projects…"
      emptyText="No projects match."
      aria-label="Project"
      className="w-56"
    />
  );
}
