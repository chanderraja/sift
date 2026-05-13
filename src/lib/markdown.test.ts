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
} from './markdown';
import type { Hotspot, Issue, Measure, QualityGate } from '../types/sonar';

const hotspot1: Hotspot = {
  key: 'HS1',
  component: 'acme:src/auth/legacy.java',
  project: 'acme' as Hotspot['project'],
  securityCategory: 'auth',
  vulnerabilityProbability: 'HIGH',
  status: 'TO_REVIEW',
  line: 47,
  message: 'Hard-coded credentials detected.',
  creationDate: '2026-05-01T00:00:00+0000',
  updateDate: '2026-05-01T00:00:00+0000',
  ruleKey: 'java:S2068' as Hotspot['ruleKey'],
};

const hotspot2: Hotspot = {
  key: 'HS2',
  component: 'acme:src/crypto/utils.java',
  project: 'acme' as Hotspot['project'],
  securityCategory: 'cryptography',
  vulnerabilityProbability: 'MEDIUM',
  status: 'TO_REVIEW',
  line: 12,
  message: 'Weak cipher used.',
  creationDate: '2026-05-02T00:00:00+0000',
  updateDate: '2026-05-02T00:00:00+0000',
  ruleKey: 'java:S4426' as Hotspot['ruleKey'],
};

const qg: QualityGate = {
  projectStatus: {
    status: 'ERROR',
    conditions: [
      {
        status: 'ERROR',
        metricKey: 'new_coverage',
        comparator: 'LT',
        errorThreshold: '80',
        actualValue: '65.4',
      },
      {
        status: 'OK',
        metricKey: 'new_duplicated_lines_density',
        comparator: 'GT',
        errorThreshold: '3',
        actualValue: '1.2',
      },
    ],
  },
};

const measures: Measure[] = [
  { metric: 'ncloc', value: '4849' },
  { metric: 'reliability_rating', value: '1.0', bestValue: true },
];

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

const context = {
  projectKey: 'acme',
  branch: 'main',
  generatedAt: '2026-05-11T00:00:00.000Z',
  totalFindings: 2,
  appliedFilters: 'severity=BLOCKER,CRITICAL',
};

describe('markdownTriage', () => {
  it('produces numbered list with severity prefix and file:line in code', () => {
    const md = markdownTriage([issue1, issue2], context);
    expect(md).toContain('1. BLOCKER');
    expect(md).toContain('`src/services/payment.ts:142`');
    expect(md).toContain('typescript:S6571');
    expect(md).toContain('2. CRITICAL');
    expect(md).toContain('`src/services/auth.ts:55`');
  });

  it('includes header block', () => {
    const md = markdownTriage([issue1], context);
    expect(md).toContain('acme');
    expect(md).toContain('main');
    expect(md).toContain('2026-05-11');
  });
});

describe('markdownGroupedByFile', () => {
  it('produces H2 per file with bullets for findings', () => {
    const md = markdownGroupedByFile([issue1, issue2], context);
    expect(md).toContain('## src/services/payment.ts');
    expect(md).toContain('## src/services/auth.ts');
    expect(md).toMatch(/^-\s/m);
  });

  it('includes header block', () => {
    const md = markdownGroupedByFile([issue1], context);
    expect(md).toContain('acme');
  });
});

