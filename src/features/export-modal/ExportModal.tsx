// SPDX-License-Identifier: MIT

import { useState, useId } from 'react';

import { useFiltersStore, useSelectionStore, useUiStore } from '../../app/stores';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { Modal } from '../../components/primitives/Modal';
import { Radio, RadioGroup } from '../../components/primitives/RadioGroup';
import { hotspotsToCsv, issuesToCsv, qualityGateToCsv } from '../../lib/csv';
import {
  markdownGroupedByFile,
  markdownGroupedByRule,
  markdownHotspotGroupedByCategory,
  markdownHotspotGroupedByFile,
  markdownHotspotLlmSecurityReview,
  markdownHotspotTriage,
  markdownLlmRemediation,
  markdownQualityGateSnapshot,
  markdownTriage,
  type MarkdownContext,
} from '../../lib/markdown';
import type { Hotspot, Issue, Measure, QualityGate } from '../../types/sonar';

type Format = 'markdown' | 'csv';
type IssueMdTemplate = 'triage' | 'grouped-by-file' | 'grouped-by-rule' | 'llm-remediation';
type HotspotMdTemplate =
  | 'hs-triage'
  | 'hs-grouped-by-file'
  | 'hs-grouped-by-category'
  | 'hs-llm-security';

const LIMIT_DEFAULT = 200;
const LIMIT_MAX = 1000;

const ISSUE_TEMPLATES: { id: IssueMdTemplate; label: string; description: string }[] = [
  { id: 'triage', label: 'Triage list', description: 'Numbered list, severity-prefixed.' },
  {
    id: 'grouped-by-file',
    label: 'Grouped by file',
    description: 'H2 per file, bullets per finding.',
  },
  { id: 'grouped-by-rule', label: 'Grouped by rule', description: 'H2 per rule with occurrences.' },
  {
    id: 'llm-remediation',
    label: 'LLM remediation prompt',
    description: 'Instruction prepended; structured findings.',
  },
];

const HOTSPOT_TEMPLATES: { id: HotspotMdTemplate; label: string; description: string }[] = [
  {
    id: 'hs-triage',
    label: 'Triage list',
    description: 'Numbered list, probability-prefixed.',
  },
  {
    id: 'hs-grouped-by-file',
    label: 'Grouped by file',
    description: 'H2 per file, bullets per hotspot.',
  },
  {
    id: 'hs-grouped-by-category',
    label: 'Grouped by security category',
    description: 'H2 per category, bullets per occurrence.',
  },
  {
    id: 'hs-llm-security',
    label: 'LLM security review',
    description: 'Security-engineer persona; judgment-call recommendations.',
  },
];

interface GenerateOpts {
  tab: string;
  issues: readonly Issue[];
  hotspots: readonly Hotspot[];
  qualityGate: QualityGate | null;
  measures: readonly Measure[];
  format: Format;
  issueTemplate: IssueMdTemplate;
  hotspotTemplate: HotspotMdTemplate;
  limit: number;
  ctx: MarkdownContext;
}

function generateContent({
  tab,
  issues,
  hotspots,
  qualityGate,
  measures,
  format,
  issueTemplate,
  hotspotTemplate,
  limit,
  ctx,
}: GenerateOpts): string {
  if (tab === 'hotspots') {
    const slice = hotspots.slice(0, limit);
    if (format === 'csv') return hotspotsToCsv(slice);
    switch (hotspotTemplate) {
      case 'hs-triage':
        return markdownHotspotTriage(slice, ctx);
      case 'hs-grouped-by-file':
        return markdownHotspotGroupedByFile(slice, ctx);
      case 'hs-grouped-by-category':
        return markdownHotspotGroupedByCategory(slice, ctx);
      case 'hs-llm-security':
        return markdownHotspotLlmSecurityReview(slice, ctx);
    }
  }

  if (tab === 'quality-gate') {
    if (format === 'csv') return qualityGate ? qualityGateToCsv(qualityGate, measures) : '';
    return qualityGate ? markdownQualityGateSnapshot(qualityGate, measures, ctx) : '';
  }

  // issues tab (default)
  const slice = issues.slice(0, limit);
  if (format === 'csv') return issuesToCsv(slice);
  switch (issueTemplate) {
    case 'triage':
      return markdownTriage(slice, ctx);
    case 'grouped-by-file':
      return markdownGroupedByFile(slice, ctx);
    case 'grouped-by-rule':
      return markdownGroupedByRule(slice, ctx);
    case 'llm-remediation':
      return markdownLlmRemediation(slice, ctx);
  }
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  a.click();
  URL.revokeObjectURL(url);
}

export interface ExportModalProps {
  readonly issues: readonly Issue[];
  readonly hotspots: readonly Hotspot[];
  readonly qualityGate: QualityGate | null;
  readonly measures: readonly Measure[];
}

