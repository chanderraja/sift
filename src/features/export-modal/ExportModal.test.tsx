// SPDX-License-Identifier: MIT

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sonarClient, useFiltersStore, useSelectionStore, useUiStore } from '../../app/stores';
import type { Issue, IssuesPage } from '../../types/sonar';
import { baseHotspot, baseQualityGate, baseMeasures } from '../../../tests/hotspot-fixtures';
import { wrap } from '../test-helpers/sessionWrap';

import { ExportModal } from './ExportModal';
import { orchestrateActionable } from './orchestrateActionable';

vi.mock('./orchestrateActionable', () => ({
  orchestrateActionable: vi.fn(),
}));

const issue: Issue = {
  key: 'KEY1' as Issue['key'],
  rule: 'typescript:S6571' as Issue['rule'],
  severity: 'BLOCKER',
  type: 'BUG',
  status: 'OPEN',
  resolution: null,
  component: 'acme:src/payment.ts',
  project: 'acme' as Issue['project'],
  line: 42,
  message: 'Fix this.',
  effort: '10min',
  tags: [],
  creationDate: '2026-05-05T00:00:00+0000',
  updateDate: '2026-05-05T00:00:00+0000',
  flows: [],
};

let clipboardWriteText: ReturnType<typeof vi.fn>;

async function assertClipboard(check: (content: string) => void): Promise<void> {
  await waitFor(() => {
    expect(clipboardWriteText).toHaveBeenCalledOnce();
    const [content] = clipboardWriteText.mock.calls[0] as [string];
    check(content);
  });
}

beforeEach(() => {
  useSelectionStore.setState({
    organizationKey: null,
    projectKey: 'acme' as Issue['project'],
    branchName: 'main',
  });
  useFiltersStore.getState().reset();
  useUiStore.setState({ exportOpen: false });

  clipboardWriteText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: clipboardWriteText },
    writable: true,
    configurable: true,
  });

  vi.mocked(orchestrateActionable).mockResolvedValue([]);

  // Scope 'all-filtered' is the default; stub the fetches so existing copy tests
  // are unaffected. Scope-specific describe blocks override these with their own mocks.
  vi.spyOn(sonarClient, 'searchIssues').mockResolvedValue({
    kind: 'ok',
    value: { items: [issue], pageIndex: 1, pageSize: 200, total: 1, facets: [] },
  });
  vi.spyOn(sonarClient, 'searchHotspots').mockResolvedValue({
    kind: 'ok',
    value: { items: [baseHotspot], pageIndex: 1, pageSize: 200, total: 1 },
  });
});

afterEach(() => {
  useUiStore.setState({ exportOpen: false });
  useSelectionStore.getState().reset();
  useFiltersStore.getState().reset();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('ExportModal', () => {
  it('opens when exportOpen store is set to true', () => {
    useUiStore.setState({ exportOpen: true });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/export findings/i)).toBeInTheDocument();
  });

  it('does not render dialog when exportOpen is false', () => {
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pre-selects Markdown format by default', () => {
    useUiStore.setState({ exportOpen: true });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    const markdownBtn = screen.getByRole('radio', { name: /markdown/i });
    expect(markdownBtn).toBeChecked();
  });

  it('shows template selector for Markdown and hides it for CSV', async () => {
    useUiStore.setState({ exportOpen: true });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));

    // Template selector visible initially (Markdown default)
    expect(screen.getByText(/triage list/i)).toBeInTheDocument();

    // Switch to CSV
    await userEvent.click(screen.getByRole('radio', { name: /csv/i }));
    expect(screen.queryByText(/triage list/i)).not.toBeInTheDocument();
  });

  it('limit input defaults to 200 and clamps to 1000 on excessive input', async () => {
    useUiStore.setState({ exportOpen: true });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));

    const limitInput = screen.getByRole('spinbutton', { name: /limit/i });
    expect(limitInput).toHaveValue(200);

    await userEvent.clear(limitInput);
    await userEvent.type(limitInput, '9999');
    fireEvent.blur(limitInput);
    expect(limitInput).toHaveValue(1000);
  });

  it('"Copy to clipboard" calls navigator.clipboard.writeText with generated content', async () => {
    useUiStore.setState({ exportOpen: true });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));

    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    await assertClipboard((c) => expect(c).toContain('acme'));
  });

  it('"Download" triggers an anchor click with blob URL', async () => {
    useUiStore.setState({ exportOpen: true });
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    globalThis.URL.createObjectURL = createObjectURL;
    globalThis.URL.revokeObjectURL = revokeObjectURL;

    const anchorClick = vi.fn();
    // Intercept only after render so React's own createElement calls are unaffected.
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));

    const origCreate = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag, ...args) => {
        const el = origCreate(tag, ...args);
        if (tag === 'a') el.click = anchorClick;
        return el;
      });

    await userEvent.click(screen.getByRole('button', { name: /download/i }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalled();
    createElementSpy.mockRestore();
  });
});