describe('markdownGroupedByRule', () => {
  it('produces H2 per rule key with bullets for each occurrence', () => {
    const md = markdownGroupedByRule([issue1, issue2], context);
    expect(md).toContain('## typescript:S6571');
    const occurrences = md.match(/src\/services\//g);
    expect(occurrences?.length).toBeGreaterThanOrEqual(2);
  });

  it('includes header block', () => {
    const md = markdownGroupedByRule([issue1], context);
    expect(md).toContain('acme');
  });
});

describe('markdownLlmRemediation', () => {
  it('prepends an instruction and includes structured findings', () => {
    const md = markdownLlmRemediation([issue1, issue2], context);
    // Instruction is present near the top
    const instructionIdx = md.indexOf('You are');
    const findingsIdx = md.indexOf('### Findings');
    expect(instructionIdx).toBeGreaterThanOrEqual(0);
    expect(findingsIdx).toBeGreaterThan(instructionIdx);
  });

  it('includes header block and all issues', () => {
    const md = markdownLlmRemediation([issue1, issue2], context);
    expect(md).toContain('acme');
    expect(md).toContain('payment.ts');
    expect(md).toContain('auth.ts');
  });
});

describe('markdownHotspotTriage', () => {
  it('produces numbered list with probability prefix and file:line in code', () => {
    const md = markdownHotspotTriage([hotspot1, hotspot2], context);
    expect(md).toContain('1. HIGH');
    expect(md).toContain('`src/auth/legacy.java:47`');
    expect(md).toContain('java:S2068');
    expect(md).toContain('2. MEDIUM');
    expect(md).toContain('`src/crypto/utils.java:12`');
  });

  it('includes header block', () => {
    const md = markdownHotspotTriage([hotspot1], context);
    expect(md).toContain('acme');
    expect(md).toContain('main');
  });

  it('handles empty list gracefully', () => {
    const md = markdownHotspotTriage([], context);
    expect(md).toContain('# Hotspot Triage List');
  });
});

describe('markdownHotspotGroupedByFile', () => {
  it('produces H2 per file with bullets for hotspots', () => {
    const md = markdownHotspotGroupedByFile([hotspot1, hotspot2], context);
    expect(md).toContain('## src/auth/legacy.java');
    expect(md).toContain('## src/crypto/utils.java');
    expect(md).toMatch(/^-\s/m);
  });

  it('groups two hotspots in the same file under a single H2', () => {
    const hs2sameFile: Hotspot = { ...hotspot2, component: 'acme:src/auth/legacy.java', line: 99 };
    const md = markdownHotspotGroupedByFile([hotspot1, hs2sameFile], context);
    const h2Count = (md.match(/^## /gm) ?? []).length;
    expect(h2Count).toBe(1);
  });

  it('includes header block', () => {
    const md = markdownHotspotGroupedByFile([hotspot1], context);
    expect(md).toContain('acme');
  });
});

describe('markdownHotspotGroupedByCategory', () => {
  it('produces H2 per security category with bullets', () => {
    const md = markdownHotspotGroupedByCategory([hotspot1, hotspot2], context);
    expect(md).toContain('## auth');
    expect(md).toContain('## cryptography');
    expect(md).toMatch(/^-\s/m);
  });

  it('groups hotspots sharing a category under one H2', () => {
    const hs2sameCategory: Hotspot = { ...hotspot2, securityCategory: 'auth' };
    const md = markdownHotspotGroupedByCategory([hotspot1, hs2sameCategory], context);
    const h2Count = (md.match(/^## /gm) ?? []).length;
    expect(h2Count).toBe(1);
  });

  it('includes header block', () => {
    const md = markdownHotspotGroupedByCategory([hotspot1], context);
    expect(md).toContain('acme');
  });
});

describe('markdownHotspotLlmSecurityReview', () => {
  it('prepends security engineer instruction and lists hotspots', () => {
    const md = markdownHotspotLlmSecurityReview([hotspot1, hotspot2], context);
    const instructionIdx = md.indexOf('You are a senior security engineer');
    const hotspotIdx = md.indexOf('### Hotspots');
    expect(instructionIdx).toBeGreaterThanOrEqual(0);
    expect(hotspotIdx).toBeGreaterThan(instructionIdx);
  });

  it('includes probability, rule, file, and category for each hotspot', () => {
    const md = markdownHotspotLlmSecurityReview([hotspot1], context);
    expect(md).toContain('HIGH');
    expect(md).toContain('java:S2068');
    expect(md).toContain('src/auth/legacy.java');
    expect(md).toContain('auth');
  });
});

describe('markdownQualityGateSnapshot', () => {
  it('produces H1 with gate status', () => {
    const md = markdownQualityGateSnapshot(qg, measures, context);
    expect(md).toContain('# Quality Gate: ERROR');
  });

  it('includes conditions table with all rows', () => {
    const md = markdownQualityGateSnapshot(qg, measures, context);
    expect(md).toContain('new_coverage');
    expect(md).toContain('65.4');
    expect(md).toContain('new_duplicated_lines_density');
  });

  it('includes measures table', () => {
    const md = markdownQualityGateSnapshot(qg, measures, context);
    expect(md).toContain('ncloc');
    expect(md).toContain('4849');
    expect(md).toContain('reliability_rating');
  });

  it('includes header block', () => {
    const md = markdownQualityGateSnapshot(qg, measures, context);
    expect(md).toContain('acme');
    expect(md).toContain('main');
  });
});
