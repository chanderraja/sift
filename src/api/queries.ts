// SPDX-License-Identifier: MIT

// TanStack Query bindings for SonarClient. Per ADR-008, every wrapper
// sets `staleTime` explicitly — never zero, never the library default.
// The values below are codified by ADR-008(a) and reflect the Sift
// access pattern: org/project/branch lists rarely change during a
// session (5 min); issues/hotspots/measures are the iteration loop
// (1 min); the quality gate is short-lived because users re-check it
// after pushing a commit (10 s).
//
// Each method exposes both an *options factory* (a pure function returning
// the QueryClient options) and a hook. Splitting like that keeps the hooks
// trivial and lets options be unit-tested without rendering. Callers in
// features/ use the hooks; tests and any non-React caller can use the
// options directly (e.g. queryClient.fetchQuery(organizationsQuery(client))).

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type {
  Branch,
  Hotspot,
  HotspotFilters,
  IssueFilters,
  IssuesPage,
  Measure,
  Organization,
  Page,
  PageOpts,
  Project,
  QualityGate,
  Result,
} from '../types/sonar';
import type { SonarClient } from './SonarClient';

export const STALE_TIMES = {
  organizations: 300_000,
  projects: 300_000,
  branches: 300_000,
  issues: 60_000,
  hotspots: 60_000,
  qualityGate: 10_000,
  measures: 60_000,
} as const;

// ---------- Organizations ----------

export const organizationsQuery = (client: SonarClient, enabled = true) =>
  ({
    queryKey: ['organizations'] as const,
    queryFn: () => client.listOrganizations(),
    staleTime: STALE_TIMES.organizations,
    enabled,
  }) as const;

export const useOrganizations = (
  client: SonarClient,
  enabled = true,
): UseQueryResult<Result<Organization[]>> => useQuery(organizationsQuery(client, enabled));

// ---------- Projects ----------

export const projectsQuery = (client: SonarClient, orgKey: string, opts?: PageOpts) =>
  ({
    queryKey: ['projects', orgKey, opts ?? null] as const,
    queryFn: () => client.listProjects(orgKey, opts),
    staleTime: STALE_TIMES.projects,
  }) as const;

export const useProjects = (
  client: SonarClient,
  orgKey: string,
  opts?: PageOpts,
): UseQueryResult<Result<Page<Project>>> => useQuery(projectsQuery(client, orgKey, opts));

// ---------- Branches ----------

export const branchesQuery = (client: SonarClient, projectKey: string) =>
  ({
    queryKey: ['branches', projectKey] as const,
    queryFn: () => client.listBranches(projectKey),
    staleTime: STALE_TIMES.branches,
  }) as const;

export const useBranches = (
  client: SonarClient,
  projectKey: string,
): UseQueryResult<Result<Branch[]>> => useQuery(branchesQuery(client, projectKey));

// ---------- Issues ----------

export const issuesQuery = (client: SonarClient, filters: IssueFilters, opts?: PageOpts) =>
  ({
    queryKey: ['issues', filters, opts ?? null] as const,
    queryFn: () => client.searchIssues(filters, opts),
    staleTime: STALE_TIMES.issues,
  }) as const;

export const useIssues = (
  client: SonarClient,
  filters: IssueFilters,
  opts?: PageOpts,
): UseQueryResult<Result<IssuesPage>> => useQuery(issuesQuery(client, filters, opts));

// ---------- Hotspots ----------

export const hotspotsQuery = (client: SonarClient, filters: HotspotFilters, opts?: PageOpts) =>
  ({
    queryKey: ['hotspots', filters, opts ?? null] as const,
    queryFn: () => client.searchHotspots(filters, opts),
    staleTime: STALE_TIMES.hotspots,
  }) as const;

export const useHotspots = (
  client: SonarClient,
  filters: HotspotFilters,
  opts?: PageOpts,
): UseQueryResult<Result<Page<Hotspot>>> => useQuery(hotspotsQuery(client, filters, opts));

// ---------- Quality gate ----------

export const qualityGateQuery = (client: SonarClient, projectKey: string, branch: string) =>
  ({
    queryKey: ['qualityGate', projectKey, branch] as const,
    queryFn: () => client.getQualityGate(projectKey, branch),
    staleTime: STALE_TIMES.qualityGate,
  }) as const;

export const useQualityGate = (
  client: SonarClient,
  projectKey: string,
  branch: string,
): UseQueryResult<Result<QualityGate>> => useQuery(qualityGateQuery(client, projectKey, branch));

// ---------- Measures ----------

export const measuresQuery = (
  client: SonarClient,
  projectKey: string,
  branch: string,
  metricKeys: string[],
) =>
  ({
    queryKey: ['measures', projectKey, branch, metricKeys] as const,
    queryFn: () => client.getMeasures(projectKey, branch, metricKeys),
    staleTime: STALE_TIMES.measures,
  }) as const;

export const useMeasures = (
  client: SonarClient,
  projectKey: string,
  branch: string,
  metricKeys: string[],
): UseQueryResult<Result<Measure[]>> =>
  useQuery(measuresQuery(client, projectKey, branch, metricKeys));
