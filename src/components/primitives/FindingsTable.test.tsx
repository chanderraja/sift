// SPDX-License-Identifier: MIT

import type { ColumnDef } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FindingsTable } from './FindingsTable';
import type { SortDirective } from '../../stores/filtersStore';

interface Row {
  key: string;
  label: string;
  rank: number;
}

const COLS: ColumnDef<Row>[] = [
  {
    accessorKey: 'label',
    header: 'Label',
    cell: ({ row }) => <span>{row.original.label}</span>,
    enableSorting: true,
  },
  {
    accessorKey: 'rank',
    header: 'Rank',
    cell: ({ row }) => <span>{String(row.original.rank)}</span>,
    enableSorting: true,
  },
];

const noop = (): void => {
  /* test no-op */
};

const ROWS: Row[] = [
  { key: 'a', label: 'Alpha', rank: 2 },
  { key: 'b', label: 'Bravo', rank: 1 },
];

describe('FindingsTable — primitive', () => {
  it('renders one row per item plus the header', () => {
    render(
      <FindingsTable
        items={ROWS}
        columns={COLS}
        getRowKey={(r) => r.key}
        renderExpandPanel={() => null}
        sort={[]}
        onSortChange={noop}
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('clicking a sortable header calls onSortChange with the new directive', async () => {
    const onSortChange = vi.fn<(sort: readonly SortDirective[]) => void>();
    render(
      <FindingsTable
        items={ROWS}
        columns={COLS}
        getRowKey={(r) => r.key}
        renderExpandPanel={() => null}
        sort={[]}
        onSortChange={onSortChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Label/ }));
    expect(onSortChange).toHaveBeenCalledWith([{ column: 'label', direction: 'asc' }]);
  });

  it('reflects an externally-set sort on the header indicator', () => {
    render(
      <FindingsTable
        items={ROWS}
        columns={COLS}
        getRowKey={(r) => r.key}
        renderExpandPanel={() => null}
        sort={[{ column: 'rank', direction: 'desc' }]}
        onSortChange={noop}
      />,
    );
    expect(
      screen.getAllByRole('columnheader').find((h) => h.textContent?.includes('Rank')),
    ).toHaveAttribute('aria-sort', 'descending');
  });

  it('clicking a row expands the panel returned by renderExpandPanel', async () => {
    render(
      <FindingsTable
        items={ROWS}
        columns={COLS}
        getRowKey={(r) => r.key}
        renderExpandPanel={(r) => <div data-testid="panel">{r.label} panel</div>}
        sort={[]}
        onSortChange={noop}
      />,
    );
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Alpha'));
    expect(screen.getByTestId('panel').textContent).toBe('Alpha panel');
  });

  it('clicking a different row swaps the expanded panel to it', async () => {
    render(
      <FindingsTable
        items={ROWS}
        columns={COLS}
        getRowKey={(r) => r.key}
        renderExpandPanel={(r) => <div data-testid="panel">{r.label} panel</div>}
        sort={[]}
        onSortChange={noop}
      />,
    );
    await userEvent.click(screen.getByText('Alpha'));
    expect(screen.getByTestId('panel').textContent).toBe('Alpha panel');
    await userEvent.click(screen.getByText('Bravo'));
    expect(screen.getByTestId('panel').textContent).toBe('Bravo panel');
  });

  it('does not attach a row click handler when renderExpandPanel returns null', async () => {
    const onSortChange = vi.fn<(sort: readonly SortDirective[]) => void>();
    render(
      <FindingsTable
        items={ROWS}
        columns={COLS}
        getRowKey={(r) => r.key}
        renderExpandPanel={() => null}
        sort={[]}
        onSortChange={onSortChange}
      />,
    );
    // Clicking a body cell should not throw and should not create a panel.
    await userEvent.click(screen.getByText('Alpha'));
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
  });
});
