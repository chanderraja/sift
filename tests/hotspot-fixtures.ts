// SPDX-License-Identifier: MIT

// Shared typed fixtures for hotspot, quality-gate, and measures test data.
// Imported by markdown.test.ts, csv.test.ts, and ExportModal.test.tsx so
// the struct definitions are not repeated across test files.

import type { Hotspot, Measure, QualityGate } from '../src/types/sonar';

export const baseHotspot: Hotspot = {
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

export const baseQualityGate: QualityGate = {
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

export const baseMeasures: Measure[] = [{ metric: 'ncloc', value: '4849' }];