const hotspot = baseHotspot;
const qg = baseQualityGate;
const measures = baseMeasures;

describe('ExportModal — tab-aware templates', () => {
  beforeEach(() => {
    useUiStore.setState({ exportOpen: true });
  });

  it('issues tab shows issues templates', () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    expect(screen.getByText(/triage list/i)).toBeInTheDocument();
    expect(screen.getByText(/grouped by file/i)).toBeInTheDocument();
    expect(screen.getByText(/grouped by rule/i)).toBeInTheDocument();
    expect(screen.getByText(/llm remediation/i)).toBeInTheDocument();
    expect(screen.queryByText(/security category/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/snapshot/i)).not.toBeInTheDocument();
  });

  it('hotspots tab shows hotspot templates', () => {
    useFiltersStore.setState({ tab: 'hotspots' });
    render(wrap(<ExportModal issues={[]} hotspots={[hotspot]} qualityGate={null} measures={[]} />));
    expect(screen.getByText(/triage list/i)).toBeInTheDocument();
    expect(screen.getByText(/grouped by file/i)).toBeInTheDocument();
    expect(screen.getByText(/security category/i)).toBeInTheDocument();
    expect(screen.getByText(/llm security review/i)).toBeInTheDocument();
    expect(screen.queryByText(/grouped by rule/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/snapshot/i)).not.toBeInTheDocument();
  });

  it('quality-gate tab shows Snapshot (default) and Actionable template radios', () => {
    useFiltersStore.setState({ tab: 'quality-gate' });
    render(wrap(<ExportModal issues={[]} hotspots={[]} qualityGate={qg} measures={measures} />));
    expect(screen.getByRole('radio', { name: /snapshot/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /actionable/i })).not.toBeChecked();
    expect(screen.queryByText(/triage list/i)).not.toBeInTheDocument();
  });

  it('selecting Actionable on QG tab and clicking Copy runs orchestration and writes markdown', async () => {
    useFiltersStore.setState({ tab: 'quality-gate' });
    render(wrap(<ExportModal issues={[]} hotspots={[]} qualityGate={qg} measures={measures} />));

    await userEvent.click(screen.getByRole('radio', { name: /actionable/i }));
    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));

    await assertClipboard((c) => {
      expect(c).toContain('Quality Gate: ERROR');
    });
    expect(vi.mocked(orchestrateActionable)).toHaveBeenCalledOnce();
  });

  it('shows partial-failure warning when some drivers errored', async () => {
    vi.mocked(orchestrateActionable).mockResolvedValue([
      {
        condition: {
          status: 'ERROR' as const,
          metricKey: 'reliability_rating',
          comparator: 'GT' as const,
          errorThreshold: '1',
          actualValue: '3.0',
        },
        driverResult: { kind: 'error', message: 'network_error' },
      },
    ]);
    useFiltersStore.setState({ tab: 'quality-gate' });
    render(wrap(<ExportModal issues={[]} hotspots={[]} qualityGate={qg} measures={measures} />));

    await userEvent.click(screen.getByRole('radio', { name: /actionable/i }));
    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 condition could not be fetched/i)).toBeInTheDocument();
    });
  });

  it('copy on hotspots tab writes hotspot markdown', async () => {
    useFiltersStore.setState({ tab: 'hotspots' });
    render(wrap(<ExportModal issues={[]} hotspots={[hotspot]} qualityGate={null} measures={[]} />));
    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    await assertClipboard((c) => {
      expect(c).toContain('Hotspot Triage List');
      expect(c).toContain('HIGH');
    });
  });

  it('copy on quality-gate tab writes QG markdown snapshot', async () => {
    useFiltersStore.setState({ tab: 'quality-gate' });
    render(wrap(<ExportModal issues={[]} hotspots={[]} qualityGate={qg} measures={measures} />));
    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    await assertClipboard((c) => {
      expect(c).toContain('Quality Gate: ERROR');
      expect(c).toContain('new_coverage');
    });
  });

  it('copy CSV on hotspots tab writes hotspot CSV', async () => {
    useFiltersStore.setState({ tab: 'hotspots' });
    render(wrap(<ExportModal issues={[]} hotspots={[hotspot]} qualityGate={null} measures={[]} />));
    await userEvent.click(screen.getByRole('radio', { name: /csv/i }));
    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    await assertClipboard((c) => {
      expect(c).toContain('Probability');
      expect(c).toContain('HIGH');
    });
  });

  it('copy CSV on quality-gate tab writes QG CSV', async () => {
    useFiltersStore.setState({ tab: 'quality-gate' });
    render(wrap(<ExportModal issues={[]} hotspots={[]} qualityGate={qg} measures={measures} />));
    await userEvent.click(screen.getByRole('radio', { name: /csv/i }));
    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    await assertClipboard((c) => {
      expect(c).toContain('Section');
      expect(c).toContain('condition');
      expect(c).toContain('new_coverage');
    });
  });
});

