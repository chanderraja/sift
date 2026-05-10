// SPDX-License-Identifier: MIT

// Branch picker — Select bound to useBranches(projectKey) and
// selectionStore.setBranch. Defaults to the project's `isMain: true`
// branch when no branch has been chosen yet (the common case for a
// freshly-picked project).

import { useEffect } from 'react';

import { useBranches } from '../../api/queries';
import { Select, SelectItem } from '../../components/primitives/Select';
import { Skeleton } from '../../components/primitives/Skeleton';
import { sonarClient, useSelectionStore } from '../../app/stores';

export function BranchPicker(): React.JSX.Element {
  const projectKey = useSelectionStore((s) => s.projectKey);
  const branchName = useSelectionStore((s) => s.branchName);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setBranch = useSelectionStore.getState().setBranch;

  const branchesQuery = useBranches(sonarClient, projectKey ?? '');
  const branches = branchesQuery.data?.kind === 'ok' ? branchesQuery.data.value : [];

  // Auto-default to the main branch on first appearance after a
  // project is picked. The user can still pick a different branch
  // afterwards.
  useEffect(() => {
    if (projectKey === null) return;
    if (branchName !== null) return;
    if (branches.length === 0) return;
    const main = branches.find((b) => b.isMain);
    if (main !== undefined) setBranch(main.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey, branches.length, branchName]);

  if (projectKey === null) {
    return <Skeleton aria-hidden="true" className="h-8 w-32" />;
  }

  if (branchesQuery.isLoading) {
    return <Skeleton className="h-8 w-32" />;
  }

  return (
    <Select
      {...(branchName !== null ? { value: branchName } : {})}
      onValueChange={setBranch}
      placeholder="Branch"
      aria-label="Branch"
      className="w-32"
    >
      {branches.map((b) => (
        <SelectItem key={b.name} value={b.name}>
          {b.name}
          {b.isMain ? ' (main)' : ''}
        </SelectItem>
      ))}
    </Select>
  );
}
