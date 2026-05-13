// SPDX-License-Identifier: MIT

import type { Hotspot, Issue, Measure, QualityGate } from '../types/sonar';

export interface IssuesMarkdownContext {
  readonly tab: 'issues';
  readonly projectKey: string;
  readonly branch: string;
  readonly generatedAt: string;
  readonly totalFindings: number;
  readonly appliedFilters: string;
}

export interface HotspotsMarkdownContext {
  readonly tab: 'hotspots';
  readonly projectKey: string;
  readonly branch: string;
  readonly generatedAt: string;
  readonly totalHotspots: number;
  readonly appliedFilters: string;
}

export interface QualityGateMarkdownContext {
  readonly tab: 'quality-gate';
  readonly projectKey: string;
  readonly branch: string;
  readonly generatedAt: string;
  readonly qualityGateStatus: string;
  readonly conditionsFailing: string;
  readonly appliedFilters: string;
}

export type MarkdownContext =
  | IssuesMarkdownContext
  | HotspotsMarkdownContext
  | QualityGateMarkdownContext;

function filePath(component: string): string {
  const colonIdx = component.indexOf(':');
  return colonIdx === -1 ? component : component.slice(colonIdx + 1);
}

function countLines(ctx: MarkdownContext): string[] {
  if (ctx.tab === 'issues') return [`total_findings: ${ctx.totalFindings}`];
  if (ctx.tab === 'hotspots') return [`total_hotspots: ${ctx.totalHotspots}`];
  return [
    `quality_gate_status: ${ctx.qualityGateStatus}`,
    `conditions_failing: ${ctx.conditionsFailing}`,
  ];
}

function headerBlock(ctx: MarkdownContext): string {
  return [
    '---',
    `project: ${ctx.projectKey}`,
    `branch: ${ctx.branch}`,
    `generated: ${ctx.generatedAt}`,
    ...countLines(ctx),
    `filters: ${ctx.appliedFilters}`,
    '---',
    '',
  ].join('\n');
}

export function markdownTriage(issues: readonly Issue[], ctx: MarkdownContext): string {
  const lines = issues.map(
    (issue, idx) =>
      `${idx + 1}. ${issue.severity} · \`${filePath(issue.component)}:${issue.line ?? '?'}\` · ${issue.rule}\n   ${issue.message}`,
  );

  return [headerBlock(ctx), '# Triage List', '', ...lines, ''].join('\n');
}

export function markdownGroupedByFile(issues: readonly Issue[], ctx: MarkdownContext): string {
  const byFile = new Map<string, Issue[]>();
  for (const issue of issues) {
    const path = filePath(issue.component);
    const group = byFile.get(path) ?? [];
    group.push(issue);
    byFile.set(path, group);
  }

  const sections: string[] = [];
  for (const [path, group] of byFile) {
    sections.push(`## ${path}`);
    for (const issue of group) {
      sections.push(
        `- **${issue.severity}** · line ${issue.line ?? '?'} · \`${issue.rule}\`\n  ${issue.message}`,
      );
    }
    sections.push('');
  }

  return [headerBlock(ctx), '# Findings by File', '', ...sections].join('\n');
}

export function markdownGroupedByRule(issues: readonly Issue[], ctx: MarkdownContext): string {
  const byRule = new Map<string, Issue[]>();
  for (const issue of issues) {
    const group = byRule.get(issue.rule) ?? [];
    group.push(issue);
    byRule.set(issue.rule, group);
  }

  const sections: string[] = [];
  for (const [rule, group] of byRule) {
    sections.push(`## ${rule}`);
    for (const issue of group) {
      sections.push(
        `- **${issue.severity}** · \`${filePath(issue.component)}:${issue.line ?? '?'}\`\n  ${issue.message}`,
      );
    }
    sections.push('');
  }

  return [headerBlock(ctx), '# Findings by Rule', '', ...sections].join('\n');
}

export function markdownLlmRemediation(issues: readonly Issue[], ctx: MarkdownContext): string {
  const instruction = [
    'You are a senior engineer reviewing static-analysis findings for a',
    'colleague. Below is a structured list of issues exported from',
    'SonarCloud — rule, severity, file, line, and message for each.',
    '',
    'For each finding, propose a concrete remediation:',
    '- The minimum change needed to address the issue, not a rewrite.',
    '- A short code snippet showing the fix when the change is',
    '  straightforward.',
    "- If the fix requires context you don't have (project conventions,",
    '  framework version, broader refactoring), flag that rather than',
    '  guess.',
    '',
    'Group findings that share a root cause and propose a single fix for',
    'the group when appropriate. Order your response from highest impact',
    'to lowest. If any findings look like likely false positives or',
    'low-priority noise, say so briefly and skip detailed remediation for',
    'those.',
    '',
  ].join('\n');

  const findings = issues.map(
    (issue) =>
      `- **${issue.severity}** · \`${issue.rule}\` · \`${filePath(issue.component)}:${issue.line ?? '?'}\`\n  ${issue.message}`,
  );

  return [headerBlock(ctx), instruction, '### Findings', '', ...findings, ''].join('\n');
}

