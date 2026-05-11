// SPDX-License-Identifier: MIT

import Papa from 'papaparse';
import type { Issue } from '../types/sonar';

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

export function issuesToCsv(issues: Issue[], fields: CsvField[] = DEFAULT_FIELDS): string {
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
