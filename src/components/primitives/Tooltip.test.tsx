// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('renders the trigger', () => {
    render(
      <Tooltip content="info">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'trigger' })).toBeInTheDocument();
  });

  it('shows the tooltip on focus (delayDuration 0 to keep the test fast)', async () => {
    render(
      <Tooltip content="hello" delayDuration={0}>
        <button type="button">trigger</button>
      </Tooltip>,
    );
    await userEvent.tab();
    // Radix renders both the visible bubble and a screen-reader-only
    // copy of the content; assert at least one is rendered.
    const matches = await screen.findAllByText('hello');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('has zero axe violations on the closed tooltip', async () => {
    const { container } = render(
      <Tooltip content="info">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
