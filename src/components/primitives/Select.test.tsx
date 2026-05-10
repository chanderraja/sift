// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { Select, SelectItem } from './Select';

const Three = ({
  defaultValue,
  onValueChange,
}: {
  defaultValue?: string;
  onValueChange?: (v: string) => void;
}): React.JSX.Element => {
  const [value, setValue] = useState<string | undefined>(defaultValue);
  const props = {
    onValueChange: (v: string) => {
      setValue(v);
      onValueChange?.(v);
    },
    placeholder: 'Pick one',
    'aria-label': 'Choices',
    ...(value === undefined ? {} : { value }),
  };
  return (
    <Select {...props}>
      <SelectItem value="a">Apple</SelectItem>
      <SelectItem value="b">Banana</SelectItem>
      <SelectItem value="c">Cherry</SelectItem>
    </Select>
  );
};

describe('Select', () => {
  it('renders the trigger with a placeholder', () => {
    render(<Three />);
    expect(screen.getByRole('combobox', { name: 'Choices' })).toBeInTheDocument();
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('shows the selected value when defaultValue is set', () => {
    render(<Three defaultValue="b" />);
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('opens the listbox on click and selects an option', async () => {
    const onChange = vi.fn();
    render(<Three onValueChange={onChange} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Choices' }));
    // Radix portals the items; query by role.
    await userEvent.click(await screen.findByRole('option', { name: 'Cherry' }));
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('opens via Enter when the trigger has focus', async () => {
    render(<Three />);
    const trigger = screen.getByRole('combobox', { name: 'Choices' });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('option', { name: 'Apple' })).toBeInTheDocument();
  });

  it('has zero axe violations on the closed trigger', async () => {
    const { container } = render(<Three defaultValue="a" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
