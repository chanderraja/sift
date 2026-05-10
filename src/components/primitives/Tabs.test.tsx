// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { Tab, TabList, TabPanel, Tabs } from './Tabs';

const Three = ({
  defaultValue = 'issues',
  onValueChange,
}: {
  defaultValue?: string;
  onValueChange?: (v: string) => void;
}): React.JSX.Element => {
  const props = onValueChange ? { defaultValue, onValueChange } : { defaultValue };
  return (
    <Tabs {...props}>
      <TabList aria-label="View">
        <Tab value="issues">Issues</Tab>
        <Tab value="hotspots">Hotspots</Tab>
        <Tab value="qg">Quality Gate</Tab>
      </TabList>
      <TabPanel value="issues">issues content</TabPanel>
      <TabPanel value="hotspots">hotspots content</TabPanel>
      <TabPanel value="qg">qg content</TabPanel>
    </Tabs>
  );
};

describe('Tabs', () => {
  it('renders a tablist with three tabs', () => {
    render(<Three />);
    expect(screen.getByRole('tablist', { name: 'View' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('shows the panel matching the default value', () => {
    render(<Three defaultValue="hotspots" />);
    expect(screen.getByText('hotspots content')).toBeVisible();
  });

  it('switches panels on tab click', async () => {
    const onChange = vi.fn();
    render(<Three onValueChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Quality Gate' }));
    expect(onChange).toHaveBeenCalledWith('qg');
    expect(screen.getByText('qg content')).toBeVisible();
  });

  it('arrow keys move between tabs', async () => {
    render(<Three />);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Hotspots' })).toHaveAttribute('aria-selected', 'true');
  });

  it('has zero axe violations', async () => {
    const { container } = render(<Three />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
