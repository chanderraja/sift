// SPDX-License-Identifier: MIT

import Papa from 'papaparse';
import type { Hotspot, Issue, Measure, QualityGate } from '../types/sonar';

const UTF8_BOM = '﻿';

export interface CsvField {
  header: string;
  value: (issue: Issue) => string | number | null | undefined;
}

const DEFAULT_FIELDS: CsvField[] = [
  { header: 'key', value: (i) => i.key },
  { header: 'severity', value: (i) => i.severity },
  { header: 'type', value: (i) => i.type },
  { header: 'rule', value: (i) => i.rule },
  { header: 'status', value: (i) => i.status },
  { header: 'resolution', value: (i) => i.resolution ?? '' },
  { header: 'component', value: (i) => i.component },
  { header: 'line', value: (i) => i.line ?? '' },
  { header: 'message', value: (i) => i.message },
  { header: 'effort', value: (i) => i.effort ?? '' },
  { header: 'tags', value: (i) => i.tags.join(';') },
  { header: 'assignee', value: (i) => i.assignee ?? '' },
  { header: 'creationDate', value: (i) => i.creationDate },
  { header: 'updateDate', value: (i) => i.updateDate },
];

const filePathFromComponent = (component: string): string => {
  const idx = component.indexOf(':');
  return idx === -1 ? component : component.slice(idx + 1);
};

export function issuesToCsv(issues: readonly Issue[], fields: CsvField[] = DEFAULT_FIELDS): string {
  const headers = fields.map((f) => f.header);

  if (issues.length === 0) {
    // PapaParse omits the header row for empty arrays; emit it manually.
    const headerRow = Papa.unparse([{}], { columns: headers, newline: '\r\n' }).split('\r\n')[0];
    return UTF8_BOM + (headerRow ?? headers.join(','));
  }

  const data = issues.map((issue) =>
    Object.fromEntries(fields.map((f) => [f.header, f.value(issue) ?? ''])),
  );

  const csv = Papa.unparse(data, {
    columns: headers,
    newline: '\r\n',
  });

  return UTF8_BOM + csv;
}

export type HotspotCsvFieldId =
  | 'vulnerabilityProbability'
  | 'status'
  | 'securityCategory'
  | 'ruleKey'
  | 'message'
  | 'file'
  | 'line'
  | 'creationDate';

interface HotspotCsvField {
  id: HotspotCsvFieldId;
  header: string;
  value: (h: Hotspot) => string | number | null | undefined;
}

const HOTSPOT_FIELDS: HotspotCsvField[] = [
  {
    id: 'vulnerabilityProbability',
    header: 'Probability',
    value: (h) => h.vulnerabilityProbability,
  },
  { id: 'status', header: 'Status', value: (h) => h.status },
  { id: 'securityCategory', header: 'Category', value: (h) => h.securityCategory },
  { id: 'ruleKey', header: 'Rule', value: (h) => h.ruleKey },
  { id: 'message', header: 'Message', value: (h) => h.message },
  { id: 'file', header: 'File', value: (h) => filePathFromComponent(h.component) },
  { id: 'line', header: 'Line', value: (h) => h.line ?? '' },
  { id: 'creationDate', header: 'Created', value: (h) => h.creationDate },
];

export function hotspotsToCsv(
  hotspots: readonly Hotspot[],
  enabledFields?: ReadonlySet<HotspotCsvFieldId>,
): string {
  const fields =
    enabledFields !== undefined
      ? HOTSPOT_FIELDS.filter((f) => enabledFields.has(f.id))
      : HOTSPOT_FIELDS;
  const headers = fields.map((f) => f.header);

  if (hotspots.length === 0) {
    const headerRow = Papa.unparse([{}], { columns: headers, newline: '\r\n' }).split('\r\n')[0];
    return UTF8_BOM + (headerRow ?? headers.join(','));
  }

  const data = hotspots.map((h) =>
    Object.fromEntries(fields.map((f) => [f.header, f.value(h) ?? ''])),
  );

  return UTF8_BOM + Papa.unparse(data, { columns: headers, newline: '\r\n' });
}

const QG_HEADERS = [
  'Section',
  'Metric',
  'Comparator',
  'Threshold',
  'Actual',
  'Value',
  'Best',
  'Status',
] as const;

export function qualityGateToCsv(qg: QualityGate, measures: readonly Measure[]): string {
  const headers = [...QG_HEADERS];

  const conditionRows = qg.projectStatus.conditions.map((c) => ({
    Section: 'condition',
    Metric: c.metricKey,
    Comparator: c.comparator,
    Threshold: c.errorThreshold,
    Actual: c.actualValue,
    Value: '',
    Best: '',
    Status: c.status,
  }));

  const measureRows = measures.map((m) => ({
    Section: 'measure',
    Metric: m.metric,
    Comparator: '',
    Threshold: '',
    Actual: '',
    Value: m.value ?? '',
    Best: m.bestValue === undefined ? '' : String(m.bestValue),
    Status: '',
  }));

  const allRows = [...conditionRows, ...measureRows];

  if (allRows.length === 0) {
    const headerRow = Papa.unparse([{}], { columns: headers, newline: '\r\n' }).split('\r\n')[0];
    return UTF8_BOM + (headerRow ?? headers.join(','));
  }

  return UTF8_BOM + Papa.unparse(allRows, { columns: headers, newline: '\r\n' });
}
