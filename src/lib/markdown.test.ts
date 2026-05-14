// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import {
  markdownTriage,
  markdownGroupedByFile,
  markdownGroupedByRule,
  markdownLlmRemediation,
  markdownHotspotTriage,
  markdownHotspotGroupedByFile,
  markdownHotspotGroupedByCategory,
  markdownHotspotLlmSecurityReview,
  markdownQualityGateSnapshot,
  markdownQualityGateActionable,
} from './markdown';
import type { Hotspot, Issue } from '../types/sonar';
import { DRIVER_LIMIT, type ConditionWithDrivers } from './qgDrivers';
import { baseHotspot, baseQualityGate, baseMeasures } from '../../tests/hotspot-fixtures';

const hotspot1 = baseHotspot;

const hotspot2 = {
  ...baseHotspot,
  key: 'HS2',
  component: 'acme:src/crypto/utils.java',
  securityCategory: 'cryptography',
  vulnerabilityProbability: 'MEDIUM' as const,
  line: 12,
  message: 'Weak cipher used.',
  creationDate: '2026-05-02T00:00:00+0000',
  updateDate: '2026-05-02T00:00:00+0000',
  ruleKey: 'java:S4426' as (typeof baseHotspot)['ruleKey'],
};

const qg = {
  ...baseQualityGate,
  projectStatus: {
    ...baseQualityGate.projectStatus,
    conditions: [
      ...baseQualityGate.projectStatus.conditions,
      {
        status: 'OK' as const,
        metricKey: 'new_duplicated_lines_density',
        comparator: 'GT' as const,
        errorThreshold: '3',
        actualValue: '1.2',
      },
    ],
  },
};

const measures = [...baseMeasures, { metric: 'reliability_rating', value: '1.0', bestValue: true }];

const issue1: Issue = {
  key: 'KEY1' as Issue['key'],
  rule: 'typescript:S6571' as Issue['rule'],
  severity: 'BLOCKER',
  type: 'BUG',
  status: 'OPEN',
  resolution: null,
  component: 'acme:src/services/payment.ts',
  project: 'acme' as Issue['project'],
  line: 142,
  message: 'Fix this cognitive complexity issue.',
  effort: '30min',
  tags: [],
  creationDate: '2026-05-05T22:00:00+0000',
  updateDate: '2026-05-05T22:00:00+0000',
  flows: [],
};

const issue2: Issue = {
  ...issue1,
  key: 'KEY2' as Issue['key'],
  rule: 'typescript:S6571' as Issue['rule'],
  severity: 'CRITICAL',
  component: 'acme:src/services/auth.ts',
  line: 55,
  message: 'Another cognitive complexity issue.',
};

const issueCtx = {
  tab: 'issues' as const,
  projectKey: 'acme',
  branch: 'main',
  generatedAt: '2026-05-11T00:00:00.000Z',
  totalFindings: 2,
  appliedFilters: 'severity=BLOCKER,CRITICAL',
};

const hotspotCtx = {
  tab: 'hotspots' as const,
  projectKey: 'acme',
  branch: 'main',
  generatedAt: '2026-05-11T00:00:00.000Z',
  totalHotspots: 2,
  appliedFilters: '{}',
};

const qgCtx = {
  tab: 'quality-gate' as const,
  projectKey: 'acme',
  branch: 'main',
  generatedAt: '2026-05-11T00:00:00.000Z',
  qualityGateStatus: 'ERROR',
  conditionsFailing: '1/2',
  appliedFilters: '{}',
};

function expectIssueHeader(md: string): void {
  expect(md).toContain('acme');
  expect(md).toContain('main');
  expect(md).toContain('total_findings: 2');
}

function expectHotspotHeader(md: string): void {
  expect(md).toContain('acme');
  expect(md).toContain('main');
  expect(md).toContain('total_hotspots: 2');
}

function expectQgHeader(md: string): void {
  expect(md).toContain('acme');
  expect(md).toContain('main');
  expect(md).toContain('quality_gate_status: ERROR');
  expect(md).toContain('conditions_failing: 1/2');
}

describe('markdownTriage', () => {
  it('produces numbered list with severity prefix and file:line in code', () => {
    const md = markdownTriage([issue1, issue2], issueCtx);
    expect(md).toContain('1. BLOCKER');
    expect(md).toContain('`src/services/payment.ts:142`');
    expect(md).toContain('typescript:S6571');
    expect(md).toContain('2. CRITICAL');
    expect(md).toContain('`src/services/auth.ts:55`');
  });

  it('includes header block', () => {
    const md = markdownTriage([issue1], issueCtx);
    expectIssueHeader(md);
    expect(md).toContain('2026-05-11');
  });
});

