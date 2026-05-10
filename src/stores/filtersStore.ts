// SPDX-License-Identifier: MIT

// Per-tab filter set, sort, and pagination. Lives separately from
// selection so the user can switch tabs without losing the filter
// state for the tab they're not looking at.
//
// `hotspotsFilters` is typed `HotspotFilters | null` rather than the
// strict `HotspotFilters` documented in ARCHITECTURE.md §3 — the
// HotspotFilters type requires a projectKey, and the store has to
// represent the period before a project is selected. The UI layer
// gates the call into `searchHotspots` on a non-null value, so the
// SonarClient still sees the documented shape. This deviation is
// recorded in ARCHITECTURE.md change log v0.5.

import { create } from 'zustand';

import type { HotspotFilters, IssueFilters } from '../types/sonar';

export type Tab = 'issues' | 'hotspots' | 'quality-gate';

export interface SortDirective {
  column: string;
  direction: 'asc' | 'desc';
}

export interface FiltersState {
  tab: Tab;
  issuesFilters: IssueFilters;
  hotspotsFilters: HotspotFilters | null;
  sort: readonly SortDirective[];
  page: number;
  pageSize: number;
}

export interface FiltersActions {
  setTab(tab: Tab): void;
  patchIssues(patch: Partial<IssueFilters>): void;
  patchHotspots(patch: Partial<HotspotFilters>): void;
  setSort(sort: readonly SortDirective[]): void;
  setPage(p: number): void;
  reset(): void;
}

export type FiltersStore = FiltersState & FiltersActions;

const INITIAL: FiltersState = {
  tab: 'issues',
  issuesFilters: {},
  hotspotsFilters: null,
  sort: [],
  page: 1,
  pageSize: 100,
};

export function createFiltersStore() {
  return create<FiltersStore>((set) => ({
    ...INITIAL,

    setTab(tab) {
      set({ tab });
    },

    patchIssues(patch) {
      // Mutating any filter dimension drops the user back to page 1 —
      // page 7 of the old filter set is meaningless for the new one.
      set((s) => ({ issuesFilters: { ...s.issuesFilters, ...patch }, page: 1 }));
    },

    patchHotspots(patch) {
      set((s) => {
        const existing = s.hotspotsFilters;
        if (existing !== null) {
          return { hotspotsFilters: { ...existing, ...patch }, page: 1 };
        }
        // First-ever patch must include the projectKey to construct a
        // valid HotspotFilters; without it we stay null.
        if (typeof patch.projectKey === 'string') {
          return {
            hotspotsFilters: { ...patch, projectKey: patch.projectKey },
            page: 1,
          };
        }
        return {};
      });
    },

    setSort(sort) {
      set({ sort });
    },

    setPage(page) {
      set({ page });
    },

    reset() {
      set({ ...INITIAL });
    },
  }));
}
