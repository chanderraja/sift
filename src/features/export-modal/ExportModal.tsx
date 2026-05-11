// SPDX-License-Identifier: MIT

import { useState, useId } from 'react';

import { useFiltersStore, useSelectionStore, useUiStore } from '../../app/stores';
import { Modal } from '../../components/primitives/Modal';
import { issuesToCsv } from '../../lib/csv';
import {
  markdownTriage,
  markdownGroupedByFile,
  markdownGroupedByRule,
  markdownLlmRemediation,
  type MarkdownContext,
} from '../../lib/markdown';
import type { Issue } from '../../types/sonar';

type Format = 'markdown' | 'csv';
type MdTemplate = 'triage' | 'grouped-by-file' | 'grouped-by-rule' | 'llm-remediation';

const LIMIT_DEFAULT = 200;
const LIMIT_MAX = 1000;

const MD_TEMPLATES: { id: MdTemplate; label: string; description: string }[] = [
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

function generateContent(
  issues: readonly Issue[],
  format: Format,
  template: MdTemplate,
  limit: number,
  ctx: MarkdownContext,
): string {
  const slice = issues.slice(0, limit);
  if (format === 'csv') return issuesToCsv(slice);
  switch (template) {
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
}

export function ExportModal({ issues }: ExportModalProps): React.JSX.Element | null {
  const exportOpen = useUiStore((s) => s.exportOpen);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setExportOpen = useUiStore.getState().setExportOpen;
  const projectKey = useSelectionStore((s) => s.projectKey) ?? '';
  const branchName = useSelectionStore((s) => s.branchName) ?? '';
  const tab = useFiltersStore((s) => s.tab);
  const issuesFilters = useFiltersStore((s) => s.issuesFilters);

  const [format, setFormat] = useState<Format>('markdown');
  const [template, setTemplate] = useState<MdTemplate>('triage');
  const [limit, setLimit] = useState(LIMIT_DEFAULT);
  const [copyDone, setCopyDone] = useState(false);

  const limitId = useId();

  const ctx: MarkdownContext = {
    projectKey,
    branch: branchName,
    generatedAt: new Date().toISOString(),
    totalFindings: issues.length,
    appliedFilters: JSON.stringify(issuesFilters),
  };

  const filename =
    format === 'csv'
      ? `sift-${projectKey}-${branchName}-${tab}-${new Date().toISOString().slice(0, 10)}.csv`
      : `sift-${projectKey}-${branchName}-${tab}-${new Date().toISOString().slice(0, 10)}.md`;

  const handleCopy = (): void => {
    const content = generateContent(issues, format, template, limit, ctx);
    void navigator.clipboard.writeText(content).then(() => {
      setCopyDone(true);
      setTimeout(() => {
        setCopyDone(false);
      }, 2000);
    });
  };

  const handleDownload = (): void => {
    const content = generateContent(issues, format, template, limit, ctx);
    const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/markdown;charset=utf-8';
    triggerDownload(content, filename, mimeType);
  };

  return (
    <Modal
      open={exportOpen}
      onOpenChange={setExportOpen}
      title="Export findings"
      description={`${projectKey} · ${branchName} · ${tab} · ${issues.length} findings`}
    >
      <div className="flex flex-col gap-4">
        {/* Format toggle */}
        <fieldset className="flex gap-3">
          <legend className="mb-1 text-sm font-medium text-text-muted">Format</legend>
          {(['markdown', 'csv'] as Format[]).map((f) => (
            <label key={f} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="format"
                value={f}
                checked={format === f}
                onChange={() => {
                  setFormat(f);
                }}
                aria-label={f === 'markdown' ? 'Markdown' : 'CSV'}
              />
              <span className="text-sm capitalize">{f === 'markdown' ? 'Markdown' : 'CSV'}</span>
            </label>
          ))}
        </fieldset>

        {/* Template selector — Markdown only */}
        {format === 'markdown' && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-text-muted">Template</legend>
            {MD_TEMPLATES.map((t) => {
              const inputId = `template-${t.id}`;
              return (
                <div key={t.id} className="flex items-start gap-2">
                  <input
                    id={inputId}
                    type="radio"
                    name="template"
                    value={t.id}
                    checked={template === t.id}
                    onChange={() => {
                      setTemplate(t.id);
                    }}
                    className="mt-0.5"
                  />
                  <label htmlFor={inputId} className="cursor-pointer">
                    <span className="text-sm font-medium">{t.label}</span>
                    <span className="ml-2 text-xs text-text-muted">{t.description}</span>
                  </label>
                </div>
              );
            })}
          </fieldset>
        )}

        {/* Limit */}
        <div className="flex items-center gap-3">
          <label htmlFor={limitId} className="text-sm font-medium text-text-muted">
            Limit
          </label>
          <input
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
            className="w-24 rounded border border-border bg-bg-base px-2 py-1 text-sm"
            aria-label="Limit"
          />
          <span className="text-xs text-text-muted">max {LIMIT_MAX}</span>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => {
              setExportOpen(false);
            }}
            className="rounded border border-border px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded border border-border px-3 py-1.5 text-sm"
            aria-label="Download"
          >
            Download
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded bg-accent px-3 py-1.5 text-sm text-white"
            aria-label="Copy to clipboard"
          >
            {copyDone ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
