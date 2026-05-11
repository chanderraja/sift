// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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

  // One row per metric category — exercises rating → letter, density →
  // %, ncloc → compact suffix, debt → duration. Parameterized so each
  // category is one row, not its own block.
  it.each([
    ['security_rating', '2.0', 'B'],
    ['coverage', '73.5', '73.5%'],
    ['ncloc', '4849', '4.8k'],
    ['sqale_index', '125', '2h 5min'],
  ])('formats %s value %s as "%s"', (metric, value, expected) => {
    render(<QualityGateMeasures measures={[{ metric, value }]} />);
    expect(screen.getByTestId(`qg-measure-${metric}`)).toHaveTextContent(expected);
  });

  it('shows an em-dash for a missing measure', () => {
    render(<QualityGateMeasures measures={[]} />);
    expect(screen.getByTestId('qg-measure-coverage')).toHaveTextContent('—');
  });
});
