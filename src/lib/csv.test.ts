// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import { hotspotsToCsv, issuesToCsv, qualityGateToCsv } from './csv';
import type { Hotspot, Issue, Measure, QualityGate } from '../types/sonar';

const UTF8_BOM = '﻿';

const base: Issue = {
  key: 'KEY1' as Issue['key'],
  rule: 'cpp:S3656' as Issue['rule'],
  severity: 'CRITICAL',
  type: 'CODE_SMELL',
  status: 'OPEN',
  resolution: null,
  component: 'acme:src/foo.cpp',
  project: 'acme' as Issue['project'],
  line: 42,
  message: 'Member variables should not be "protected".',
  effort: '20min',
  tags: ['pitfall', 'cppcoreguidelines'],
  creationDate: '2026-05-05T22:38:38+0000',
  updateDate: '2026-05-05T22:38:44+0000',
  flows: [],
};

describe('issuesToCsv', () => {
  it('empty list → header row only (with BOM)', () => {
    const result = issuesToCsv([]);
    expect(result.startsWith(UTF8_BOM)).toBe(true);
    const lines = result.slice(UTF8_BOM.length).split('\r\n');
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines[0]).toContain('severity');
    expect(lines[0]).toContain('rule');
    expect(lines[0]).toContain('message');
  });

  it('produces RFC 4180 CSV — doubles quotes inside fields', () => {
    const result = issuesToCsv([base]);
    expect(result.startsWith(UTF8_BOM)).toBe(true);
    const body = result.slice(UTF8_BOM.length);
    // The message contains a double-quote; RFC 4180 requires doubling it
    expect(body).toContain('"Member variables should not be ""protected""."');
  });

  it('preserves newlines in quoted fields', () => {
    const withNewline: Issue = {
      ...base,
      key: 'KEY2' as Issue['key'],
      message: 'line one\nline two',
    };
    const result = issuesToCsv([withNewline]);
    const body = result.slice(UTF8_BOM.length);
    expect(body).toContain('"line one\nline two"');
  });
});

const hotspotBase: Hotspot = {
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

describe('hotspotsToCsv', () => {
  it('empty list → header row only (with BOM)', () => {
    const result = hotspotsToCsv([]);
    expect(result.startsWith(UTF8_BOM)).toBe(true);
    const header = result.slice(UTF8_BOM.length).split('\r\n')[0] ?? '';
    expect(header).toContain('Probability');
    expect(header).toContain('Category');
    expect(header).toContain('Message');
  });

  it('single row contains all expected columns', () => {
    const result = hotspotsToCsv([hotspotBase]);
    expect(result).toContain('HIGH');
    expect(result).toContain('TO_REVIEW');
    expect(result).toContain('auth');
    expect(result).toContain('java:S2068');
    expect(result).toContain('src/auth/legacy.java');
    expect(result).toContain('47');
    expect(result).toContain('2026-05-01');
  });

  it('multi-row with embedded comma in message is RFC 4180 quoted', () => {
    const withComma: Hotspot = {
      ...hotspotBase,
      key: 'HS2',
      message: 'Do not use, this is unsafe.',
    };
    const result = hotspotsToCsv([hotspotBase, withComma]);
    expect(result).toContain('"Do not use, this is unsafe."');
    const lines = result.split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it('multi-row with embedded newline in message is RFC 4180 quoted', () => {
    const withNewline: Hotspot = {
      ...hotspotBase,
      key: 'HS3',
      message: 'line one\nline two',
    };
    const result = hotspotsToCsv([withNewline]);
    expect(result).toContain('"line one\nline two"');
  });
});

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
    ],
  },
};

const qgMeasures: Measure[] = [
  { metric: 'ncloc', value: '4849' },
  { metric: 'reliability_rating', value: '1.0', bestValue: true },
];

describe('qualityGateToCsv', () => {
  it('header row contains expected columns (with BOM)', () => {
    const result = qualityGateToCsv(qg, qgMeasures);
    expect(result.startsWith(UTF8_BOM)).toBe(true);
    const header = result.slice(UTF8_BOM.length).split('\r\n')[0] ?? '';
    expect(header).toContain('Section');
    expect(header).toContain('Metric');
    expect(header).toContain('Comparator');
    expect(header).toContain('Value');
    expect(header).toContain('Status');
  });

  it('condition rows have Section="condition" with Comparator/Threshold/Actual/Status filled', () => {
    const result = qualityGateToCsv(qg, qgMeasures);
    expect(result).toContain('condition');
    expect(result).toContain('new_coverage');
    expect(result).toContain('LT');
    expect(result).toContain('80');
    expect(result).toContain('65.4');
  });

  it('measure rows have Section="measure" with Value/Best filled and Comparator empty', () => {
    const result = qualityGateToCsv(qg, qgMeasures);
    expect(result).toContain('measure');
    expect(result).toContain('ncloc');
    expect(result).toContain('4849');
    expect(result).toContain('reliability_rating');
    expect(result).toContain('true');
  });

  it('empty QG with no conditions or measures → header row only', () => {
    const empty: QualityGate = { projectStatus: { status: 'OK', conditions: [] } };
    const result = qualityGateToCsv(empty, []);
    expect(result.startsWith(UTF8_BOM)).toBe(true);
    const lines = result.slice(UTF8_BOM.length).split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(1); // header only
  });
});
