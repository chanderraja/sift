// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore, useFiltersStore, useSelectionStore } from '../../app/stores';
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
      '',
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

  it('clicking a row expands a panel with rule, message, and file:line', async () => {
    render(
      <IssuesTable
        items={[
          ISSUE({
            rule: 'typescript:S1234' as RuleKey,
            message: 'Use a const enum here.',
            component: 'acme_widget:src/foo.ts',
            line: 42,
          }),
        ]}
      />,
    );
    // The panel is hidden until the row is clicked.
    expect(screen.queryByText('Use a const enum here.')).toBeInTheDocument();
    // Click the row to expand. The drawer mounts additional copies of
    // the rule + file path. We assert via a panel test-id below.
    expect(screen.queryByTestId('issue-expand-panel')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Use a const enum here.'));
    const panel = screen.getByTestId('issue-expand-panel');
    expect(panel).toBeInTheDocument();
    expect(panel.textContent).toContain('typescript:S1234');
    expect(panel.textContent).toContain('src/foo.ts');
    expect(panel.textContent).toContain('42');
  });

  it('clicking an expanded row collapses it', async () => {
    render(<IssuesTable items={[ISSUE({ message: 'Same' })]} />);
    // The first row cell (Severity badge) is a stable click target that
    // is not duplicated inside the expand panel.
    const clickRow = async (): Promise<void> => {
      const rows = screen.getAllByRole('row');
      // rows[0] is the header; rows[1] is the body row.
      const target = rows[1];
      if (!target) throw new Error('body row not found');
      await userEvent.click(target);
    };
    await clickRow();
    expect(screen.getByTestId('issue-expand-panel')).toBeInTheDocument();
    await clickRow();
    expect(screen.queryByTestId('issue-expand-panel')).not.toBeInTheDocument();
  });

  it('clicking a different row swaps the expanded panel to it', async () => {
    render(
      <IssuesTable
        items={[
          ISSUE({ key: 'A' as IssueKey, message: 'First' }),
          ISSUE({ key: 'B' as IssueKey, message: 'Second' }),
        ]}
      />,
    );
    await userEvent.click(screen.getByText('First'));
    expect(screen.getByTestId('issue-expand-panel').textContent).toContain('First');
    await userEvent.click(screen.getByText('Second'));
    expect(screen.getByTestId('issue-expand-panel').textContent).toContain('Second');
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

describe('IssuesTable — SonarCloud link column', () => {
  const resetStores = (): void => {
    useFiltersStore.setState({ sort: [], page: 1 });
    useAuthStore.getState().clear();
    useSelectionStore.getState().reset();
  };

  beforeEach(() => {
    useAuthStore.setState({ token: 'squ_ok', validation: 'valid', region: 'eu' });
    useSelectionStore.setState({
      organizationKey: null,
      projectKey: 'acme_widget' as ProjectKey,
      branchName: 'main',
    });
  });
  afterEach(resetStores);

  it('renders a SonarCloud link for each row', () => {
    render(<IssuesTable items={[ISSUE({ key: 'AYx8K1pQ-1' as IssueKey })]} />);
    const link = screen.getByRole('link', { name: /open in sonarcloud/i });
    expect(link).toHaveAttribute(
      'href',
      'https://sonarcloud.io/project/issues?id=acme_widget&issues=AYx8K1pQ-1&open=AYx8K1pQ-1&branch=main',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('uses sonarqube.us host for US region', () => {
    useAuthStore.setState({ region: 'us' });
    render(<IssuesTable items={[ISSUE({ key: 'AYx8K1pQ-1' as IssueKey })]} />);
    const link = screen.getByRole('link', { name: /open in sonarcloud/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('sonarqube.us'));
  });
});
