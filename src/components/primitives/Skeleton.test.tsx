// SPDX-License-Identifier: MIT

import { render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders an aria-hidden div with the pulse animation', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const node = container.firstElementChild;
    expect(node).toHaveAttribute('aria-hidden', 'true');
    expect(node?.className).toContain('animate-pulse');
    expect(node?.className).toContain('h-4');
    expect(node?.className).toContain('w-32');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Skeleton ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('has zero axe violations', async () => {
    const { container } = render(<Skeleton />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
