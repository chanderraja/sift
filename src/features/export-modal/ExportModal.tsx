// SPDX-License-Identifier: MIT

import { useState, useId } from 'react';

import { sonarClient, useFiltersStore, useSelectionStore, useUiStore } from '../../app/stores';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { Modal } from '../../components/primitives/Modal';
import { Radio, RadioGroup } from '../../components/primitives/RadioGroup';
import { hotspotsToCsv, issuesToCsv, qualityGateToCsv, type CsvField } from '../../lib/csv';
import {
  markdownGroupedByFile,
  markdownGroupedByRule,
  markdownHotspotGroupedByCategory,
  markdownHotspotGroupedByFile,
  markdownHotspotLlmSecurityReview,
  markdownHotspotTriage,
  markdownLlmRemediation,
  markdownQualityGateActionable,
  markdownQualityGateSnapshot,
  markdownTriage,
  type MarkdownContext,
  type QualityGateMarkdownContext,
} from '../../lib/markdown';
import { getConditionDrivers } from '../../lib/qgDrivers';
import type {
  Hotspot,
  HotspotFilters,
  Issue,
  IssueFilters,
  Measure,
  ProjectKey,
  QualityGate,
} from '../../types/sonar';
import { OverCapBanner } from '../issues/OverCapBanner';
import { orchestrateActionable } from './orchestrateActionable';

type Format = 'markdown' | 'csv';
type IssueMdTemplate = 'triage' | 'grouped-by-file' | 'grouped-by-rule' | 'llm-remediation';
type HotspotMdTemplate =
  | 'hs-triage'
  | 'hs-grouped-by-file'
  | 'hs-grouped-by-category'
  | 'hs-llm-security';
export type ExportScope = 'visible' | 'all-filtered' | 'all-project';
export type IssueFieldId =
  | 'severity'
  | 'type'
  | 'status'
  | 'rule'
  | 'message'
  | 'file'
  | 'line'
  | 'effort'
  | 'tags'
  | 'creationDate'
  | 'assignee';
export type HotspotFieldId =
  | 'vulnerabilityProbability'
  | 'status'
  | 'securityCategory'
  | 'ruleKey'
  | 'message'
  | 'file'
  | 'line'
  | 'creationDate';

const LIMIT_DEFAULT = 200;
const LIMIT_MAX = 1000;
// SonarCloud V1 issues/search caps page size at 500.
const SONAR_PAGE_CAP = 500;

const ISSUE_FIELD_LABELS: { id: IssueFieldId; label: string }[] = [
  { id: 'severity', label: 'Severity' },
  { id: 'type', label: 'Type' },
  { id: 'status', label: 'Status' },
  { id: 'rule', label: 'Rule' },
  { id: 'message', label: 'Message' },
  { id: 'file', label: 'File' },
  { id: 'line', label: 'Line' },
  { id: 'effort', label: 'Effort' },
  { id: 'tags', label: 'Tags' },
  { id: 'creationDate', label: 'Created' },
  { id: 'assignee', label: 'Assignee' },
];

const HOTSPOT_FIELD_LABELS: { id: HotspotFieldId; label: string }[] = [
  { id: 'vulnerabilityProbability', label: 'Probability' },
  { id: 'status', label: 'Status' },
  { id: 'securityCategory', label: 'Category' },
  { id: 'ruleKey', label: 'Rule' },
  { id: 'message', label: 'Message' },
  { id: 'file', label: 'File' },
  { id: 'line', label: 'Line' },
  { id: 'creationDate', label: 'Created' },
];

// Always-included CSV columns that are not in the chip picker.
const ISSUE_CSV_FIXED_FIELDS: CsvField[] = [
  { header: 'key', value: (i) => i.key },
  { header: 'resolution', value: (i) => i.resolution ?? '' },
  { header: 'updateDate', value: (i) => i.updateDate },
];

const ISSUE_CSV_FIELD_MAP: Record<IssueFieldId, CsvField> = {
  severity: { header: 'severity', value: (i) => i.severity },
  type: { header: 'type', value: (i) => i.type },
  status: { header: 'status', value: (i) => i.status },
  rule: { header: 'rule', value: (i) => i.rule },
  message: { header: 'message', value: (i) => i.message },
  file: { header: 'component', value: (i) => i.component },
  line: { header: 'line', value: (i) => i.line ?? '' },
  effort: { header: 'effort', value: (i) => i.effort ?? '' },
  tags: { header: 'tags', value: (i) => i.tags.join(';') },
  creationDate: { header: 'creationDate', value: (i) => i.creationDate },
  assignee: { header: 'assignee', value: (i) => i.assignee ?? '' },
};

