// SPDX-License-Identifier: MIT

// IssueExpandPanel — renders details about a single issue inside an
// expanded table row. Today it shows the rule key, full message, and
// file:line. The lazy-loaded SonarCloud rule *description* will land
// once `SonarClient.getRule()` exists (see ARCHITECTURE.md §3); this
// component is the mount point.

import { fileFromComponent } from '../../lib/component';
import type { Issue } from '../../types/sonar';

export interface IssueExpandPanelProps {
  issue: Issue;
}

export function IssueExpandPanel({ issue }: IssueExpandPanelProps): React.JSX.Element {
  return (
    <div
      data-testid="issue-expand-panel"
      className="flex flex-col gap-2 text-xs text-text-secondary"
    >
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-text-primary">{issue.rule}</span>
        <span className="font-mono">
          {fileFromComponent(issue.component)}
          {issue.line !== undefined ? `:${String(issue.line)}` : ''}
        </span>
      </div>
      <p className="text-text-primary">{issue.message}</p>
      {issue.tags.length > 0 ? (
        <div className="text-text-tertiary">tags: {issue.tags.join(', ')}</div>
      ) : null}
    </div>
  );
}
