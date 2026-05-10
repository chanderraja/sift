// SPDX-License-Identifier: MIT

// Badge primitive per SPEC §16.5.
//
// Single Badge with a `tone` prop drawn from the design tokens, plus
// three thin convenience wrappers (`SeverityBadge`, `TypeBadge`,
// `StatusBadge`) that map a domain enum value to the right tone and
// supply the label. Per SPEC §16.9 the label is always present —
// color alone never carries the meaning.

import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

import type { IssueType, Severity, Status } from '../../types/sonar';

export type BadgeTone =
  | 'severity-blocker'
  | 'severity-critical'
  | 'severity-major'
  | 'severity-minor'
  | 'severity-info'
  | 'type-bug'
  | 'type-vulnerability'
  | 'type-code-smell'
  | 'status-open'
  | 'status-confirmed'
  | 'status-reopened'
  | 'status-resolved'
  | 'status-closed'
  | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  'severity-blocker': 'border-severity-blocker/40 text-severity-blocker',
  'severity-critical': 'border-severity-critical/40 text-severity-critical',
  'severity-major': 'border-severity-major/40 text-severity-major',
  'severity-minor': 'border-severity-minor/40 text-severity-minor',
  'severity-info': 'border-severity-info/40 text-severity-info',
  'type-bug': 'border-severity-blocker/40 text-severity-blocker',
  'type-vulnerability': 'border-severity-critical/40 text-severity-critical',
  'type-code-smell': 'border-text-tertiary text-text-secondary',
  'status-open': 'border-severity-info/40 text-severity-info',
  'status-confirmed': 'border-severity-blocker/40 text-severity-blocker',
  'status-reopened': 'border-severity-major/40 text-severity-major',
  'status-resolved': 'border-qg-pass/40 text-qg-pass',
  'status-closed': 'border-text-tertiary text-text-secondary',
  neutral: 'border-border-subtle text-text-secondary',
};

const baseClasses =
  'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-2xs font-medium ' +
  'uppercase tracking-wide bg-transparent';

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = 'neutral', className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={clsx(baseClasses, TONE_CLASSES[tone], className)} {...rest}>
      {children}
    </span>
  );
});

// Domain → tone mappings.

const SEVERITY_TONE: Record<Severity, BadgeTone> = {
  BLOCKER: 'severity-blocker',
  CRITICAL: 'severity-critical',
  MAJOR: 'severity-major',
  MINOR: 'severity-minor',
  INFO: 'severity-info',
};

const TYPE_TONE: Record<IssueType, BadgeTone> = {
  BUG: 'type-bug',
  VULNERABILITY: 'type-vulnerability',
  CODE_SMELL: 'type-code-smell',
};

const STATUS_TONE: Record<Status, BadgeTone> = {
  OPEN: 'status-open',
  CONFIRMED: 'status-confirmed',
  REOPENED: 'status-reopened',
  RESOLVED: 'status-resolved',
  CLOSED: 'status-closed',
};

export const SeverityBadge = ({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}): React.JSX.Element => (
  <Badge tone={SEVERITY_TONE[severity]} className={className}>
    {severity}
  </Badge>
);

export const TypeBadge = ({
  type,
  className,
}: {
  type: IssueType;
  className?: string;
}): React.JSX.Element => (
  <Badge tone={TYPE_TONE[type]} className={className}>
    {type.replace('_', ' ')}
  </Badge>
);

export const StatusBadge = ({
  status,
  className,
}: {
  status: Status;
  className?: string;
}): React.JSX.Element => (
  <Badge tone={STATUS_TONE[status]} className={className}>
    {status}
  </Badge>
);
