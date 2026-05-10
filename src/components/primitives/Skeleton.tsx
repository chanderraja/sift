// SPDX-License-Identifier: MIT

// Skeleton primitive — subtle pulse, no shimmer per SPEC §16.5.
// Decorative; aria-hidden so screen readers don't announce it.

import clsx from 'clsx';
import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';

export const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Skeleton({ className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={clsx('animate-pulse rounded-sm bg-bg-surface-hover', className)}
        {...rest}
      />
    );
  },
);
