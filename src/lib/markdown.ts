// SPDX-License-Identifier: MIT

import type { Issue } from '../types/sonar';

export interface MarkdownContext {
  projectKey: string;
  branch: string;
  generatedAt: string;
  totalFindings: number;
  appliedFilters: string;
}

function filePath(component: string): string {
  const colonIdx = component.indexOf(':');
  return colonIdx === -1 ? component : component.slice(colonIdx + 1);
}

function headerBlock(ctx: MarkdownContext): string {
  return [
    '---',
    `project: ${ctx.projectKey}`,
    `branch: ${ctx.branch}`,
    `generated: ${ctx.generatedAt}`,
    `total_findings: ${ctx.totalFindings}`,
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
