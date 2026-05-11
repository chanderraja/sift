// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import { issuesToCsv } from './csv';
import type { Issue } from '../types/sonar';

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
