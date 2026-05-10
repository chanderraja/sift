// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('renders with a label', () => {
    render(<Toggle>Dark mode</Toggle>);
    expect(screen.getByLabelText('Dark mode')).toBeInTheDocument();
  });

  it('toggles via click', async () => {
    function Stateful(): React.JSX.Element {
      const [on, setOn] = useState(false);
      return (
        <Toggle checked={on} onCheckedChange={setOn}>
          x
        </Toggle>
      );
    }
    render(<Stateful />);
    const sw = screen.getByRole('switch');
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles via Space when focused', async () => {
    const onChange = vi.fn();
    render(
      <Toggle checked={false} onCheckedChange={onChange}>
        x
      </Toggle>,
    );
    const sw = screen.getByRole('switch');
    sw.focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('disabled state blocks user clicks', async () => {
    const onChange = vi.fn();
    render(
      <Toggle disabled onCheckedChange={onChange}>
        x
      </Toggle>,
    );
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has zero axe violations', async () => {
    const { container } = render(<Toggle>Dark mode</Toggle>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
