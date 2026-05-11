// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Measure } from '../../types/sonar';

import { QG_DEFAULT_MEASURES, QualityGateMeasures } from './QualityGateMeasures';

describe('QualityGateMeasures', () => {
  it('renders one card per configured measure', () => {
    render(<QualityGateMeasures measures={[]} />);
    for (const d of QG_DEFAULT_MEASURES) {
      expect(screen.getByTestId(`qg-measure-${d.key}`)).toBeInTheDocument();
    }
  });

  it('renders the human-friendly label per measure', () => {
    render(<QualityGateMeasures measures={[]} />);
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('Duplication')).toBeInTheDocument();
    expect(screen.getByText('Lines of code')).toBeInTheDocument();
    expect(screen.getByText('Technical debt')).toBeInTheDocument();
    expect(screen.getByText('Complexity')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Reliability')).toBeInTheDocument();
    expect(screen.getByText('Maintainability')).toBeInTheDocument();
  });

  it('formats ratings as letters', () => {
    const measures: Measure[] = [{ metric: 'security_rating', value: '2.0' }];
    render(<QualityGateMeasures measures={measures} />);
    const card = screen.getByTestId('qg-measure-security_rating');
    expect(card).toHaveTextContent('B');
  });

  it('formats percentages with a % suffix', () => {
    const measures: Measure[] = [{ metric: 'coverage', value: '73.5' }];
    render(<QualityGateMeasures measures={measures} />);
    const card = screen.getByTestId('qg-measure-coverage');
    expect(card).toHaveTextContent('73.5%');
  });

  it('formats ncloc with a compact suffix', () => {
    const measures: Measure[] = [{ metric: 'ncloc', value: '4849' }];
    render(<QualityGateMeasures measures={measures} />);
    const card = screen.getByTestId('qg-measure-ncloc');
    expect(card).toHaveTextContent('4.8k');
  });

  it('formats technical debt as a duration', () => {
    const measures: Measure[] = [{ metric: 'sqale_index', value: '125' }];
    render(<QualityGateMeasures measures={measures} />);
    const card = screen.getByTestId('qg-measure-sqale_index');
    expect(card).toHaveTextContent('2h 5min');
  });

  it('shows an em-dash for a missing measure', () => {
    render(<QualityGateMeasures measures={[]} />);
    expect(screen.getByTestId('qg-measure-coverage')).toHaveTextContent('—');
  });
});
