// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useFiltersStore, usePrefsStore } from '../../app/stores';

import { IssuesPagination } from './IssuesPagination';

const reset = (): void => {
  useFiltersStore.getState().reset();
  usePrefsStore.getState().setDefaultPageSize(100);
};

beforeEach(reset);
afterEach(reset);

describe('IssuesPagination', () => {
  it('renders Previous and Next buttons', () => {
    render(<IssuesPagination total={250} />);
    expect(screen.getByRole('button', { name: /Previous/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/ })).toBeInTheDocument();
  });

  it('disables Previous on page 1', () => {
    render(<IssuesPagination total={250} />);
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
  });

  it('disables Next on the last page', () => {
    useFiltersStore.setState({ page: 3 }); // 250 / 100 = 3 pages
    render(<IssuesPagination total={250} />);
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
  });

  it('clicking Next advances filtersStore.page', async () => {
    render(<IssuesPagination total={250} />);
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(useFiltersStore.getState().page).toBe(2);
  });

  it('clicking Previous decrements filtersStore.page', async () => {
    useFiltersStore.setState({ page: 2 });
    render(<IssuesPagination total={250} />);
    await userEvent.click(screen.getByRole('button', { name: /Previous/ }));
    expect(useFiltersStore.getState().page).toBe(1);
  });

  it('renders current page and total page count', () => {
    useFiltersStore.setState({ page: 2 });
    render(<IssuesPagination total={250} />);
    expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
  });

  it('renders the page size selector with documented options', async () => {
    render(<IssuesPagination total={250} />);
    await userEvent.click(screen.getByRole('combobox', { name: /Page size/ }));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['50', '100', '200', '500']);
  });

  it('changing page size writes both filtersStore and prefsStore', async () => {
    render(<IssuesPagination total={250} />);
    await userEvent.click(screen.getByRole('combobox', { name: /Page size/ }));
    await userEvent.click(await screen.findByRole('option', { name: '200' }));
    expect(useFiltersStore.getState().pageSize).toBe(200);
    expect(usePrefsStore.getState().defaultPageSize).toBe(200);
  });

  it('changing page size resets page to 1', async () => {
    useFiltersStore.setState({ page: 2 });
    render(<IssuesPagination total={250} />);
    await userEvent.click(screen.getByRole('combobox', { name: /Page size/ }));
    await userEvent.click(await screen.findByRole('option', { name: '50' }));
    expect(useFiltersStore.getState().page).toBe(1);
  });

  it('hides pagination entirely when total fits on a single page', () => {
    render(<IssuesPagination total={50} />);
    expect(screen.queryByRole('button', { name: /Previous/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Next/ })).not.toBeInTheDocument();
    // page size selector remains so the user can switch
    expect(screen.getByRole('combobox', { name: /Page size/ })).toBeInTheDocument();
  });
});