const ALL_ISSUE_FIELD_IDS = new Set<IssueFieldId>(ISSUE_FIELD_LABELS.map((f) => f.id));
const ALL_HOTSPOT_FIELD_IDS = new Set<HotspotFieldId>(HOTSPOT_FIELD_LABELS.map((f) => f.id));

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
  enabledIssueFields: ReadonlySet<IssueFieldId>;
  enabledHotspotFields: ReadonlySet<HotspotFieldId>;
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
  enabledIssueFields,
  enabledHotspotFields,
}: GenerateOpts): string {
  if (tab === 'hotspots') {
    const slice = hotspots.slice(0, limit);
    if (format === 'csv') {
      return hotspotsToCsv(slice, enabledHotspotFields);
    }
    switch (hotspotTemplate) {
      case 'hs-triage':
        return markdownHotspotTriage(slice, ctx, enabledHotspotFields);
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
  if (format === 'csv') {
    const fields = [
      ...ISSUE_CSV_FIXED_FIELDS,
      ...ISSUE_FIELD_LABELS.filter((f) => enabledIssueFields.has(f.id)).map(
        (f) => ISSUE_CSV_FIELD_MAP[f.id],
      ),
    ];
    return issuesToCsv(slice, fields);
  }
  switch (issueTemplate) {
    case 'triage':
      return markdownTriage(slice, ctx, enabledIssueFields);
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
  readonly totalIssues?: number;
  readonly totalHotspots?: number;
}

export function ExportModal({
  issues,
  hotspots,
  qualityGate,
  measures,
  totalIssues = 0,
  totalHotspots = 0,
}: ExportModalProps): React.JSX.Element | null {
  const exportOpen = useUiStore((s) => s.exportOpen);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setExportOpen = useUiStore.getState().setExportOpen;
  const projectKey = useSelectionStore((s) => s.projectKey) ?? '';
  const branchName = useSelectionStore((s) => s.branchName) ?? '';
  const tab = useFiltersStore((s) => s.tab);
  const issuesFilters = useFiltersStore((s) => s.issuesFilters);

  type QgMdTemplate = 'snapshot' | 'actionable';

  const [format, setFormat] = useState<Format>('markdown');
  const [issueTemplate, setIssueTemplate] = useState<IssueMdTemplate>('triage');
  const [hotspotTemplate, setHotspotTemplate] = useState<HotspotMdTemplate>('hs-triage');
  const [qgTemplate, setQgTemplate] = useState<QgMdTemplate>('snapshot');
  const [limit, setLimit] = useState(LIMIT_DEFAULT);
  const [scope, setScope] = useState<ExportScope>('all-filtered');
  const [enabledIssueFields, setEnabledIssueFields] =
    useState<ReadonlySet<IssueFieldId>>(ALL_ISSUE_FIELD_IDS);
  const [enabledHotspotFields, setEnabledHotspotFields] =
    useState<ReadonlySet<HotspotFieldId>>(ALL_HOTSPOT_FIELD_IDS);
  const [copyDone, setCopyDone] = useState(false);
  const [orchestrating, setOrchestrating] = useState(false);
  const [orchestrationProgress, setOrchestrationProgress] = useState<[number, number] | null>(null);
  const [partialFailures, setPartialFailures] = useState(0);

  const limitId = useId();

  const overCap =
    scope !== 'visible' &&
    ((tab === 'issues' && totalIssues > 10_000) || (tab === 'hotspots' && totalHotspots > 10_000));

  let findingCount: number;
  let ctx: MarkdownContext;
  if (tab === 'hotspots') {
    findingCount = totalHotspots > 0 ? totalHotspots : hotspots.length;
    ctx = {
      tab: 'hotspots',
      projectKey,
      branch: branchName,
      generatedAt: new Date().toISOString(),
      totalHotspots: findingCount,
      appliedFilters: JSON.stringify(issuesFilters),
    };
  } else if (tab === 'quality-gate') {
    findingCount = 0;
    const failing =
      qualityGate?.projectStatus.conditions.filter((c) => c.status !== 'OK').length ?? 0;
    const total = qualityGate?.projectStatus.conditions.length ?? 0;
    ctx = {
      tab: 'quality-gate',
      projectKey,
      branch: branchName,
      generatedAt: new Date().toISOString(),
      qualityGateStatus: qualityGate?.projectStatus.status ?? 'NONE',
      conditionsFailing: `${failing}/${total}`,
      appliedFilters: JSON.stringify(issuesFilters),
    };
  } else {
    findingCount = totalIssues > 0 ? totalIssues : issues.length;
    ctx = {
      tab: 'issues',
      projectKey,
      branch: branchName,
      generatedAt: new Date().toISOString(),
      totalFindings: findingCount,
      appliedFilters: JSON.stringify(issuesFilters),
    };
  }

  const filename =
    format === 'csv'
      ? `sift-${projectKey}-${branchName}-${tab}-${new Date().toISOString().slice(0, 10)}.csv`
      : `sift-${projectKey}-${branchName}-${tab}-${new Date().toISOString().slice(0, 10)}.md`;

  const getContent = (
    overrideIssues?: readonly Issue[],
    overrideHotspots?: readonly Hotspot[],
  ): string =>
    generateContent({
      tab,
      issues: overrideIssues ?? issues,
      hotspots: overrideHotspots ?? hotspots,
      qualityGate,
      measures,
      format,
      issueTemplate,
      hotspotTemplate,
      limit,
      ctx,
      enabledIssueFields,
      enabledHotspotFields,
    });

  // Fetches all items when scope is not 'visible'. Falls back to props on any error.
  const resolveExportData = async (): Promise<{
    resolvedIssues: readonly Issue[];
    resolvedHotspots: readonly Hotspot[];
  }> => {
    if (scope === 'visible') {
      return { resolvedIssues: issues, resolvedHotspots: hotspots };
    }

    if (tab === 'issues') {
      const baseFilters: IssueFilters =
        scope === 'all-project'
          ? { componentKeys: [projectKey as ProjectKey], branch: branchName }
          : {
              ...issuesFilters,
              componentKeys: [projectKey as ProjectKey],
              branch: branchName,
            };
      try {
        const result = await sonarClient.searchIssues(baseFilters, {
          ps: Math.min(limit, SONAR_PAGE_CAP),
        });
        return {
          resolvedIssues: result.kind === 'ok' ? result.value.items : issues,
          resolvedHotspots: hotspots,
        };
      } catch {
        return { resolvedIssues: issues, resolvedHotspots: hotspots };
      }
    }

    if (tab === 'hotspots') {
      const hf = useFiltersStore.getState().hotspotsFilters;
      const baseFilters: HotspotFilters =
        scope === 'all-project' || hf === null
          ? { projectKey: projectKey as HotspotFilters['projectKey'], branch: branchName }
          : { ...hf, projectKey: projectKey as HotspotFilters['projectKey'], branch: branchName };
      try {
        const result = await sonarClient.searchHotspots(baseFilters, {
          ps: Math.min(limit, SONAR_PAGE_CAP),
        });
        return {
          resolvedIssues: issues,
          resolvedHotspots: result.kind === 'ok' ? result.value.items : hotspots,
        };
      } catch {
        return { resolvedIssues: issues, resolvedHotspots: hotspots };
      }
    }

    return { resolvedIssues: issues, resolvedHotspots: hotspots };
  };

  const getActionableContent = (): Promise<string | null> => {
    if (!qualityGate) return Promise.resolve(null);
    const conditionDrivers = getConditionDrivers(
      qualityGate.projectStatus.conditions,
      projectKey,
      branchName,
    );
    setOrchestrating(true);
    setOrchestrationProgress(null);
    setPartialFailures(0);
    return orchestrateActionable(sonarClient, conditionDrivers, (done, total) => {
      setOrchestrationProgress([done, total]);
    })
      .then((results) => {
        const errorCount = results.filter((r) => r.driverResult.kind === 'error').length;
        setPartialFailures(errorCount);
        setOrchestrating(false);
        setOrchestrationProgress(null);
        return markdownQualityGateActionable(
          qualityGate,
          measures,
          results,
          ctx as QualityGateMarkdownContext,
        );
      })
      .catch(() => {
        setOrchestrating(false);
        setOrchestrationProgress(null);
        return null;
      });
  };

  const afterCopy = (): void => {
    setCopyDone(true);
    setTimeout(() => {
      setCopyDone(false);
    }, 2000);
  };

  const handleCopy = (): void => {
    if (tab === 'quality-gate' && format === 'markdown' && qgTemplate === 'actionable') {
      void getActionableContent().then((content) => {
        if (content === null) return;
        void navigator.clipboard.writeText(content).then(afterCopy);
      });
      return;
    }
    void resolveExportData().then(({ resolvedIssues, resolvedHotspots }) => {
      void navigator.clipboard
        .writeText(getContent(resolvedIssues, resolvedHotspots))
        .then(afterCopy);
    });
  };

  const handleDownload = (): void => {
    if (tab === 'quality-gate' && format === 'markdown' && qgTemplate === 'actionable') {
      void getActionableContent().then((content) => {
        if (content === null) return;
        triggerDownload(content, filename, 'text/markdown;charset=utf-8');
      });
      return;
    }
    const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/markdown;charset=utf-8';
    void resolveExportData().then(({ resolvedIssues, resolvedHotspots }) => {
      triggerDownload(getContent(resolvedIssues, resolvedHotspots), filename, mimeType);
    });
  };

  const copyLabel = copyDone ? 'Copied!' : 'Copy to clipboard';

  // Size estimate based on visible items (approximation for non-visible scopes).
  const sizeKb = (getContent().length / 1024).toFixed(1);

  let footerCountText: string;
  if (tab === 'issues') {
    footerCountText = `, total_findings: ${findingCount}`;
  } else if (tab === 'hotspots') {
    footerCountText = `, total_hotspots: ${findingCount}`;
  } else {
    const qgCtx = ctx as QualityGateMarkdownContext;
    footerCountText = `, conditions_failing: ${qgCtx.conditionsFailing}`;
  }

  const actionsDisabled = overCap || orchestrating;

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
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-text-secondary">Template</legend>
            <RadioGroup
              value={qgTemplate}
              onValueChange={(v) => {
                setQgTemplate(v as QgMdTemplate);
              }}
            >
              <Radio value="snapshot">
                <span className="font-medium">Snapshot</span>
                <span className="ml-2 text-text-tertiary">
                  H1 status, conditions table, measures table.
                </span>
              </Radio>
              <Radio value="actionable">
                <span className="font-medium">Actionable</span>
                <span className="ml-2 text-text-tertiary">
                  Failing conditions with driver issues/hotspots and LLM prompt.
                </span>
              </Radio>
            </RadioGroup>
          </fieldset>
        )}

        {/* Scope radio — Issues and Hotspots tabs only */}
        {tab !== 'quality-gate' && (
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-text-secondary">Scope</legend>
            <RadioGroup
              value={scope}
              onValueChange={(v) => {
                setScope(v as ExportScope);
              }}
              className="flex flex-row gap-4"
            >
              <Radio value="visible">Visible</Radio>
              <Radio value="all-filtered">All in current filter</Radio>
              <Radio value="all-project">All in project</Radio>
            </RadioGroup>
          </fieldset>
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

        {/* Field selector — Issues and Hotspots tabs only */}
        {tab === 'issues' && (
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-text-secondary">Fields</legend>
            <div className="flex flex-wrap gap-1.5">
              {ISSUE_FIELD_LABELS.map(({ id, label }) => {
                const enabled = enabledIssueFields.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={enabled}
                    onClick={() => {
                      setEnabledIssueFields((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) {
                          next.delete(id);
                        } else {
                          next.add(id);
                        }
                        return next;
                      });
                    }}
                    className={
                      'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ' +
                      'border transition-colors ' +
                      (enabled
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-bg-elevated text-text-tertiary')
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {tab === 'hotspots' && (
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-text-secondary">Fields</legend>
            <div className="flex flex-wrap gap-1.5">
              {HOTSPOT_FIELD_LABELS.map(({ id, label }) => {
                const enabled = enabledHotspotFields.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={enabled}
                    onClick={() => {
                      setEnabledHotspotFields((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) {
                          next.delete(id);
                        } else {
                          next.add(id);
                        }
                        return next;
                      });
                    }}
                    className={
                      'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ' +
                      'border transition-colors ' +
                      (enabled
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-bg-elevated text-text-tertiary')
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Over-cap banner */}
        {overCap && <OverCapBanner total={tab === 'issues' ? totalIssues : totalHotspots} />}

        {/* Orchestration progress */}
        {orchestrating && orchestrationProgress !== null && (
          <p className="text-xs text-text-secondary">
            Fetching {orchestrationProgress[0]}/{orchestrationProgress[1]}…
          </p>
        )}
        {partialFailures > 0 && !orchestrating && (
          <p className="text-xs text-yellow-500">
            {partialFailures} condition{partialFailures > 1 ? 's' : ''} could not be fetched.
          </p>
        )}

        {/* Footer: size estimate on the left, actions on the right */}
        <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
          <div className="text-xs text-text-tertiary">
            <span>~{sizeKb} KB</span>
            <span className="ml-1">
              · header includes filters, project, branch, timestamp{footerCountText}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setExportOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleDownload} disabled={actionsDisabled}>
              Download
            </Button>
            <Button variant="primary" onClick={handleCopy} disabled={actionsDisabled}>
              {orchestrating ? 'Fetching…' : copyLabel}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
