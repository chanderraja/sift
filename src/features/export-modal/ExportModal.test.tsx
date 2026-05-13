// SPDX-License-Identifier: MIT

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFiltersStore, useSelectionStore, useUiStore } from '../../app/stores';
import type { Issue } from '../../types/sonar';
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
      expect(screen.getByText(/1.*condition.*could not/i)).toBeInTheDocument();
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