// ===== Hotspot templates =====

export function markdownHotspotTriage(hotspots: readonly Hotspot[], ctx: MarkdownContext): string {
  const lines = hotspots.map(
    (h, idx) =>
      `${idx + 1}. ${h.vulnerabilityProbability} · \`${filePath(h.component)}:${h.line ?? '?'}\` · ${h.ruleKey}\n   ${h.message}`,
  );
  return [headerBlock(ctx), '# Hotspot Triage List', '', ...lines, ''].join('\n');
}

export function markdownHotspotGroupedByFile(
  hotspots: readonly Hotspot[],
  ctx: MarkdownContext,
): string {
  const byFile = new Map<string, Hotspot[]>();
  for (const h of hotspots) {
    const path = filePath(h.component);
    const group = byFile.get(path) ?? [];
    group.push(h);
    byFile.set(path, group);
  }

  const sections: string[] = [];
  for (const [path, group] of byFile) {
    sections.push(`## ${path}`);
    for (const h of group) {
      sections.push(
        `- **${h.vulnerabilityProbability}** · ${h.securityCategory} · line ${h.line ?? '?'} · \`${h.ruleKey}\`\n  ${h.message}`,
      );
    }
    sections.push('');
  }

  return [headerBlock(ctx), '# Hotspots by File', '', ...sections].join('\n');
}

export function markdownHotspotGroupedByCategory(
  hotspots: readonly Hotspot[],
  ctx: MarkdownContext,
): string {
  const byCategory = new Map<string, Hotspot[]>();
  for (const h of hotspots) {
    const group = byCategory.get(h.securityCategory) ?? [];
    group.push(h);
    byCategory.set(h.securityCategory, group);
  }

  const sections: string[] = [];
  for (const [category, group] of byCategory) {
    sections.push(`## ${category}`);
    for (const h of group) {
      sections.push(
        `- **${h.vulnerabilityProbability}** · \`${filePath(h.component)}:${h.line ?? '?'}\`\n  ${h.message}`,
      );
    }
    sections.push('');
  }

  return [headerBlock(ctx), '# Hotspots by Security Category', '', ...sections].join('\n');
}

export const HOTSPOT_LLM_PROMPT =
  'You are a senior security engineer reviewing static-analysis hotspots for a ' +
  'colleague. Below is a structured list of security hotspots exported from ' +
  'SonarCloud — each is a code path the analyzer flagged as security-sensitive ' +
  'but did not classify as a definite vulnerability. Your job is to make a ' +
  'judgment call per hotspot.\n\n' +
  'For each hotspot, recommend one of:\n' +
  '- Change required, with the minimum hardening change as a code snippet when ' +
  'the change is straightforward.\n' +
  '- Acceptable as-is, with a one-sentence rationale why the surrounding code ' +
  'or invariants make this safe.\n' +
  '- Needs more context, flagging what additional information would resolve it ' +
  'rather than guessing.\n\n' +
  'Order findings by your assessment of risk. When multiple hotspots share a ' +
  'single root cause, propose a single fix for the group.\n';

export function markdownHotspotLlmSecurityReview(
  hotspots: readonly Hotspot[],
  ctx: MarkdownContext,
): string {
  const findings = hotspots.map(
    (h) =>
      `- **${h.vulnerabilityProbability}** · \`${h.ruleKey}\` · \`${filePath(h.component)}:${h.line ?? '?'}\` · ${h.securityCategory}\n  ${h.message}`,
  );
  return [headerBlock(ctx), HOTSPOT_LLM_PROMPT, '### Hotspots', '', ...findings, ''].join('\n');
}

// ===== Quality Gate template =====

export function markdownQualityGateSnapshot(
  qg: QualityGate,
  measures: readonly Measure[],
  ctx: MarkdownContext,
): string {
  const conditionsTable = [
    '| Metric | Comparator | Threshold | Actual | Status |',
    '|--------|------------|-----------|--------|--------|',
    ...qg.projectStatus.conditions.map(
      (c) =>
        `| ${c.metricKey} | ${c.comparator} | ${c.errorThreshold} | ${c.actualValue} | ${c.status} |`,
    ),
  ].join('\n');

  const measuresTable = [
    '| Metric | Value | Best Value |',
    '|--------|-------|------------|',
    ...measures.map((m) => `| ${m.metric} | ${m.value ?? ''} | ${String(m.bestValue ?? '')} |`),
  ].join('\n');

  return [
    headerBlock(ctx),
    `# Quality Gate: ${qg.projectStatus.status}`,
    '',
    '## Conditions',
    '',
    conditionsTable,
    '',
    '## Measures',
    '',
    measuresTable,
    '',
  ].join('\n');
}
