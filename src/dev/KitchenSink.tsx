// SPDX-License-Identifier: MIT

// Dev-only visual spot-check page. Renders every Phase 5 primitive in
// every variant so a designer / maintainer can scan tokens, contrast,
// and state changes without firing up the full app. Gated behind
// `import.meta.env.DEV` at the `App.tsx` import boundary — this module
// is dynamically imported so the production bundle never includes it.

import { Bug, Search, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import type { IssueType, QualityGateStatus, Severity, Status } from '../types/sonar';

import { Badge, SeverityBadge, StatusBadge, TypeBadge } from '../components/primitives/Badge';
import { Button } from '../components/primitives/Button';
import { Checkbox } from '../components/primitives/Checkbox';
import { Drawer } from '../components/primitives/Drawer';
import { EmptyState } from '../components/primitives/EmptyState';
import { FilterGroup } from '../components/primitives/FilterGroup';
import { Input } from '../components/primitives/Input';
import { Modal } from '../components/primitives/Modal';
import { Pill } from '../components/primitives/Pill';
import { Radio, RadioGroup } from '../components/primitives/RadioGroup';
import { Select, SelectItem } from '../components/primitives/Select';
import { Skeleton } from '../components/primitives/Skeleton';
import {
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from '../components/primitives/Table';
import { Tab, TabList, TabPanel, Tabs } from '../components/primitives/Tabs';
import { Toaster, toast } from '../components/primitives/Toast';
import { Toggle } from '../components/primitives/Toggle';
import { Tooltip } from '../components/primitives/Tooltip';

const SEVERITIES: readonly Severity[] = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'];
const TYPES: readonly IssueType[] = ['BUG', 'VULNERABILITY', 'CODE_SMELL'];
const STATUSES: readonly Status[] = ['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED'];
const QG_STATUSES: readonly QualityGateStatus[] = ['OK', 'WARN', 'ERROR', 'NONE'];

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element => (
  <section className="border-b border-border-subtle py-6">
    <h2 className="mb-3 text-2xs uppercase tracking-wide text-text-tertiary">{title}</h2>
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </section>
);

export default function KitchenSink(): React.JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [select, setSelect] = useState<string | undefined>(undefined);
  const [tab, setTab] = useState<string>('issues');

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="mb-2 text-xl text-text-primary">Sift kitchen sink</h1>
      <p className="mb-6 text-xs text-text-secondary">
        Dev-only. Every Phase 5 primitive in every variant. Not shipped in production.
      </p>

      <Section title="Buttons">
        {(['primary', 'secondary', 'ghost', 'danger'] as const).map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
        <Button size="sm">small</Button>
        <Button disabled>disabled</Button>
      </Section>

      <Section title="Severity badges">
        {SEVERITIES.map((s) => (
          <SeverityBadge key={s} severity={s} />
        ))}
      </Section>

      <Section title="Type badges">
        {TYPES.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </Section>

      <Section title="Status badges">
        {STATUSES.map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
      </Section>

      <Section title="Generic badge + neutral">
        <Badge>Generic</Badge>
        <Badge tone="neutral">Neutral</Badge>
      </Section>

      <Section title="QG pills">
        {QG_STATUSES.map((s) => (
          <Pill key={s} status={s} />
        ))}
      </Section>

      <Section title="Inputs">
        <Input aria-label="Plain text" placeholder="Plain text" />
        <Input type="password" aria-label="Password" placeholder="Password" />
        <Input type="number" aria-label="Number" defaultValue={42} />
        <Input type="search" aria-label="Search" placeholder="Search…" leadingIcon={<Search />} />
        <Input disabled aria-label="Disabled" placeholder="Disabled" />
      </Section>

      <Section title="Checkbox / Radio / Toggle">
        <Checkbox defaultChecked>Checked</Checkbox>
        <Checkbox>Unchecked</Checkbox>
        <Checkbox checked="indeterminate">Indeterminate</Checkbox>
        <RadioGroup defaultValue="a" aria-label="Radio">
          <Radio value="a">A</Radio>
          <Radio value="b">B</Radio>
        </RadioGroup>
        <Toggle defaultChecked>On</Toggle>
        <Toggle>Off</Toggle>
      </Section>

      <Section title="Select">
        <Select
          {...(select === undefined ? {} : { value: select })}
          onValueChange={setSelect}
          placeholder="Pick one"
          aria-label="Choices"
        >
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="cherry">Cherry</SelectItem>
        </Select>
      </Section>

      <Section title="Tabs">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabList aria-label="View">
            <Tab value="issues">Issues</Tab>
            <Tab value="hotspots">Hotspots</Tab>
            <Tab value="qg">Quality Gate</Tab>
          </TabList>
          <TabPanel value="issues" className="p-3 text-xs text-text-secondary">
            issues content
          </TabPanel>
          <TabPanel value="hotspots" className="p-3 text-xs text-text-secondary">
            hotspots content
          </TabPanel>
          <TabPanel value="qg" className="p-3 text-xs text-text-secondary">
            qg content
          </TabPanel>
        </Tabs>
      </Section>

      <Section title="Tooltip">
        <Tooltip content="A tooltip on a button" delayDuration={100}>
          <Button variant="secondary">Hover me</Button>
        </Tooltip>
      </Section>

      <Section title="Modal / Drawer / Toast">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Button onClick={() => setDrawerOpen(true)} variant="secondary">
          Open drawer
        </Button>
        <Button onClick={() => toast.success('Hello')} variant="ghost">
          Fire toast
        </Button>
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="Example modal"
          description="A demo modal for the kitchen sink."
        >
          <p className="text-xs text-text-secondary">Modal body content goes here.</p>
        </Modal>
        <Drawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title="Example drawer"
          description="A demo drawer for the kitchen sink."
        >
          <p className="text-xs text-text-secondary">Drawer body content goes here.</p>
        </Drawer>
        <Toaster />
      </Section>

      <Section title="Skeleton">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-24" />
      </Section>

      <Section title="EmptyState">
        <EmptyState
          icon={<Bug className="h-6 w-6" />}
          heading="No findings"
          body="Filters yield zero results. Try widening the severity range or removing tags."
          action={<Button>Reset filters</Button>}
        />
      </Section>

      <Section title="FilterGroup">
        <FilterGroup title="Severity" count={3}>
          <Checkbox defaultChecked>BLOCKER</Checkbox>
          <Checkbox defaultChecked>CRITICAL</Checkbox>
          <Checkbox>MAJOR</Checkbox>
        </FilterGroup>
      </Section>

      <Section title="Table">
        <TableRoot className="w-full">
          <TableHeader>
            <TableRow>
              <TableHeaderCell sortDirection="asc" onSort={() => undefined}>
                Severity
              </TableHeaderCell>
              <TableHeaderCell>Rule</TableHeaderCell>
              <TableHeaderCell>File</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              expanded
              expandedColSpan={3}
              expandedContent={
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-severity-blocker" aria-hidden="true" />
                  Hard-coded credentials are security-sensitive.
                </div>
              }
            >
              <TableCell>
                <SeverityBadge severity="BLOCKER" />
              </TableCell>
              <TableCell>typescript:S6571</TableCell>
              <TableCell className="font-mono text-text-secondary">
                src/services/payment.ts:142
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <SeverityBadge severity="MAJOR" />
              </TableCell>
              <TableCell>java:S2068</TableCell>
              <TableCell className="font-mono text-text-secondary">
                src/auth/legacy.java:47
              </TableCell>
            </TableRow>
          </TableBody>
        </TableRoot>
      </Section>
    </main>
  );
}
