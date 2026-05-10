// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';

import type { OrgKey, ProjectKey } from '../types/sonar';

import { createFiltersStore } from './filtersStore';
import { startHashSync } from './hashSyncIntegration';
import { createSelectionStore } from './selectionStore';

const fakeLocation = (hash = ''): { hash: string } => ({ hash });

const setup = (
  initialHash = '',
): {
  selection: ReturnType<typeof createSelectionStore>;
  filters: ReturnType<typeof createFiltersStore>;
  location: { hash: string };
  cleanup: () => void;
} => {
  const selection = createSelectionStore();
  const filters = createFiltersStore();
  const location = fakeLocation(initialHash);
  const cleanup = startHashSync({ selection, filters, location });
  return { selection, filters, location, cleanup };
};

describe('startHashSync — hydration from hash on start', () => {
  it('hydrates selection from org/project/branch keys', () => {
    const { selection, cleanup } = setup('v=1&org=acme&project=acme_widget&branch=main');
    expect(selection.getState().organizationKey).toBe('acme');
    expect(selection.getState().projectKey).toBe('acme_widget');
    expect(selection.getState().branchName).toBe('main');
    cleanup();
  });

  it('hydrates tab from the hash', () => {
    const { filters, cleanup } = setup('v=1&tab=hotspots');
    expect(filters.getState().tab).toBe('hotspots');
    cleanup();
  });

  it('rejects an unknown tab value (the store stays at its default)', () => {
    const { filters, cleanup } = setup('v=1&tab=spaceship');
    expect(filters.getState().tab).toBe('issues');
    cleanup();
  });

  it('hydrates issues filters (sev/type/status, comma-joined)', () => {
    const { filters, cleanup } = setup('v=1&sev=BLOCKER,CRITICAL&type=BUG&status=OPEN,CONFIRMED');
    const f = filters.getState().issuesFilters;
    expect(f.severities).toEqual(['BLOCKER', 'CRITICAL']);
    expect(f.types).toEqual(['BUG']);
    expect(f.statuses).toEqual(['OPEN', 'CONFIRMED']);
    cleanup();
  });

  it('drops unknown enum members from filter arrays', () => {
    const { filters, cleanup } = setup('v=1&sev=BLOCKER,UNKNOWN_SEV');
    expect(filters.getState().issuesFilters.severities).toEqual(['BLOCKER']);
    cleanup();
  });

  it('hydrates sort directives', () => {
    const { filters, cleanup } = setup('v=1&sort=severity:desc,file:asc');
    expect(filters.getState().sort).toEqual([
      { column: 'severity', direction: 'desc' },
      { column: 'file', direction: 'asc' },
    ]);
    cleanup();
  });

  it('hydrates page when present', () => {
    const { filters, cleanup } = setup('v=1&page=5');
    expect(filters.getState().page).toBe(5);
    cleanup();
  });

  it('hydrates page size when present', () => {
    const { filters, cleanup } = setup('v=1&ps=200');
    expect(filters.getState().pageSize).toBe(200);
    cleanup();
  });

  it('rejects a non-positive page size from the hash', () => {
    const { filters, cleanup } = setup('v=1&ps=-1');
    // Falls back to whichever default the store was constructed with.
    expect(filters.getState().pageSize).toBe(100);
    cleanup();
  });

  it('hydrates createdAfter when present', () => {
    const { filters, cleanup } = setup('v=1&since=2026-01-01');
    expect(filters.getState().issuesFilters.createdAfter).toBe('2026-01-01');
    cleanup();
  });

  it('treats a missing/unversioned hash as empty (defaults preserved)', () => {
    const { selection, filters, cleanup } = setup('this-is-not-a-sift-hash');
    expect(selection.getState().organizationKey).toBeNull();
    expect(filters.getState().tab).toBe('issues');
    cleanup();
  });
});

describe('startHashSync — write hash on store change', () => {
  it('writes selection updates into location.hash', () => {
    const { selection, location, cleanup } = setup();
    selection.getState().setOrganization('acme' as OrgKey);
    expect(location.hash).toContain('org=acme');
    cleanup();
  });

  it('writes filter updates into location.hash', () => {
    const { filters, location, cleanup } = setup();
    filters.getState().patchIssues({ severities: ['BLOCKER', 'CRITICAL'] });
    expect(location.hash).toContain('sev=BLOCKER%2CCRITICAL');
    cleanup();
  });

  it('omits page when it equals the default 1', () => {
    const { filters, location, cleanup } = setup();
    filters.getState().setPage(1);
    expect(location.hash).not.toContain('page=');
    cleanup();
  });

  it('writes a non-default page', () => {
    const { filters, location, cleanup } = setup();
    filters.setState({ page: 5 });
    filters.getState().setSort([{ column: 'severity', direction: 'desc' }]);
    expect(location.hash).toContain('page=5');
    expect(location.hash).toContain('sort=severity%3Adesc');
    cleanup();
  });

  it('omits page size when it equals the default 100', () => {
    const { filters, location, cleanup } = setup();
    filters.getState().setPageSize(100);
    expect(location.hash).not.toContain('ps=');
    cleanup();
  });

  it('writes a non-default page size', () => {
    const { filters, location, cleanup } = setup();
    filters.getState().setPageSize(500);
    expect(location.hash).toContain('ps=500');
    cleanup();
  });

  it('writes createdAfter into the hash', () => {
    const { filters, location, cleanup } = setup();
    filters.getState().patchIssues({ createdAfter: '2026-02-01' });
    expect(location.hash).toContain('since=2026-02-01');
    cleanup();
  });

  it('round-trips selection+filters via hash → store → hash', () => {
    const { selection, filters, location, cleanup } = setup();

    selection.getState().setOrganization('acme' as OrgKey);
    selection.getState().setProject('acme_widget' as ProjectKey);
    selection.getState().setBranch('main');
    filters.getState().setTab('hotspots');
    const firstHash = location.hash;
    cleanup();

    // Re-mount on the same hash; expect equivalent restored state.
    const fresh = setup(firstHash);
    expect(fresh.selection.getState().organizationKey).toBe('acme');
    expect(fresh.selection.getState().projectKey).toBe('acme_widget');
    expect(fresh.selection.getState().branchName).toBe('main');
    expect(fresh.filters.getState().tab).toBe('hotspots');
    fresh.cleanup();
  });
});

describe('startHashSync — cleanup', () => {
  it('stops writing to location.hash after cleanup', () => {
    const { selection, location, cleanup } = setup();
    cleanup();
    const before = location.hash;
    selection.getState().setOrganization('acme' as OrgKey);
    expect(location.hash).toBe(before);
  });
});

describe('startHashSync — no-write when hash already matches', () => {
  it('does not rewrite an already-current hash on a no-op store update', () => {
    const { selection, location } = setup();
    selection.getState().setOrganization('acme' as OrgKey);
    const after = location.hash;
    // Mutate to the same value: no observable change to hash.
    selection.getState().setOrganization('acme' as OrgKey);
    expect(location.hash).toBe(after);
  });
});
