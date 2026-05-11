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

export function markdownTriage(issues: Issue[], ctx: MarkdownContext): string {
  const lines = issues.map(
    (issue, idx) =>
      `${idx + 1}. ${issue.severity} · \`${filePath(issue.component)}:${issue.line ?? '?'}\` · ${issue.rule}\n   ${issue.message}`,
  );

  return [headerBlock(ctx), '# Triage List', '', ...lines, ''].join('\n');
}

export function markdownGroupedByFile(issues: Issue[], ctx: MarkdownContext): string {
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

export function markdownGroupedByRule(issues: Issue[], ctx: MarkdownContext): string {
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

export function markdownLlmRemediation(issues: Issue[], ctx: MarkdownContext): string {
  const instruction = [
    'You are a code-quality assistant. Below is a structured list of findings exported from SonarCloud.',
    'For each finding, provide a concise remediation plan: explain the root cause, suggest a fix, and note any related findings that may share a common root cause.',
    '',
  ].join('\n');

  const findings = issues.map(
    (issue) =>
      `- **${issue.severity}** · \`${issue.rule}\` · \`${filePath(issue.component)}:${issue.line ?? '?'}\`\n  ${issue.message}`,
  );

  return [headerBlock(ctx), instruction, '### Findings', '', ...findings, ''].join('\n');
}
