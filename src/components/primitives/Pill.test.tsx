// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import type { QualityGateStatus } from '../../types/sonar';
import { Pill } from './Pill';

const STATUSES: readonly QualityGateStatus[] = ['OK', 'WARN', 'ERROR', 'NONE'];

describe('Pill', () => {
  it.each([
    ['OK', 'Passing'],
    ['WARN', 'Warning'],
    ['ERROR', 'Failing'],
    ['NONE', 'No gate'],
  ] as const)('renders the default label for %s as %s', (status, label) => {
    render(<Pill status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders custom children when provided', () => {
    render(<Pill status="OK">Quality Gate Pass</Pill>);
    expect(screen.getByText('Quality Gate Pass')).toBeInTheDocument();
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Pill status="OK" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('merges caller className', () => {
    render(<Pill status="OK" className="extra-cls" />);
    expect(screen.getByText('Passing').className).toContain('extra-cls');
  });

  it.each(STATUSES)('has zero axe violations (%s)', async (status) => {
    const { container } = render(<Pill status={status} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
