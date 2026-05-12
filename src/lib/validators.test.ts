// SPDX-License-Identifier: MIT

// Validator tests against the fixtures committed under tests/fixtures/.
//
// Each parser gets the three sub-cases called for in IMPLEMENTATION Phase 1:
//   1. parses the recorded fixture → returns ok.
//   2. parses a fixture with a required field removed → returns failure with
//      an issue at the expected path.
//   3. parses a fixture with an unknown extra field → returns ok and the
//      extra field passes through (.passthrough() invariant).
//
// Fixtures are imported as JSON modules rather than read off disk via fs:
// keeps the file free of any `fs` import (which Vercel's tsc was rejecting
// when prefixed `node:fs`) and free of the `node:`-vs-non-`node:` SonarCloud
// preference. tests/msw.ts uses the same pattern.

import { describe, expect, it } from 'vitest';

import hotspotsSearch from '../../tests/fixtures/hotspots-search.json';
import issuesSearch from '../../tests/fixtures/issues-search.json';
import measuresComponent from '../../tests/fixtures/measures-component.json';
import organizationsSearch from '../../tests/fixtures/organizations-search.json';
import projectBranchesList from '../../tests/fixtures/project-branches-list.json';
import projectsSearch from '../../tests/fixtures/projects-search.json';
import qualitygatesProjectStatus from '../../tests/fixtures/qualitygates-project-status.json';
import {
  parseBranchesListResponse,
  parseHotspotsSearchResponse,
  parseIssuesSearchResponse,
  parseMeasuresComponentResponse,
  parseOrganizationsSearchResponse,
  parseProjectsSearchResponse,
  parseQualityGate,
} from './validators';

const FIXTURES: Record<string, unknown> = {
  'hotspots-search': hotspotsSearch,
  'issues-search': issuesSearch,
  'measures-component': measuresComponent,
  'organizations-search': organizationsSearch,
  'project-branches-list': projectBranchesList,
  'projects-search': projectsSearch,
  'qualitygates-project-status': qualitygatesProjectStatus,
};

const loadFixture = (name: keyof typeof FIXTURES): unknown => FIXTURES[name];

/** Deep clone via structuredClone — fixtures are pure JSON so it suffices. */
const clone = <T>(value: T): T => structuredClone(value);

