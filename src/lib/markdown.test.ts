// SPDX-License-Identifier: MIT

import { describe, it, expect } from 'vitest';
import {
  markdownTriage,
  markdownGroupedByFile,
  markdownGroupedByRule,
  markdownLlmRemediation,
} from './markdown';
import type { Issue } from '../types/sonar';

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
