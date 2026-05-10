// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { Modal } from './Modal';

const Stateful = ({
  initialOpen = true,
  onOpenChange,
  description,
}: {
  initialOpen?: boolean;
  onOpenChange?: (o: boolean) => void;
  description?: string;
}): React.JSX.Element => {
  const [open, setOpen] = useState(initialOpen);
  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        onOpenChange?.(o);
      }}
      title="Export"
      {...(description !== undefined ? { description } : {})}
    >
      <p>body content</p>
    </Modal>
  );
};

describe('Modal', () => {
  it('renders title, description, and body when open', () => {
    render(<Stateful description="Choose format" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Choose format')).toBeInTheDocument();
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  it('exposes a close button', () => {
    render(<Stateful />);
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const onChange = vi.fn();
    render(<Stateful onOpenChange={onChange} />);
    await userEvent.keyboard('{Escape}');
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('closes when the close button is clicked', async () => {
    const onChange = vi.fn();
    render(<Stateful onOpenChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('renders nothing when open is false', () => {
    render(<Stateful initialOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has zero axe violations', async () => {
    const { container } = render(<Stateful description="d" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
