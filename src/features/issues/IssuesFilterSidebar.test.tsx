// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useFiltersStore } from '../../app/stores';

import { IssuesFilterSidebar } from './IssuesFilterSidebar';

const reset = (): void => {
  useFiltersStore.getState().reset();
};

beforeEach(reset);
afterEach(reset);

describe('IssuesFilterSidebar', () => {
  it('renders severity, type, and status groups', () => {
    render(<IssuesFilterSidebar />);
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders one checkbox per severity level', () => {
    render(<IssuesFilterSidebar />);
    for (const level of ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO']) {
      expect(screen.getByLabelText(level)).toBeInTheDocument();
    }
  });

  it('renders one checkbox per issue type', () => {
    render(<IssuesFilterSidebar />);
    for (const type of ['BUG', 'VULNERABILITY', 'CODE_SMELL']) {
      expect(screen.getByLabelText(type)).toBeInTheDocument();
    }
  });

  it('renders one checkbox per status', () => {
    render(<IssuesFilterSidebar />);
    for (const status of ['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED']) {
      expect(screen.getByLabelText(status)).toBeInTheDocument();
    }
  });

  it('checking a severity writes filtersStore.issuesFilters.severities', async () => {
    render(<IssuesFilterSidebar />);
    await userEvent.click(screen.getByLabelText('BLOCKER'));
    expect(useFiltersStore.getState().issuesFilters.severities).toEqual(['BLOCKER']);
  });

  it('toggling a checked severity removes it', async () => {
    useFiltersStore.getState().patchIssues({ severities: ['BLOCKER', 'CRITICAL'] });
    render(<IssuesFilterSidebar />);
    await userEvent.click(screen.getByLabelText('BLOCKER'));
    expect(useFiltersStore.getState().issuesFilters.severities).toEqual(['CRITICAL']);
  });

  it('reflects the current store state as the checked state', () => {
    useFiltersStore.getState().patchIssues({ statuses: ['OPEN', 'CONFIRMED'] });
    render(<IssuesFilterSidebar />);
    expect(screen.getByLabelText('OPEN')).toHaveAttribute('data-state', 'checked');
    expect(screen.getByLabelText('CONFIRMED')).toHaveAttribute('data-state', 'checked');
    expect(screen.getByLabelText('RESOLVED')).toHaveAttribute('data-state', 'unchecked');
  });

  it('checking a type writes filtersStore.issuesFilters.types', async () => {
    render(<IssuesFilterSidebar />);
    await userEvent.click(screen.getByLabelText('BUG'));
    expect(useFiltersStore.getState().issuesFilters.types).toEqual(['BUG']);
  });

  it('mutating a filter resets page to 1', async () => {
    useFiltersStore.setState({ page: 4 });
    render(<IssuesFilterSidebar />);
    await userEvent.click(screen.getByLabelText('MAJOR'));
    expect(useFiltersStore.getState().page).toBe(1);
  });

  it('shows severity count next to the option when issueCounts.severities is provided', () => {
    render(<IssuesFilterSidebar issueCounts={{ severities: { BLOCKER: 5, CRITICAL: 12 } }} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows type count next to the option when issueCounts.types is provided', () => {
    render(<IssuesFilterSidebar issueCounts={{ types: { BUG: 8, CODE_SMELL: 3 } }} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows status count next to the option when issueCounts.statuses is provided', () => {
    render(<IssuesFilterSidebar issueCounts={{ statuses: { OPEN: 97 } }} />);
    expect(screen.getByText('97')).toBeInTheDocument();
  });

  it('severity checkboxes remain accessible by label name when counts are rendered', async () => {
    render(<IssuesFilterSidebar issueCounts={{ severities: { BLOCKER: 5 } }} />);
    await userEvent.click(screen.getByLabelText('BLOCKER'));
    expect(useFiltersStore.getState().issuesFilters.severities).toEqual(['BLOCKER']);
  });
});
