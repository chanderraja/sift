// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import type { IssueType, Severity, Status } from '../../types/sonar';
import { Badge, SeverityBadge, StatusBadge, TypeBadge } from './Badge';

const SEVERITIES: readonly Severity[] = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'];
const TYPES: readonly IssueType[] = ['BUG', 'VULNERABILITY', 'CODE_SMELL'];
const STATUSES: readonly Status[] = ['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED'];

describe('Badge', () => {
  it('renders children with the neutral tone by default', () => {
    render(<Badge>label</Badge>);
    expect(screen.getByText('label')).toBeInTheDocument();
  });

  it('forwards ref to the underlying <span>', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>x</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('merges caller className', () => {
    render(<Badge className="extra-cls">x</Badge>);
    expect(screen.getByText('x').className).toContain('extra-cls');
  });

  it('has zero axe violations', async () => {
    const { container } = render(<Badge tone="severity-blocker">Blocker</Badge>);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('SeverityBadge', () => {
  it.each(SEVERITIES)('renders the severity label and a tone for %s', (severity) => {
    render(<SeverityBadge severity={severity} />);
    expect(screen.getByText(severity)).toBeInTheDocument();
  });

  it('label is the severity text — color alone does not carry meaning (SPEC §16.9)', () => {
    render(<SeverityBadge severity="BLOCKER" />);
    // The text node is present and reads as 'BLOCKER' — a screen reader
    // would announce it regardless of the visual color.
    expect(screen.getByText('BLOCKER')).toBeVisible();
  });
});

describe('TypeBadge', () => {
  it.each(TYPES)('renders the type label for %s', (type) => {
    render(<TypeBadge type={type} />);
    // CODE_SMELL becomes 'CODE SMELL' for human reading.
    const expected = type.replace('_', ' ');
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});

describe('StatusBadge', () => {
  it.each(STATUSES)('renders the status label for %s', (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(status)).toBeInTheDocument();
  });
});
