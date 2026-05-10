// SPDX-License-Identifier: MIT

// Pill primitive — like Badge but larger, used specifically for the
// quality-gate status indicator at the top of the QG tab. Per SPEC
// §16.5, four states (OK / WARN / ERROR / NONE) drawn from the qg-*
// design tokens. Like Badge, the label carries the meaning so colour
// is only a secondary cue.

import clsx from 'clsx';
import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';

import type { QualityGateStatus } from '../../types/sonar';

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  status: QualityGateStatus;
}

const STATUS_CLASSES: Record<QualityGateStatus, string> = {
  OK: 'bg-qg-pass/15 text-qg-pass border-qg-pass/40',
  WARN: 'bg-qg-warn/15 text-qg-warn border-qg-warn/40',
  ERROR: 'bg-qg-fail/15 text-qg-fail border-qg-fail/40',
  NONE: 'bg-bg-surface-hover text-text-secondary border-border-subtle',
};

const STATUS_LABEL: Record<QualityGateStatus, string> = {
  OK: 'Passing',
  WARN: 'Warning',
  ERROR: 'Failing',
  NONE: 'No gate',
};

const baseClasses =
  'inline-flex items-center rounded border px-3 py-1 text-sm font-semibold ' +
  'uppercase tracking-wide';

export const Pill = forwardRef<HTMLSpanElement, PillProps>(function Pill(
  { status, className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={clsx(baseClasses, STATUS_CLASSES[status], className)} {...rest}>
      {children ?? STATUS_LABEL[status]}
    </span>
  );
});