describe('parseOrganizationsSearchResponse', () => {
  it('parses the fixture', () => {
    const result = parseOrganizationsSearchResponse(loadFixture('organizations-search'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
    expect(result.value.total).toBe(1);
    expect(result.value.items[0]?.key).toBe('acme');
  });

  it('rejects when an organization is missing its required `key`', () => {
    const fixture = clone(loadFixture('organizations-search')) as {
      organizations: { key?: string }[];
    };
    delete fixture.organizations[0]?.key;

    const result = parseOrganizationsSearchResponse(fixture);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('organizations.0.key');
  });

  it('preserves unknown extra fields on organizations', () => {
    interface WithExtra {
      unexpectedFutureField?: string;
    }
    const fixture = clone(loadFixture('organizations-search')) as {
      organizations: WithExtra[];
    };
    if (fixture.organizations[0]) fixture.organizations[0].unexpectedFutureField = 'preserved';

    const result = parseOrganizationsSearchResponse(fixture);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const first = result.value.items[0] as unknown as WithExtra;
    expect(first.unexpectedFutureField).toBe('preserved');
  });
});

describe('parseProjectsSearchResponse', () => {
  it('parses the fixture', () => {
    const result = parseProjectsSearchResponse(loadFixture('projects-search'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items.length).toBeGreaterThan(0);
    expect(result.value.items[0]?.qualifier).toBe('TRK');
  });

  it('rejects when a project is missing its required `qualifier`', () => {
    const fixture = clone(loadFixture('projects-search')) as {
      components: { qualifier?: string }[];
    };
    delete fixture.components[0]?.qualifier;

    const result = parseProjectsSearchResponse(fixture);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('components.0.qualifier');
  });

  it('preserves unknown extra fields on projects', () => {
    interface WithExtra {
      futureMetric?: number;
    }
    const fixture = clone(loadFixture('projects-search')) as {
      components: WithExtra[];
    };
    if (fixture.components[0]) fixture.components[0].futureMetric = 42;

    const result = parseProjectsSearchResponse(fixture);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const first = result.value.items[0] as unknown as WithExtra;
    expect(first.futureMetric).toBe(42);
  });
});

describe('parseBranchesListResponse', () => {
  it('parses the fixture', () => {
    const result = parseBranchesListResponse(loadFixture('project-branches-list'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]?.isMain).toBe(true);
  });

  it('accepts type "BRANCH" (modern SonarCloud deprecates LONG/SHORT)', () => {
    const fixture = {
      branches: [{ name: 'main', isMain: true, type: 'BRANCH' }],
    };
    const result = parseBranchesListResponse(fixture);
    expect(result.ok).toBe(true);
  });

  it('rejects when a branch is missing its required `isMain`', () => {
    const fixture = clone(loadFixture('project-branches-list')) as {
      branches: { isMain?: boolean }[];
    };
    delete fixture.branches[0]?.isMain;

    const result = parseBranchesListResponse(fixture);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('branches.0.isMain');
  });

  it('preserves unknown extra fields on branches', () => {
    interface WithExtra {
      protectionLevel?: string;
    }
    const fixture = clone(loadFixture('project-branches-list')) as {
      branches: WithExtra[];
    };
    if (fixture.branches[0]) fixture.branches[0].protectionLevel = 'strict';

    const result = parseBranchesListResponse(fixture);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const first = result.value[0] as unknown as WithExtra;
    expect(first.protectionLevel).toBe('strict');
  });
});

describe('parseIssuesSearchResponse', () => {
  it('parses the fixture', () => {
    const result = parseIssuesSearchResponse(loadFixture('issues-search'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items.length).toBe(50);
    expect(result.value.total).toBe(115);
  });

  it('normalises a missing `resolution` to null on open issues', () => {
    const result = parseIssuesSearchResponse(loadFixture('issues-search'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The recorded fixture mixes OPEN issues (resolution missing in raw,
    // expected null in parsed) with CLOSED/FIXED issues (resolution carried
    // through verbatim).
    const open = result.value.items.filter((i) => i.status === 'OPEN');
    const closed = result.value.items.filter((i) => i.status === 'CLOSED');
    expect(open.length).toBeGreaterThan(0);
    expect(closed.length).toBeGreaterThan(0);
    expect(open.every((i) => i.resolution === null)).toBe(true);
    expect(closed.every((i) => i.resolution === 'FIXED')).toBe(true);
  });

  it('rejects when an issue is missing its required `severity`', () => {
    const fixture = clone(loadFixture('issues-search')) as {
      issues: { severity?: string }[];
    };
    delete fixture.issues[0]?.severity;

    const result = parseIssuesSearchResponse(fixture);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('issues.0.severity');
  });

  it('preserves unknown extra fields on issues', () => {
    interface WithExtra {
      v2OnlyField?: { nested: boolean };
    }
    const fixture = clone(loadFixture('issues-search')) as {
      issues: WithExtra[];
    };
    if (fixture.issues[0]) fixture.issues[0].v2OnlyField = { nested: true };

    const result = parseIssuesSearchResponse(fixture);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const first = result.value.items[0] as unknown as WithExtra;
    expect(first.v2OnlyField).toEqual({ nested: true });
  });
});

describe('parseHotspotsSearchResponse', () => {
  it('parses the fixture (empty result)', () => {
    const result = parseHotspotsSearchResponse(loadFixture('hotspots-search'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(0);
    expect(result.value.total).toBe(0);
  });

  it('rejects when a hotspot is missing its required `vulnerabilityProbability`', () => {
    const fixture = clone(loadFixture('hotspots-search')) as {
      hotspots: Record<string, unknown>[];
    };
    // The recorded fixture has zero hotspots, so synthesise a broken one.
    fixture.hotspots.push({
      key: 'h1',
      component: 'acme_widget-service:src/secret.ts',
      project: 'acme_widget-service',
      securityCategory: 'auth',
      // vulnerabilityProbability missing
      status: 'TO_REVIEW',
      line: 1,
      message: 'check this',
      creationDate: '2026-05-08T00:00:00+0000',
      updateDate: '2026-05-08T00:00:00+0000',
      ruleKey: 'java:S1234',
    });

    const result = parseHotspotsSearchResponse(fixture);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('hotspots.0.vulnerabilityProbability');
  });

  it('preserves unknown extra fields at the response level', () => {
    interface WithExtra {
      unexpectedTopLevelField?: string;
    }
    const fixture = clone(loadFixture('hotspots-search')) as WithExtra;
    fixture.unexpectedTopLevelField = 'preserved';

    const result = parseHotspotsSearchResponse(fixture);
    expect(result.ok).toBe(true);
  });
});

describe('parseQualityGate', () => {
  it('parses the fixture', () => {
    const result = parseQualityGate(loadFixture('qualitygates-project-status'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.projectStatus.status).toBe('OK');
    expect(result.value.projectStatus.conditions.length).toBeGreaterThan(0);
  });

  it('rejects when projectStatus is missing its required `status`', () => {
    const fixture = clone(loadFixture('qualitygates-project-status')) as {
      projectStatus: { status?: string };
    };
    delete fixture.projectStatus.status;

    const result = parseQualityGate(fixture);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('projectStatus.status');
  });

  it('preserves unknown extra fields on conditions', () => {
    interface WithExtra {
      warnThreshold?: string;
    }
    const fixture = clone(loadFixture('qualitygates-project-status')) as {
      projectStatus: { conditions: WithExtra[] };
    };
    if (fixture.projectStatus.conditions[0])
      fixture.projectStatus.conditions[0].warnThreshold = '0.5';

    const result = parseQualityGate(fixture);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cond = result.value.projectStatus.conditions[0] as unknown as WithExtra;
    expect(cond.warnThreshold).toBe('0.5');
  });
});

describe('parseMeasuresComponentResponse', () => {
  it('parses the fixture', () => {
    const result = parseMeasuresComponentResponse(loadFixture('measures-component'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBeGreaterThan(0);
    expect(result.value[0]?.metric).toBeDefined();
  });

  it('rejects when a measure is missing its required `metric`', () => {
    const fixture = clone(loadFixture('measures-component')) as {
      component: { measures: { metric?: string }[] };
    };
    delete fixture.component.measures[0]?.metric;

    const result = parseMeasuresComponentResponse(fixture);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('component.measures.0.metric');
  });

  it('preserves unknown extra fields on measures', () => {
    interface WithExtra {
      trend?: string;
    }
    const fixture = clone(loadFixture('measures-component')) as {
      component: { measures: WithExtra[] };
    };
    if (fixture.component.measures[0]) fixture.component.measures[0].trend = 'up';

    const result = parseMeasuresComponentResponse(fixture);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const first = result.value[0] as unknown as WithExtra;
    expect(first.trend).toBe('up');
  });
});
