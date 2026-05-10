// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { IssuesTab } from './IssuesTab';

describe('IssuesTab — scaffold', () => {
  it('renders the two-column layout with sidebar + results slots', () => {
    render(<IssuesTab />);
    expect(screen.getByTestId('issues-tab')).toBeInTheDocument();
    expect(screen.getByTestId('issues-filter-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('issues-results')).toBeInTheDocument();
  });

  it('uses a sidebar landmark for the filter column', () => {
    render(<IssuesTab />);
    expect(screen.getByRole('complementary', { name: 'Issue filters' })).toBeInTheDocument();
  });

  it('has zero axe violations', async () => {
    const { container } = render(<IssuesTab />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
