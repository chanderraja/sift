// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';

import type { ProjectKey } from '../types/sonar';
import { createFiltersStore } from './filtersStore';

const projectKey = 'acme_widget-service' as ProjectKey;
const otherProjectKey = 'acme_other' as ProjectKey;

describe('filtersStore — initial state', () => {
  it('starts on the issues tab with empty filter sets and page 1', () => {
    const s = createFiltersStore().getState();
    expect(s.tab).toBe('issues');
    expect(s.issuesFilters).toEqual({});
    expect(s.hotspotsFilters).toBeNull();
    expect(s.sort).toEqual([]);
    expect(s.page).toBe(1);
    expect(s.pageSize).toBe(100);
  });
});

describe('filtersStore.setTab', () => {
  it.each(['issues', 'hotspots', 'quality-gate'] as const)('switches to %s', (tab) => {
    const store = createFiltersStore();
    store.getState().setTab(tab);
    expect(store.getState().tab).toBe(tab);
  });
});

describe('filtersStore.patchIssues', () => {
  it('merges the patch onto existing filters', () => {
    const store = createFiltersStore();
    store.getState().patchIssues({ severities: ['BLOCKER'] });
    store.getState().patchIssues({ types: ['BUG'] });
    expect(store.getState().issuesFilters).toEqual({
      severities: ['BLOCKER'],
      types: ['BUG'],
    });
  });

  it('overwrites a previously-set dimension', () => {
    const store = createFiltersStore();
    store.getState().patchIssues({ severities: ['BLOCKER'] });
    store.getState().patchIssues({ severities: ['CRITICAL', 'MAJOR'] });
    expect(store.getState().issuesFilters.severities).toEqual(['CRITICAL', 'MAJOR']);
  });

  it('resets page to 1 after a filter change', () => {
    const store = createFiltersStore();
    store.setState({ page: 7 });
    store.getState().patchIssues({ severities: ['BLOCKER'] });
    expect(store.getState().page).toBe(1);
  });
});

describe('filtersStore.patchHotspots', () => {
  it('creates the filter set when the first patch includes projectKey', () => {
    const store = createFiltersStore();
    store.getState().patchHotspots({ projectKey, status: 'TO_REVIEW' });
    expect(store.getState().hotspotsFilters).toEqual({
      projectKey,
      status: 'TO_REVIEW',
    });
  });

  it('stays null when the first patch omits projectKey', () => {
    const store = createFiltersStore();
    store.getState().patchHotspots({ status: 'TO_REVIEW' });
    expect(store.getState().hotspotsFilters).toBeNull();
  });

  it('merges subsequent patches onto an existing filter set', () => {
    const store = createFiltersStore();
    store.getState().patchHotspots({ projectKey });
    store.getState().patchHotspots({ branch: 'main', status: 'REVIEWED' });
    expect(store.getState().hotspotsFilters).toEqual({
      projectKey,
      branch: 'main',
      status: 'REVIEWED',
    });
  });

  it('lets the projectKey itself be updated by a later patch', () => {
    const store = createFiltersStore();
    store.getState().patchHotspots({ projectKey });
    store.getState().patchHotspots({ projectKey: otherProjectKey });
    expect(store.getState().hotspotsFilters?.projectKey).toBe(otherProjectKey);
  });

  it('resets page to 1 after a filter change', () => {
    const store = createFiltersStore();
    store.getState().patchHotspots({ projectKey });
    store.setState({ page: 5 });
    store.getState().patchHotspots({ status: 'REVIEWED' });
    expect(store.getState().page).toBe(1);
  });
});

describe('filtersStore.setSort', () => {
  it('replaces the sort directive list', () => {
    const store = createFiltersStore();
    store.getState().setSort([{ column: 'severity', direction: 'desc' }]);
    expect(store.getState().sort).toEqual([{ column: 'severity', direction: 'desc' }]);
  });
});

describe('filtersStore.setPage', () => {
  it('updates the current page', () => {
    const store = createFiltersStore();
    store.getState().setPage(3);
    expect(store.getState().page).toBe(3);
  });
});

describe('filtersStore.setPageSize', () => {
  it('updates the page size', () => {
    const store = createFiltersStore();
    store.getState().setPageSize(200);
    expect(store.getState().pageSize).toBe(200);
  });

  it('resets page to 1 so the user does not land on an empty page-N', () => {
    const store = createFiltersStore();
    store.setState({ page: 5 });
    store.getState().setPageSize(50);
    expect(store.getState().page).toBe(1);
  });
});

describe('filtersStore.reset', () => {
  it('restores the initial state', () => {
    const store = createFiltersStore();
    store.getState().setTab('hotspots');
    store.getState().patchIssues({ severities: ['BLOCKER'] });
    store.getState().patchHotspots({ projectKey });
    store.getState().setSort([{ column: 'rule', direction: 'asc' }]);
    store.getState().setPage(4);

    store.getState().reset();

    const s = store.getState();
    expect(s.tab).toBe('issues');
    expect(s.issuesFilters).toEqual({});
    expect(s.hotspotsFilters).toBeNull();
    expect(s.sort).toEqual([]);
    expect(s.page).toBe(1);
  });
});
