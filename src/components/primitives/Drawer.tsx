// SPDX-License-Identifier: MIT

// Drawer primitive — same @radix-ui/react-dialog backbone as Modal,
// rendered as a side panel that slides in from the right per SPEC
// §16.5. Used by the Settings panel (Phase 11) and the row-detail
// drawer in the Issues table (Phase 8).

import * as RadixDialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

const overlayClasses = 'fixed inset-0 z-40 bg-bg-base/80';

const contentClasses =
  'fixed right-0 top-0 z-50 h-full w-full max-w-md ' +
  'border-l border-border bg-bg-elevated p-5 shadow-lg ' +
  'focus:outline-none';

const closeClasses =
  'absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded ' +
  'text-text-tertiary hover:bg-bg-surface-hover hover:text-text-primary ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent';

export const Drawer = ({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
}: DrawerProps): React.JSX.Element => (
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
        <RadixDialog.Close className={closeClasses} aria-label="Close drawer">
          <X className="h-4 w-4" aria-hidden="true" />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  </RadixDialog.Root>
);
