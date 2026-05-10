// SPDX-License-Identifier: MIT

// Org / project / branch selection. Cascades downward — choosing a new
// org invalidates the project and branch (different orgs have different
// projects), choosing a new project invalidates the branch (different
// projects have different branch lists). Putting the cascade in the
// store keeps it as a single source of truth instead of every UI
// surface re-implementing it.
//
// Slots are typed as `T | null` rather than `T | undefined` so they
// flow cleanly under `exactOptionalPropertyTypes: true` — a
// "deliberately empty" slot is null; a true "absent" key in the state
// shape never occurs.

import { create } from 'zustand';

import type { OrgKey, ProjectKey } from '../types/sonar';

export interface SelectionState {
  organizationKey: OrgKey | null;
  projectKey: ProjectKey | null;
  branchName: string | null;
}

export interface SelectionActions {
  setOrganization(key: OrgKey): void;
  setProject(key: ProjectKey): void;
  setBranch(name: string): void;
  reset(): void;
}

export type SelectionStore = SelectionState & SelectionActions;

const EMPTY: SelectionState = {
  organizationKey: null,
  projectKey: null,
  branchName: null,
};

export function createSelectionStore() {
  return create<SelectionStore>((set) => ({
    ...EMPTY,
    setOrganization(key) {
      // Choosing a new org invalidates the previously-chosen project
      // and branch — different orgs have different project lists.
      set({ organizationKey: key, projectKey: null, branchName: null });
    },
    setProject(key) {
      // Choosing a new project invalidates the previously-chosen branch.
      set({ projectKey: key, branchName: null });
    },
    setBranch(name) {
      set({ branchName: name });
    },
    reset() {
      set({ ...EMPTY });
    },
  }));
}
