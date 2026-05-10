// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { Drawer } from './Drawer';

const Stateful = ({
  initialOpen = true,
  onOpenChange,
}: {
  initialOpen?: boolean;
  onOpenChange?: (o: boolean) => void;
}): React.JSX.Element => {
  const [open, setOpen] = useState(initialOpen);
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        onOpenChange?.(o);
      }}
      title="Settings"
    >
      <p>drawer body</p>
    </Drawer>
  );
};

describe('Drawer', () => {
  it('renders title and body when open', () => {
    render(<Stateful />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Title appears as a heading; the same text also occurs in the
    // sr-only Description fallback, so query by role rather than text.
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('drawer body')).toBeInTheDocument();
  });

  it('exposes a close button', () => {
    render(<Stateful />);
    expect(screen.getByRole('button', { name: 'Close drawer' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const onChange = vi.fn();
    render(<Stateful onOpenChange={onChange} />);
    await userEvent.keyboard('{Escape}');
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('renders nothing when closed', () => {
    render(<Stateful initialOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has zero axe violations', async () => {
    const { container } = render(<Stateful />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
