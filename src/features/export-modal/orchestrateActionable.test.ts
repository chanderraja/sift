// SPDX-License-Identifier: MIT

import { describe, it, expect, vi } from 'vitest';
import { orchestrateActionable } from './orchestrateActionable';
import type { SonarClient } from '../../api/SonarClient';
import type { ConditionDriver } from '../../lib/qgDrivers';
import { DRIVER_LIMIT } from '../../lib/qgDrivers';
import type { ProjectKey } from '../../types/sonar';

const PROJ = 'acme' as ProjectKey;
const BRANCH = 'main';

const baseCondition = {
  status: 'ERROR' as const,
  metricKey: 'reliability_rating',
  comparator: 'GT' as const,
  errorThreshold: '1',
  actualValue: '3.0',
};

const noteDriver: ConditionDriver = {
  condition: baseCondition,
  spec: { type: 'note', message: 'Coverage note.' },
};

const issueDriver: ConditionDriver = {
  condition: baseCondition,
  spec: {
    type: 'issues',
    filters: {
      componentKeys: [PROJ],
      branch: BRANCH,
      types: ['BUG'],
      severities: ['BLOCKER', 'CRITICAL', 'MAJOR'],
      statuses: ['OPEN'],
    },
  },
};

const hotspotDriver: ConditionDriver = {
  condition: { ...baseCondition, metricKey: 'security_hotspots_reviewed' },
  spec: {
    type: 'hotspots',
    filters: { projectKey: PROJ, branch: BRANCH, status: 'TO_REVIEW' },
  },
};

const emptyIssuesPage = { items: [], total: 0, pageIndex: 1, pageSize: DRIVER_LIMIT, facets: [] };
const emptyHotspotsPage = { items: [], total: 0, pageIndex: 1, pageSize: DRIVER_LIMIT };

function makeClient(
  mockIssues = vi.fn().mockResolvedValue({ kind: 'ok', value: emptyIssuesPage }),
  mockHotspots = vi.fn().mockResolvedValue({ kind: 'ok', value: emptyHotspotsPage }),
): SonarClient {
  return { searchIssues: mockIssues, searchHotspots: mockHotspots } as unknown as SonarClient;
}

describe('orchestrateActionable — notes', () => {
  it('resolves a note driver without calling the API', async () => {
    const mockIssues = vi.fn();
    const mockHotspots = vi.fn();
    const results = await orchestrateActionable(makeClient(mockIssues, mockHotspots), [noteDriver]);
    expect(results).toHaveLength(1);
    expect(results[0]?.driverResult).toEqual({ kind: 'note', message: 'Coverage note.' });
    expect(mockIssues).not.toHaveBeenCalled();
    expect(mockHotspots).not.toHaveBeenCalled();
  });
});

describe('orchestrateActionable — issues driver', () => {
  it('calls searchIssues with ps=DRIVER_LIMIT and returns items', async () => {
    const mockIssue = {
      key: 'K1',
      rule: 'typescript:S1',
      severity: 'BLOCKER' as const,
      type: 'BUG' as const,
      status: 'OPEN' as const,
      resolution: null,
      component: 'acme:src/a.ts',
      project: PROJ,
      message: 'msg',
      tags: [],
      creationDate: '',
      updateDate: '',
      flows: [],
    };
    const mockIssues = vi
      .fn()
      .mockResolvedValue({
        kind: 'ok',
        value: { ...emptyIssuesPage, items: [mockIssue], total: 1 },
      });
    const results = await orchestrateActionable(makeClient(mockIssues), [issueDriver]);
    const spec = issueDriver.spec;
    expect(mockIssues).toHaveBeenCalledWith(spec.type === 'issues' ? spec.filters : undefined, {
      ps: DRIVER_LIMIT,
    });
    const dr = results[0]?.driverResult;
    expect(dr?.kind).toBe('issues');
    if (dr?.kind === 'issues') expect(dr.items).toHaveLength(1);
  });

  it('maps a non-ok result to an error driverResult', async () => {
    const mockIssues = vi.fn().mockResolvedValue({ kind: 'network_error', message: 'offline' });
    const results = await orchestrateActionable(makeClient(mockIssues), [issueDriver]);
    expect(results[0]?.driverResult.kind).toBe('error');
  });

  it('maps an over_cap result to an error driverResult', async () => {
    const mockIssues = vi.fn().mockResolvedValue({ kind: 'over_cap', total: 15000 });
    const results = await orchestrateActionable(makeClient(mockIssues), [issueDriver]);
    expect(results[0]?.driverResult.kind).toBe('error');
  });
});

describe('orchestrateActionable — hotspot driver', () => {
  it('calls searchHotspots with ps=DRIVER_LIMIT and returns items', async () => {
    const mockHotspots = vi.fn().mockResolvedValue({ kind: 'ok', value: emptyHotspotsPage });
    const results = await orchestrateActionable(makeClient(undefined, mockHotspots), [
      hotspotDriver,
    ]);
    const spec = hotspotDriver.spec;
    expect(mockHotspots).toHaveBeenCalledWith(spec.type === 'hotspots' ? spec.filters : undefined, {
      ps: DRIVER_LIMIT,
    });
    expect(results[0]?.driverResult.kind).toBe('hotspots');
  });

  it('maps a non-ok result to an error driverResult', async () => {
    const mockHotspots = vi.fn().mockResolvedValue({ kind: 'unauthorized' });
    const results = await orchestrateActionable(makeClient(undefined, mockHotspots), [
      hotspotDriver,
    ]);
    expect(results[0]?.driverResult.kind).toBe('error');
  });
});

describe('orchestrateActionable — multiple drivers', () => {
  it('returns results in the same order as inputs', async () => {
    const results = await orchestrateActionable(makeClient(), [
      noteDriver,
      issueDriver,
      hotspotDriver,
    ]);
    expect(results).toHaveLength(3);
    expect(results[0]?.driverResult.kind).toBe('note');
    expect(results[1]?.driverResult.kind).toBe('issues');
    expect(results[2]?.driverResult.kind).toBe('hotspots');
  });

  it('preserves the original condition on each result', async () => {
    const results = await orchestrateActionable(makeClient(), [noteDriver]);
    expect(results[0]?.condition).toBe(noteDriver.condition);
  });
});

describe('orchestrateActionable — progress callback', () => {
  it('calls onProgress once per driver resolved', async () => {
    const progress = vi.fn();
    await orchestrateActionable(makeClient(), [noteDriver, issueDriver], progress);
    expect(progress).toHaveBeenCalledTimes(2);
  });

  it('final onProgress call reports done === total', async () => {
    const calls: [number, number][] = [];
    await orchestrateActionable(makeClient(), [noteDriver, hotspotDriver], (done, total) => {
      calls.push([done, total]);
    });
    expect(calls.at(-1)).toEqual([2, 2]);
  });

  it('works without an onProgress callback', async () => {
    await expect(orchestrateActionable(makeClient(), [noteDriver])).resolves.toHaveLength(1);
  });
});
