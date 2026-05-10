// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders with a label', () => {
    render(<Checkbox>Include resolved</Checkbox>);
    expect(screen.getByLabelText('Include resolved')).toBeInTheDocument();
  });

  it('toggles via click', async () => {
    function Stateful(): React.JSX.Element {
      const [checked, setChecked] = useState(false);
      return (
        <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)}>
          x
        </Checkbox>
      );
    }
    render(<Stateful />);
    const cb = screen.getByRole('checkbox');
    expect(cb).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(cb);
    expect(cb).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles via Space when focused', async () => {
    const onChange = vi.fn();
    render(
      <Checkbox checked={false} onCheckedChange={onChange}>
        x
      </Checkbox>,
    );
    const cb = screen.getByRole('checkbox');
    cb.focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders the indeterminate indicator when checked is indeterminate', () => {
    render(<Checkbox checked="indeterminate">x</Checkbox>);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed');
  });

  it('disabled state blocks user clicks', async () => {
    const onChange = vi.fn();
    render(
      <Checkbox disabled onCheckedChange={onChange}>
        x
      </Checkbox>,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has zero axe violations', async () => {
    const { container } = render(<Checkbox>Include resolved</Checkbox>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