describe('markdownGroupedByFile', () => {
  it('produces H2 per file with bullets for findings', () => {
    const md = markdownGroupedByFile([issue1, issue2], issueCtx);
    expect(md).toContain('## src/services/payment.ts');
    expect(md).toContain('## src/services/auth.ts');
    expect(md).toMatch(/^-\s/m);
  });

  it('includes header block', () => {
    expectIssueHeader(markdownGroupedByFile([issue1], issueCtx));
  });
});

describe('markdownGroupedByRule', () => {
  it('produces H2 per rule key with bullets for each occurrence', () => {
    const md = markdownGroupedByRule([issue1, issue2], issueCtx);
    expect(md).toContain('## typescript:S6571');
    const occurrences = md.match(/src\/services\//g);
    expect(occurrences?.length).toBeGreaterThanOrEqual(2);
  });

  it('includes header block', () => {
    expectIssueHeader(markdownGroupedByRule([issue1], issueCtx));
  });
});

describe('markdownLlmRemediation', () => {
  it('prepends an instruction and includes structured findings', () => {
    const md = markdownLlmRemediation([issue1, issue2], issueCtx);
    // Instruction is present near the top
    const instructionIdx = md.indexOf('You are');
    const findingsIdx = md.indexOf('### Findings');
    expect(instructionIdx).toBeGreaterThanOrEqual(0);
    expect(findingsIdx).toBeGreaterThan(instructionIdx);
  });

  it('includes header block and all issues', () => {
    const md = markdownLlmRemediation([issue1, issue2], issueCtx);
    expectIssueHeader(md);
    expect(md).toContain('payment.ts');
    expect(md).toContain('auth.ts');
  });
});

describe('markdownHotspotTriage', () => {
  it('produces numbered list with probability prefix and file:line in code', () => {
    const md = markdownHotspotTriage([hotspot1, hotspot2], hotspotCtx);
    expect(md).toContain('1. HIGH');
    expect(md).toContain('`src/auth/legacy.java:47`');
    expect(md).toContain('java:S2068');
    expect(md).toContain('2. MEDIUM');
    expect(md).toContain('`src/crypto/utils.java:12`');
  });

  it('includes header block', () => {
    expectHotspotHeader(markdownHotspotTriage([hotspot1], hotspotCtx));
  });

  it('handles empty list gracefully', () => {
    const md = markdownHotspotTriage([], hotspotCtx);
    expect(md).toContain('# Hotspot Triage List');
  });
});

describe('markdownHotspotGroupedByFile', () => {
  it('produces H2 per file with bullets for hotspots', () => {
    const md = markdownHotspotGroupedByFile([hotspot1, hotspot2], hotspotCtx);
    expect(md).toContain('## src/auth/legacy.java');
    expect(md).toContain('## src/crypto/utils.java');
    expect(md).toMatch(/^-\s/m);
  });

  it('groups two hotspots in the same file under a single H2', () => {
    const hs2sameFile: Hotspot = { ...hotspot2, component: 'acme:src/auth/legacy.java', line: 99 };
    const md = markdownHotspotGroupedByFile([hotspot1, hs2sameFile], hotspotCtx);
    const h2Count = (md.match(/^## /gm) ?? []).length;
    expect(h2Count).toBe(1);
  });

  it('includes header block', () => {
    expectHotspotHeader(markdownHotspotGroupedByFile([hotspot1], hotspotCtx));
  });
});

describe('markdownHotspotGroupedByCategory', () => {
  it('produces H2 per security category with bullets', () => {
    const md = markdownHotspotGroupedByCategory([hotspot1, hotspot2], hotspotCtx);
    expect(md).toContain('## auth');
    expect(md).toContain('## cryptography');
    expect(md).toMatch(/^-\s/m);
  });

  it('groups hotspots sharing a category under one H2', () => {
    const hs2sameCategory: Hotspot = { ...hotspot2, securityCategory: 'auth' };
    const md = markdownHotspotGroupedByCategory([hotspot1, hs2sameCategory], hotspotCtx);
    const h2Count = (md.match(/^## /gm) ?? []).length;
    expect(h2Count).toBe(1);
  });

  it('includes header block', () => {
    expectHotspotHeader(markdownHotspotGroupedByCategory([hotspot1], hotspotCtx));
  });
});

describe('markdownHotspotLlmSecurityReview', () => {
  it('prepends security engineer instruction and lists hotspots', () => {
    const md = markdownHotspotLlmSecurityReview([hotspot1, hotspot2], hotspotCtx);
    const instructionIdx = md.indexOf('You are a senior security engineer');
    const hotspotIdx = md.indexOf('### Hotspots');
    expect(instructionIdx).toBeGreaterThanOrEqual(0);
    expect(hotspotIdx).toBeGreaterThan(instructionIdx);
  });

  it('includes probability, rule, file, and category for each hotspot', () => {
    const md = markdownHotspotLlmSecurityReview([hotspot1], hotspotCtx);
    expect(md).toContain('HIGH');
    expect(md).toContain('java:S2068');
    expect(md).toContain('src/auth/legacy.java');
    expect(md).toContain('auth');
  });
});

describe('markdownQualityGateActionable', () => {
  const condition1 = {
    status: 'ERROR' as const,
    metricKey: 'reliability_rating',
    comparator: 'GT' as const,
    errorThreshold: '1',
    actualValue: '3.0',
  };

  const condition2 = {
    status: 'ERROR' as const,
    metricKey: 'security_hotspots_reviewed',
    comparator: 'LT' as const,
    errorThreshold: '80',
    actualValue: '50',
  };

  it('includes header block with QG-specific fields', () => {
    expectQgHeader(markdownQualityGateActionable(qg, measures, [], qgCtx));
  });

  it('produces H1 with gate status', () => {
    const md = markdownQualityGateActionable(qg, measures, [], qgCtx);
    expect(md).toContain('# Quality Gate: ERROR');
  });

  it('renders an issues driver with issue rows', () => {
    const condWithDriver: ConditionWithDrivers = {
      condition: condition1,
      driverResult: { kind: 'issues', items: [issue1, issue2] },
    };
    const md = markdownQualityGateActionable(qg, measures, [condWithDriver], qgCtx);
    expect(md).toContain('reliability_rating');
    expect(md).toContain('payment.ts');
    expect(md).toContain('BLOCKER');
  });

  it('renders a hotspot driver with hotspot rows', () => {
    const condWithDriver: ConditionWithDrivers = {
      condition: condition2,
      driverResult: { kind: 'hotspots', items: [hotspot1] },
    };
    const md = markdownQualityGateActionable(qg, measures, [condWithDriver], qgCtx);
    expect(md).toContain('security_hotspots_reviewed');
    expect(md).toContain('src/auth/legacy.java');
    expect(md).toContain('HIGH');
  });

  it('renders a note driver', () => {
    const condWithDriver: ConditionWithDrivers = {
      condition: { ...condition1, metricKey: 'coverage' },
      driverResult: { kind: 'note', message: 'Requires test coverage improvements.' },
    };
    const md = markdownQualityGateActionable(qg, measures, [condWithDriver], qgCtx);
    expect(md).toContain('coverage');
    expect(md).toContain('Requires test coverage improvements.');
  });

  it('renders an error driver', () => {
    const condWithDriver: ConditionWithDrivers = {
      condition: condition1,
      driverResult: { kind: 'error', message: 'Request failed.' },
    };
    const md = markdownQualityGateActionable(qg, measures, [condWithDriver], qgCtx);
    expect(md).toContain('reliability_rating');
    expect(md).toContain('Request failed.');
  });

  it('caps issue rows at DRIVER_LIMIT', () => {
    const manyIssues = Array.from({ length: DRIVER_LIMIT + 5 }, (_, i) => ({
      ...issue1,
      key: `KEY${i}` as Issue['key'],
    }));
    const condWithDriver: ConditionWithDrivers = {
      condition: condition1,
      driverResult: { kind: 'issues', items: manyIssues },
    };
    const md = markdownQualityGateActionable(qg, measures, [condWithDriver], qgCtx);
    const rows = (md.match(/^- \*\*/gm) ?? []).length;
    expect(rows).toBe(DRIVER_LIMIT);
  });

  it('includes the LLM prompt', () => {
    const md = markdownQualityGateActionable(qg, measures, [], qgCtx);
    expect(md).toMatch(/You are a senior engineer/i);
  });
});

describe('markdownQualityGateSnapshot', () => {
  it('produces H1 with gate status', () => {
    const md = markdownQualityGateSnapshot(qg, measures, qgCtx);
    expect(md).toContain('# Quality Gate: ERROR');
  });

  it('includes conditions table with all rows', () => {
    const md = markdownQualityGateSnapshot(qg, measures, qgCtx);
    expect(md).toContain('new_coverage');
    expect(md).toContain('65.4');
    expect(md).toContain('new_duplicated_lines_density');
  });

  it('includes measures table', () => {
    const md = markdownQualityGateSnapshot(qg, measures, qgCtx);
    expect(md).toContain('ncloc');
    expect(md).toContain('4849');
    expect(md).toContain('reliability_rating');
  });

  it('includes header block', () => {
    expectQgHeader(markdownQualityGateSnapshot(qg, measures, qgCtx));
  });
});
