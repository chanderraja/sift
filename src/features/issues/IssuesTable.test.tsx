// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useFiltersStore } from '../../app/stores';
import type { Issue, IssueKey, ProjectKey, RuleKey } from '../../types/sonar';

import { IssuesTable } from './IssuesTable';

const ISSUE = (overrides: Partial<Issue> = {}): Issue => ({
  key: 'AYx8K1pQ-1' as IssueKey,
  rule: 'typescript:S6571' as RuleKey,
  severity: 'BLOCKER',
  type: 'BUG',
  status: 'OPEN',
  resolution: null,
  component: 'acme_widget:src/services/payment.ts',
  project: 'acme_widget' as ProjectKey,
  line: 142,
  flows: [],
  message: 'Refactor this function to reduce its Cognitive Complexity.',
  tags: ['brain-overload'],
  creationDate: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  updateDate: new Date().toISOString(),
  effort: '1h 30min',
  ...overrides,
});

const reset = (): void => {
  useFiltersStore.setState({ sort: [], page: 1 });
};

beforeEach(reset);
afterEach(reset);

describe('IssuesTable', () => {
  it('renders one row per item', () => {
    const items: Issue[] = [
      ISSUE({ key: 'A' as IssueKey, severity: 'BLOCKER' }),
      ISSUE({ key: 'B' as IssueKey, severity: 'CRITICAL' }),
      ISSUE({ key: 'C' as IssueKey, severity: 'MAJOR' }),
    ];
    render(<IssuesTable items={items} />);
    // 1 header row + 3 body rows.
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });

  it('renders the documented column set in the header', () => {
    render(<IssuesTable items={[ISSUE()]} />);
    const headers = screen
      .getAllByRole('columnheader')
      .map((h) => h.textContent?.replace(/\s+/g, ' ').trim());
    expect(headers).toEqual([
      'Severity',
      'Type',
      'Status',
      'Rule',
      'Message',
      'File',
      'Line',
      'Effort',
      'Tags',
      'Created',
    ]);
  });

  it('renders severity / type / status as badges with text labels', () => {
    render(<IssuesTable items={[ISSUE({ severity: 'BLOCKER', type: 'BUG', status: 'OPEN' })]} />);
    expect(screen.getByText('BLOCKER')).toBeInTheDocument();
    // Type "BUG" — the TypeBadge title appears alongside the column header "Type".
    expect(screen.getAllByText('BUG').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('OPEN')).toBeInTheDocument();
  });

  it('strips the projectKey prefix from the file column', () => {
    render(<IssuesTable items={[ISSUE({ component: 'acme_widget:src/foo.ts' })]} />);
    expect(screen.getByText('src/foo.ts')).toBeInTheDocument();
    expect(screen.queryByText('acme_widget:src/foo.ts')).not.toBeInTheDocument();
  });

  it('clicking a sortable header writes filtersStore.sort', async () => {
    render(<IssuesTable items={[ISSUE()]} />);
    await userEvent.click(screen.getByRole('button', { name: /Severity/ }));
    expect(useFiltersStore.getState().sort).toEqual([{ column: 'severity', direction: 'asc' }]);
    await userEvent.click(screen.getByRole('button', { name: /Severity/ }));
    expect(useFiltersStore.getState().sort).toEqual([{ column: 'severity', direction: 'desc' }]);
  });

  it('reflects an externally-set sort on the header indicator', () => {
    useFiltersStore.setState({ sort: [{ column: 'rule', direction: 'desc' }] });
    render(<IssuesTable items={[ISSUE()]} />);
    expect(
      screen.getAllByRole('columnheader').find((h) => h.textContent?.includes('Rule')),
    ).toHaveAttribute('aria-sort', 'descending');
  });

  it('handles missing optional fields without crashing', () => {
    // exactOptionalPropertyTypes forbids `line: undefined` — omit the
    // optional keys entirely instead.
    const { line: _line, effort: _effort, ...rest } = ISSUE();
    void _line;
    void _effort;
    const partial: Issue = { ...rest, tags: [] };
    render(<IssuesTable items={[partial]} />);
    // The em-dash placeholders appear for line and effort.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });
});