const okIssuesPage: IssuesPage = {
  items: [issue],
  pageIndex: 1,
  pageSize: 200,
  total: 1,
  facets: [],
};

describe('ExportModal — scope radio', () => {
  beforeEach(() => {
    useUiStore.setState({ exportOpen: true });
    vi.spyOn(sonarClient, 'searchIssues').mockResolvedValue({ kind: 'ok', value: okIssuesPage });
    vi.spyOn(sonarClient, 'searchHotspots').mockResolvedValue({
      kind: 'ok',
      value: { items: [baseHotspot], pageIndex: 1, pageSize: 200, total: 1 },
    });
  });

  it('renders 3 scope options on Issues tab with default All in current filter', () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    expect(screen.getByRole('radio', { name: /all in current filter/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /all in current filter/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /all in project/i })).toBeInTheDocument();
  });

  it('renders 3 scope options on Hotspots tab', () => {
    useFiltersStore.setState({ tab: 'hotspots' });
    render(
      wrap(<ExportModal issues={[]} hotspots={[baseHotspot]} qualityGate={null} measures={[]} />),
    );
    expect(screen.getByRole('radio', { name: /visible/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /all in current filter/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /all in project/i })).toBeInTheDocument();
  });

  it('QG tab has no scope radio', () => {
    useFiltersStore.setState({ tab: 'quality-gate' });
    render(wrap(<ExportModal issues={[]} hotspots={[]} qualityGate={qg} measures={measures} />));
    expect(screen.queryByRole('radio', { name: /visible/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /all in current filter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /all in project/i })).not.toBeInTheDocument();
  });

  it('Visible scope uses props directly and does not call sonarClient.searchIssues', async () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    await userEvent.click(screen.getByRole('radio', { name: /visible/i }));
    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    await assertClipboard((c) => expect(c).toContain('acme'));
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(sonarClient.searchIssues).not.toHaveBeenCalled();
  });

  it('All in current filter calls sonarClient.searchIssues with current filters', async () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    await userEvent.click(screen.getByRole('radio', { name: /all in current filter/i }));
    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sonarClient.searchIssues).toHaveBeenCalledWith(
        expect.objectContaining({ componentKeys: ['acme'] }),
        expect.anything(),
      );
    });
  });

  it('All in project calls sonarClient.searchIssues with only componentKeys and branch', async () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    await userEvent.click(screen.getByRole('radio', { name: /all in project/i }));
    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sonarClient.searchIssues).toHaveBeenCalledWith(
        { componentKeys: ['acme'], branch: 'main' },
        expect.anything(),
      );
    });
  });

  it('over-cap banner appears when totalIssues > 10000 and scope is all-filtered', async () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(
      wrap(
        <ExportModal
          issues={[issue]}
          hotspots={[]}
          qualityGate={null}
          measures={[]}
          totalIssues={10001}
        />,
      ),
    );
    await userEvent.click(screen.getByRole('radio', { name: /all in current filter/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('over-cap banner absent when scope is Visible even with totalIssues > 10000', async () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(
      wrap(
        <ExportModal
          issues={[issue]}
          hotspots={[]}
          qualityGate={null}
          measures={[]}
          totalIssues={10001}
        />,
      ),
    );
    await userEvent.click(screen.getByRole('radio', { name: /visible/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('action buttons disabled when over-cap is active', async () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(
      wrap(
        <ExportModal
          issues={[issue]}
          hotspots={[]}
          qualityGate={null}
          measures={[]}
          totalIssues={10001}
        />,
      ),
    );
    await userEvent.click(screen.getByRole('radio', { name: /all in current filter/i }));
    expect(screen.getByRole('button', { name: /download/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /copy to clipboard/i })).toBeDisabled();
  });

  it('hotspots over-cap banner appears when totalHotspots > 10000 and scope is non-visible', async () => {
    useFiltersStore.setState({ tab: 'hotspots' });
    render(
      wrap(
        <ExportModal
          issues={[]}
          hotspots={[baseHotspot]}
          qualityGate={null}
          measures={[]}
          totalHotspots={10001}
        />,
      ),
    );
    await userEvent.click(screen.getByRole('radio', { name: /all in current filter/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('All in current filter on hotspots tab calls sonarClient.searchHotspots', async () => {
    useFiltersStore.setState({ tab: 'hotspots' });
    render(
      wrap(<ExportModal issues={[]} hotspots={[baseHotspot]} qualityGate={null} measures={[]} />),
    );
    await userEvent.click(screen.getByRole('radio', { name: /all in current filter/i }));
    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sonarClient.searchHotspots).toHaveBeenCalledWith(
        expect.objectContaining({ projectKey: 'acme' }),
        expect.anything(),
      );
    });
  });
});

describe('ExportModal — field selector', () => {
  beforeEach(() => {
    useUiStore.setState({ exportOpen: true });
  });

  it('Issues tab renders 11 field chips', () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    const group = screen.getByRole('group', { name: /fields/i });
    const chips = within(group).getAllByRole('button');
    expect(chips).toHaveLength(11);
  });

  it('Hotspots tab renders 8 field chips', () => {
    useFiltersStore.setState({ tab: 'hotspots' });
    render(
      wrap(<ExportModal issues={[]} hotspots={[baseHotspot]} qualityGate={null} measures={[]} />),
    );
    const group = screen.getByRole('group', { name: /fields/i });
    const chips = within(group).getAllByRole('button');
    expect(chips).toHaveLength(8);
  });

  it('QG tab has no field selector chips', () => {
    useFiltersStore.setState({ tab: 'quality-gate' });
    render(wrap(<ExportModal issues={[]} hotspots={[]} qualityGate={qg} measures={measures} />));
    expect(screen.queryByRole('group', { name: /fields/i })).not.toBeInTheDocument();
  });

  it('all chips default to aria-pressed="true"', () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    const group = screen.getByRole('group', { name: /fields/i });
    const chips = within(group).getAllByRole('button');
    for (const chip of chips) {
      expect(chip).toHaveAttribute('aria-pressed', 'true');
    }
  });

  it('unchecking Severity chip removes severity from issues CSV output', async () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    // Switch to CSV
    await userEvent.click(screen.getByRole('radio', { name: /csv/i }));
    // Switch scope to visible so no fetch needed
    await userEvent.click(screen.getByRole('radio', { name: /visible/i }));
    // Uncheck Severity
    const group = screen.getByRole('group', { name: /fields/i });
    await userEvent.click(within(group).getByRole('button', { name: /severity/i }));
    expect(within(group).getByRole('button', { name: /severity/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    await assertClipboard((c) => {
      expect(c).not.toContain('severity');
      expect(c).not.toContain('BLOCKER');
    });
  });

  it('unchecking Severity chip removes "BLOCKER" from issues Markdown triage output', async () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    await userEvent.click(screen.getByRole('radio', { name: /visible/i }));
    const group = screen.getByRole('group', { name: /fields/i });
    await userEvent.click(within(group).getByRole('button', { name: /severity/i }));
    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    await assertClipboard((c) => {
      expect(c).not.toContain('BLOCKER');
    });
  });

  it('unchecking Probability chip removes it from hotspot CSV output', async () => {
    useFiltersStore.setState({ tab: 'hotspots' });
    render(
      wrap(<ExportModal issues={[]} hotspots={[baseHotspot]} qualityGate={null} measures={[]} />),
    );
    await userEvent.click(screen.getByRole('radio', { name: /csv/i }));
    await userEvent.click(screen.getByRole('radio', { name: /visible/i }));
    const group = screen.getByRole('group', { name: /fields/i });
    await userEvent.click(within(group).getByRole('button', { name: /probability/i }));
    await userEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }));
    await assertClipboard((c) => {
      expect(c).not.toContain('Probability');
      expect(c).not.toContain('HIGH');
    });
  });
});

describe('ExportModal — footer size estimate', () => {
  beforeEach(() => {
    useUiStore.setState({ exportOpen: true });
  });

  it('footer shows "~N KB" size estimate on Issues tab', () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    expect(screen.getByText(/~[\d.]+ KB/i)).toBeInTheDocument();
  });

  it('footer shows "header includes" summary text', () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    expect(screen.getByText(/header includes/i)).toBeInTheDocument();
  });

  it('footer includes tab-specific count for issues', () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    expect(screen.getByText(/total_findings/i)).toBeInTheDocument();
  });

  it('size estimate becomes smaller when a field chip is unchecked', async () => {
    useFiltersStore.setState({ tab: 'issues' });
    render(wrap(<ExportModal issues={[issue]} hotspots={[]} qualityGate={null} measures={[]} />));
    const sizeBefore = screen.getByText(/~[\d.]+ KB/i).textContent ?? '';
    const group = screen.getByRole('group', { name: /fields/i });
    await userEvent.click(within(group).getByRole('button', { name: /severity/i }));
    await userEvent.click(within(group).getByRole('button', { name: /type/i }));
    await userEvent.click(within(group).getByRole('button', { name: /status/i }));
    const sizeAfter = screen.getByText(/~[\d.]+ KB/i).textContent ?? '';
    const numBefore = Number.parseFloat(sizeBefore.replaceAll(/[^0-9.]/g, ''));
    const numAfter = Number.parseFloat(sizeAfter.replaceAll(/[^0-9.]/g, ''));
    expect(numAfter).toBeLessThanOrEqual(numBefore);
  });

  it('QG tab shows footer size estimate', () => {
    useFiltersStore.setState({ tab: 'quality-gate' });
    render(wrap(<ExportModal issues={[]} hotspots={[]} qualityGate={qg} measures={measures} />));
    expect(screen.getByText(/~[\d.]+ KB/i)).toBeInTheDocument();
  });
});

describe('ExportModal — QG tab hides scope and field selector', () => {
  beforeEach(() => {
    useUiStore.setState({ exportOpen: true });
    useFiltersStore.setState({ tab: 'quality-gate' });
  });

  it('QG tab has no scope radio', () => {
    render(wrap(<ExportModal issues={[]} hotspots={[]} qualityGate={qg} measures={measures} />));
    expect(screen.queryByRole('radio', { name: /visible/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /all in current filter/i })).not.toBeInTheDocument();
  });

  it('QG tab has no field chips', () => {
    render(wrap(<ExportModal issues={[]} hotspots={[]} qualityGate={qg} measures={measures} />));
    expect(screen.queryByRole('group', { name: /fields/i })).not.toBeInTheDocument();
  });

  it('QG tab footer shows size estimate and "header includes" text', () => {
    render(wrap(<ExportModal issues={[]} hotspots={[]} qualityGate={qg} measures={measures} />));
    expect(screen.getByText(/~[\d.]+ KB/i)).toBeInTheDocument();
    expect(screen.getByText(/header includes/i)).toBeInTheDocument();
  });
});
