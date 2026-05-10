// SPDX-License-Identifier: MIT

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import type { ComboboxOption } from './Combobox';
import { Combobox } from './Combobox';

const FRUITS: readonly ComboboxOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'blueberry', label: 'Blueberry' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
];

const Stateful = ({
  defaultValue,
  onValueChange,
}: {
  defaultValue?: string;
  onValueChange?: (v: string) => void;
}): React.JSX.Element => {
  const [value, setValue] = useState<string | undefined>(defaultValue);
  const props = {
    options: FRUITS,
    onValueChange: (v: string) => {
      setValue(v);
      onValueChange?.(v);
    },
    placeholder: 'Pick a fruit',
    'aria-label': 'Fruit',
    ...(value !== undefined ? { value } : {}),
  };
  return <Combobox {...props} />;
};

describe('Combobox', () => {
  it('renders the trigger with a placeholder when no value', () => {
    render(<Stateful />);
    expect(screen.getByRole('button', { name: 'Fruit' })).toBeInTheDocument();
    expect(screen.getByText('Pick a fruit')).toBeInTheDocument();
  });

  it('shows the selected option label on the trigger when value is set', () => {
    render(<Stateful defaultValue="banana" />);
    expect(screen.getByRole('button', { name: 'Fruit' })).toHaveTextContent('Banana');
  });

  it('opens on click and shows all options', async () => {
    render(<Stateful />);
    await userEvent.click(screen.getByRole('button', { name: 'Fruit' }));
    expect(await screen.findByRole('option', { name: 'Apple' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(FRUITS.length);
  });

  it('filters internally on label (case-insensitive)', async () => {
    render(<Stateful />);
    await userEvent.click(screen.getByRole('button', { name: 'Fruit' }));
    const search = await screen.findByLabelText('Fruit search');
    await userEvent.type(search, 'be');
    // Both 'Blueberry' and 'Date' miss; 'Banana' / 'Blueberry' both
    // contain 'b', and the 'be' substring matches Blueberry only.
    await waitFor(() => {
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Blueberry']);
    });
  });

  it('shows the empty text when no options match', async () => {
    render(<Stateful />);
    await userEvent.click(screen.getByRole('button', { name: 'Fruit' }));
    const search = await screen.findByLabelText('Fruit search');
    await userEvent.type(search, 'xyz');
    expect(await screen.findByText('No matches.')).toBeInTheDocument();
  });

  it('selects an option on click and fires onValueChange', async () => {
    const onChange = vi.fn();
    render(<Stateful onValueChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fruit' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Cherry' }));
    expect(onChange).toHaveBeenCalledWith('cherry');
  });

  it('Enter selects the active option', async () => {
    const onChange = vi.fn();
    render(<Stateful onValueChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fruit' }));
    await screen.findByRole('option', { name: 'Apple' });
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('banana');
  });

  it('arrow keys cycle the highlight (wrap at the ends)', async () => {
    render(<Stateful />);
    await userEvent.click(screen.getByRole('button', { name: 'Fruit' }));
    await screen.findByRole('option', { name: 'Apple' });
    // Arrow up from index 0 wraps to last.
    await userEvent.keyboard('{ArrowUp}');
    const last = screen.getAllByRole('option').at(-1);
    expect(last).toHaveAttribute('data-active', 'true');
  });

  it('controlled query: defers filtering to the caller', async () => {
    const onQueryChange = vi.fn();
    const ControlledQuery = (): React.JSX.Element => {
      const [q, setQ] = useState('');
      return (
        <Combobox
          options={FRUITS.filter((o) => o.label.toLowerCase().startsWith(q.toLowerCase()))}
          query={q}
          onQueryChange={(next) => {
            setQ(next);
            onQueryChange(next);
          }}
          aria-label="Fruit"
          placeholder="Pick"
        />
      );
    };
    render(<ControlledQuery />);
    await userEvent.click(screen.getByRole('button', { name: 'Fruit' }));
    await userEvent.type(await screen.findByLabelText('Fruit search'), 'a');
    expect(onQueryChange).toHaveBeenCalledWith('a');
    // 'a' as startsWith filter: only 'Apple'.
    await waitFor(() => {
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Apple']);
    });
  });

  it('disabled trigger is not focusable / clickable', async () => {
    render(<Combobox options={FRUITS} disabled placeholder="Pick" aria-label="Fruit" />);
    const trigger = screen.getByRole('button', { name: 'Fruit' });
    expect(trigger).toBeDisabled();
    await userEvent.click(trigger);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('has zero axe violations on the closed trigger', async () => {
    const { container } = render(<Stateful defaultValue="apple" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
