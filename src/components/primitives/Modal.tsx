// SPDX-License-Identifier: MIT

// Modal primitive built on @radix-ui/react-dialog. Backdrop, ESC-close,
// focus trap, subtle shadow lift (the SPEC §16.2 carve-out from the
// "borders, not shadows" rule). Title is required for accessibility;
// description is optional.

import * as RadixDialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

const overlayClasses = 'fixed inset-0 z-40 bg-black/50';

const contentClasses =
  'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 ' +
  'rounded border border-border bg-bg-elevated p-5 shadow-lg ' +
  'focus:outline-none';

const closeClasses =
  'absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded ' +
  'text-text-tertiary hover:bg-bg-surface-hover hover:text-text-primary ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent';

export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
}: ModalProps): React.JSX.Element => (
  <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={overlayClasses} />
      <RadixDialog.Content className={clsx(contentClasses, className)}>
        <RadixDialog.Title className="text-base font-semibold text-text-primary">
          {title}
        </RadixDialog.Title>
        {description !== undefined ? (
          <RadixDialog.Description className="mt-1 text-xs text-text-secondary">
            {description}
          </RadixDialog.Description>
        ) : (
          <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
        )}
        <div className="mt-4">{children}</div>
        <RadixDialog.Close className={closeClasses} aria-label="Close dialog">
          <X className="h-4 w-4" aria-hidden="true" />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  </RadixDialog.Root>
);
