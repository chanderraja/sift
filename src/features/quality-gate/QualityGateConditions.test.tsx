// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { QualityGate } from '../../types/sonar';

import { QualityGateConditions } from './QualityGateConditions';

type Condition = QualityGate['projectStatus']['conditions'][number];

const COND = (overrides: Partial<Condition> = {}): Condition => ({
  status: 'OK',
  metricKey: 'new_reliability_rating',
  comparator: 'GT',
  errorThreshold: '1',
  actualValue: '1',
  ...overrides,
});

describe('QualityGateConditions', () => {
  it('renders the empty-conditions copy when the list is empty', () => {
    render(<QualityGateConditions conditions={[]} />);
    expect(screen.getByText(/no conditions/i)).toBeInTheDocument();
  });

  it('renders one row per condition with humanized metric label', () => {
    render(<QualityGateConditions conditions={[COND()]} />);
    expect(screen.getByText('New reliability rating')).toBeInTheDocument();
  });

  it('formats rating thresholds and actuals as A..E letters', () => {
    render(
      <QualityGateConditions
        conditions={[
          COND({ metricKey: 'new_security_rating', errorThreshold: '1', actualValue: '2' }),
        ]}
      />,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('formats percentage thresholds with a % suffix', () => {
    render(
      <QualityGateConditions
        conditions={[
          COND({
            metricKey: 'new_duplicated_lines_density',
            errorThreshold: '3',
            actualValue: '0.0',
          }),
        ]}
      />,
    );
    expect(screen.getByText('3%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders the comparator symbol', () => {
    render(
      <QualityGateConditions
        conditions={[COND({ comparator: 'GT' }), COND({ metricKey: 'coverage', comparator: 'LT' })]}
      />,
    );
    expect(screen.getByText('>')).toBeInTheDocument();
    expect(screen.getByText('<')).toBeInTheDocument();
  });

  it('renders pass / warn / fail status labels', () => {
    render(
      <QualityGateConditions
        conditions={[
          COND({ status: 'OK', metricKey: 'a_rating' }),
          COND({ status: 'WARN', metricKey: 'b_rating' }),
          COND({ status: 'ERROR', metricKey: 'c_rating' }),
        ]}
      />,
    );
    expect(screen.getByText('Pass')).toBeInTheDocument();
    expect(screen.getByText('Warn')).toBeInTheDocument();
    expect(screen.getByText('Fail')).toBeInTheDocument();
  });
});