export function ExportModal({
  issues,
  hotspots,
  qualityGate,
  measures,
}: ExportModalProps): React.JSX.Element | null {
  const exportOpen = useUiStore((s) => s.exportOpen);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setExportOpen = useUiStore.getState().setExportOpen;
  const projectKey = useSelectionStore((s) => s.projectKey) ?? '';
  const branchName = useSelectionStore((s) => s.branchName) ?? '';
  const tab = useFiltersStore((s) => s.tab);
  const issuesFilters = useFiltersStore((s) => s.issuesFilters);

  const [format, setFormat] = useState<Format>('markdown');
  const [issueTemplate, setIssueTemplate] = useState<IssueMdTemplate>('triage');
  const [hotspotTemplate, setHotspotTemplate] = useState<HotspotMdTemplate>('hs-triage');
  const [limit, setLimit] = useState(LIMIT_DEFAULT);
  const [copyDone, setCopyDone] = useState(false);

  const limitId = useId();

  let findingCount: number;
  if (tab === 'hotspots') {
    findingCount = hotspots.length;
  } else if (tab === 'quality-gate') {
    findingCount = 0;
  } else {
    findingCount = issues.length;
  }

  const ctx: MarkdownContext = {
    projectKey,
    branch: branchName,
    generatedAt: new Date().toISOString(),
    totalFindings: findingCount,
    appliedFilters: JSON.stringify(issuesFilters),
  };

  const filename =
    format === 'csv'
      ? `sift-${projectKey}-${branchName}-${tab}-${new Date().toISOString().slice(0, 10)}.csv`
      : `sift-${projectKey}-${branchName}-${tab}-${new Date().toISOString().slice(0, 10)}.md`;

  const getContent = (): string =>
    generateContent({
      tab,
      issues,
      hotspots,
      qualityGate,
      measures,
      format,
      issueTemplate,
      hotspotTemplate,
      limit,
      ctx,
    });

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(getContent()).then(() => {
      setCopyDone(true);
      setTimeout(() => {
        setCopyDone(false);
      }, 2000);
    });
  };

  const handleDownload = (): void => {
    const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/markdown;charset=utf-8';
    triggerDownload(getContent(), filename, mimeType);
  };

  return (
    <Modal
      open={exportOpen}
      onOpenChange={setExportOpen}
      title="Export findings"
      description={`${projectKey} · ${branchName} · ${tab} · ${findingCount} findings`}
    >
      <div className="flex flex-col gap-4">
        {/* Format toggle */}
        <fieldset>
          <legend className="mb-1 text-xs font-medium text-text-secondary">Format</legend>
          <RadioGroup
            value={format}
            onValueChange={(v) => {
              setFormat(v as Format);
            }}
            className="flex flex-row gap-4"
          >
            <Radio value="markdown">Markdown</Radio>
            <Radio value="csv">CSV</Radio>
          </RadioGroup>
        </fieldset>

        {/* Template selector — Markdown only */}
        {format === 'markdown' && tab === 'issues' && (
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-text-secondary">Template</legend>
            <RadioGroup
              value={issueTemplate}
              onValueChange={(v) => {
                setIssueTemplate(v as IssueMdTemplate);
              }}
            >
              {ISSUE_TEMPLATES.map((t) => (
                <Radio key={t.id} value={t.id}>
                  <span className="font-medium">{t.label}</span>
                  <span className="ml-2 text-text-tertiary">{t.description}</span>
                </Radio>
              ))}
            </RadioGroup>
          </fieldset>
        )}

        {format === 'markdown' && tab === 'hotspots' && (
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-text-secondary">Template</legend>
            <RadioGroup
              value={hotspotTemplate}
              onValueChange={(v) => {
                setHotspotTemplate(v as HotspotMdTemplate);
              }}
            >
              {HOTSPOT_TEMPLATES.map((t) => (
                <Radio key={t.id} value={t.id}>
                  <span className="font-medium">{t.label}</span>
                  <span className="ml-2 text-text-tertiary">{t.description}</span>
                </Radio>
              ))}
            </RadioGroup>
          </fieldset>
        )}

        {format === 'markdown' && tab === 'quality-gate' && (
          <div>
            <p className="mb-1 text-xs font-medium text-text-secondary">Template</p>
            <p className="text-sm text-text-primary">Snapshot</p>
            <p className="text-xs text-text-tertiary">
              H1 status, conditions table, measures table.
            </p>
          </div>
        )}

        {/* Limit — not applicable for QG (single document) */}
        {tab !== 'quality-gate' && (
          <div className="flex items-center gap-3">
            <label htmlFor={limitId} className="text-xs font-medium text-text-secondary">
              Limit
            </label>
            <Input
              id={limitId}
              type="number"
              min={1}
              max={LIMIT_MAX}
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
              }}
              onBlur={(e) => {
                const v = Math.min(LIMIT_MAX, Math.max(1, Number(e.target.value)));
                setLimit(v);
              }}
              className="w-24"
              aria-label="Limit"
            />
            <span className="text-xs text-text-tertiary">max {LIMIT_MAX}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-end gap-2 border-t border-border pt-2">
          <Button
            variant="secondary"
            onClick={() => {
              setExportOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleDownload}>
            Download
          </Button>
          <Button variant="primary" onClick={handleCopy}>
            {copyDone ? 'Copied!' : 'Copy to clipboard'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
