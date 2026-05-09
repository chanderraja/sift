// SPDX-License-Identifier: MIT

// Tests for the TanStack Query option factories. These are pure
// functions; no rendering needed. Keeping them tested ensures the
// staleTime values from ADR-008(a) cannot drift silently — drift here
// would weaken the trust-model decision that picked SPA-side caching
// over edge caching.

import { describe, expect, it } from 'vitest';

import {
  STALE_TIMES,
  branchesQuery,
  hotspotsQuery,
  issuesQuery,
  measuresQuery,
  organizationsQuery,
  projectsQuery,
  qualityGateQuery,
  useBranches,
  useHotspots,
  useIssues,
  useMeasures,
  useOrganizations,
  useProjects,
  useQualityGate,
} from './queries';
import { SonarClient } from './SonarClient';

const client = new SonarClient({ region: 'eu', getToken: () => 'tok' });

describe('queries — STALE_TIMES match ADR-008(a)', () => {
  it('codifies the per-query staleTime table verbatim', () => {
    expect(STALE_TIMES).toEqual({
      organizations: 300_000,
      projects: 300_000,
      branches: 300_000,
      issues: 60_000,
      hotspots: 60_000,
      qualityGate: 10_000,
      measures: 60_000,
    });
  });
});

describe('queries — option factories', () => {
  it('organizationsQuery: keyed by ["organizations"], 5 min staleTime', () => {
    const opts = organizationsQuery(client);
    expect(opts.queryKey).toEqual(['organizations']);
    expect(opts.staleTime).toBe(300_000);
    expect(typeof opts.queryFn).toBe('function');
  });

  it('projectsQuery: keyed by ["projects", orgKey, opts], 5 min staleTime', () => {
    const opts = projectsQuery(client, 'acme', { p: 2, ps: 100 });
    expect(opts.queryKey).toEqual(['projects', 'acme', { p: 2, ps: 100 }]);
    expect(opts.staleTime).toBe(300_000);
  });

  it('projectsQuery uses null for missing opts so the key is stable across calls', () => {
    const a = projectsQuery(client, 'acme');
    const b = projectsQuery(client, 'acme');
    expect(a.queryKey).toEqual(b.queryKey);
  });

  it('branchesQuery: keyed by ["branches", projectKey], 5 min staleTime', () => {
    const opts = branchesQuery(client, 'acme_widget-service');
    expect(opts.queryKey).toEqual(['branches', 'acme_widget-service']);
    expect(opts.staleTime).toBe(300_000);
  });

  it('issuesQuery: includes filters and opts in queryKey, 60s staleTime', () => {
    const filters = { severities: ['BLOCKER' as const] };
    const opts = issuesQuery(client, filters, { p: 1, ps: 50 });
    expect(opts.queryKey).toEqual(['issues', filters, { p: 1, ps: 50 }]);
    expect(opts.staleTime).toBe(60_000);
  });

  it('hotspotsQuery: includes filters and opts in queryKey, 60s staleTime', () => {
    const filters = { projectKey: 'acme_widget-service' as never };
    const opts = hotspotsQuery(client, filters);
    expect(opts.queryKey).toEqual(['hotspots', filters, null]);
    expect(opts.staleTime).toBe(60_000);
  });

  it('qualityGateQuery: keyed by ["qualityGate", projectKey, branch], 10s staleTime', () => {
    const opts = qualityGateQuery(client, 'acme_widget-service', 'master');
    expect(opts.queryKey).toEqual(['qualityGate', 'acme_widget-service', 'master']);
    expect(opts.staleTime).toBe(10_000);
  });

  it('measuresQuery: keyed by ["measures", projectKey, branch, metrics], 60s staleTime', () => {
    const opts = measuresQuery(client, 'acme_widget-service', 'master', ['ncloc', 'coverage']);
    expect(opts.queryKey).toEqual([
      'measures',
      'acme_widget-service',
      'master',
      ['ncloc', 'coverage'],
    ]);
    expect(opts.staleTime).toBe(60_000);
  });
});

describe('queries — hooks export shape (smoke)', () => {
  it('every hook is a function so it imports cleanly into a component', () => {
    expect(typeof useOrganizations).toBe('function');
    expect(typeof useProjects).toBe('function');
    expect(typeof useBranches).toBe('function');
    expect(typeof useIssues).toBe('function');
    expect(typeof useHotspots).toBe('function');
    expect(typeof useQualityGate).toBe('function');
    expect(typeof useMeasures).toBe('function');
  });
});
