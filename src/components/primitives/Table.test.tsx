// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { TableBody, TableCell, TableHeader, TableHeaderCell, TableRoot, TableRow } from './Table';

const Basic = ({
  expandedRow,
  onSort,
}: {
  expandedRow?: boolean;
  onSort?: () => void;
} = {}): React.JSX.Element => (
  <TableRoot>
    <TableHeader>
      <TableRow>
        <TableHeaderCell sortDirection="asc" {...(onSort ? { onSort } : {})}>
          Severity
        </TableHeaderCell>
        <TableHeaderCell>Rule</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow expanded={expandedRow ?? false} expandedContent="details" expandedColSpan={2}>
        <TableCell>BLOCKER</TableCell>
        <TableCell>typescript:S6571</TableCell>
      </TableRow>
    </TableBody>
  </TableRoot>
);

describe('Table primitives', () => {
  it('renders a table with header and body cells', () => {
    render(<Basic />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Severity/ })).toBeInTheDocument();
    expect(screen.getByText('typescript:S6571')).toBeInTheDocument();
  });

  it('TableHeaderCell sets aria-sort from sortDirection', () => {
    render(<Basic />);
    const sevHeader = screen.getByRole('columnheader', { name: /Severity/ });
    expect(sevHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('TableHeaderCell renders a sort button when onSort is provided', async () => {
    const onSort = vi.fn();
    render(<Basic onSort={onSort} />);
    const btn = screen.getByRole('button', { name: /Severity/ });
    await userEvent.click(btn);
    expect(onSort).toHaveBeenCalled();
  });

  it('renders a non-button header cell when onSort is omitted (Rule column)', () => {
    render(<Basic />);
    const ruleHeader = screen.getByRole('columnheader', { name: /Rule/ });
    expect(ruleHeader.querySelector('button')).toBeNull();
  });

  it('TableRow renders an expanded row below the main row when expanded', () => {
    render(<Basic expandedRow />);
    expect(screen.getByText('details')).toBeInTheDocument();
  });

  it('has zero axe violations', async () => {
    const { container } = render(<Basic onSort={() => undefined} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
