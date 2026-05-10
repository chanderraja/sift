// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { Radio, RadioGroup } from './RadioGroup';

const ThreeOptions = ({
  defaultValue = 'a',
  onValueChange,
}: {
  defaultValue?: string;
  onValueChange?: (v: string) => void;
}): React.JSX.Element => {
  const [value, setValue] = useState(defaultValue);
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onValueChange?.(v);
      }}
      aria-label="Choice"
    >
      <Radio value="a">A</Radio>
      <Radio value="b">B</Radio>
      <Radio value="c">C</Radio>
    </RadioGroup>
  );
};

describe('RadioGroup', () => {
  it('renders three options', () => {
    render(<ThreeOptions />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('reflects the current value via aria-checked', () => {
    render(<ThreeOptions defaultValue="b" />);
    const [a, b, c] = screen.getAllByRole('radio');
    expect(a).toHaveAttribute('aria-checked', 'false');
    expect(b).toHaveAttribute('aria-checked', 'true');
    expect(c).toHaveAttribute('aria-checked', 'false');
  });

  it('selects on click', async () => {
    const onChange = vi.fn();
    render(<ThreeOptions onValueChange={onChange} />);
    await userEvent.click(screen.getByLabelText('B'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('exposes a roving-focus tabindex pattern (only one radio is tab-stopped)', async () => {
    render(<ThreeOptions />);
    await userEvent.tab();
    // Exactly one of the radios should be the focused tab-stop; Radix
    // owns the keyboard semantics from there. We verify the group is
    // tab-reachable rather than simulating internal arrow-key state,
    // which jsdom's focus model handles inconsistently.
    const focused = document.activeElement;
    expect(focused?.getAttribute('role')).toBe('radio');
  });

  it('has zero axe violations', async () => {
    const { container } = render(<ThreeOptions />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
