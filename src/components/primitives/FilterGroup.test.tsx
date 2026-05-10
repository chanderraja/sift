// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { FilterGroup } from './FilterGroup';

describe('FilterGroup', () => {
  it('renders title, count, and children', () => {
    render(
      <FilterGroup title="Severity" count={5}>
        <span>severity options</span>
      </FilterGroup>,
    );
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('severity options')).toBeInTheDocument();
  });

  it('omits count when not provided', () => {
    render(
      <FilterGroup title="Type">
        <span>x</span>
      </FilterGroup>,
    );
    expect(screen.getByText('Type')).toBeInTheDocument();
  });

  it('starts open by default', () => {
    render(
      <FilterGroup title="Severity">
        <span data-testid="content">x</span>
      </FilterGroup>,
    );
    // The content is rendered inside a <details open>, so it's in the DOM.
    const details = screen.getByText('Severity').closest('details');
    expect(details).toHaveAttribute('open');
  });

  it('toggles via click on the summary', async () => {
    render(
      <FilterGroup title="Severity" defaultOpen={false}>
        <span>x</span>
      </FilterGroup>,
    );
    const summary = screen.getByText('Severity').closest('summary');
    expect(summary).toBeInTheDocument();
    if (summary) await userEvent.click(summary);
    const details = screen.getByText('Severity').closest('details');
    expect(details).toHaveAttribute('open');
  });

  it('has zero axe violations', async () => {
    const { container } = render(
      <FilterGroup title="Severity" count={3}>
        <span>x</span>
      </FilterGroup>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
