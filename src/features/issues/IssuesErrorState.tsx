// SPDX-License-Identifier: MIT

// IssuesErrorState — presentational map from a non-ok SonarClient
// Result variant to a user-facing message. The shape mirrors what the
// SonarClient already returns so callers do not need to translate;
// each branch chooses tone (warning vs. error) and remediation text
// appropriate to the failure.

import { AlertCircle, AlertTriangle, ShieldAlert, WifiOff } from 'lucide-react';

import { EmptyState } from '../../components/primitives/EmptyState';
import type { Result } from '../../types/sonar';

type ErrorVariant = Exclude<Result<unknown>, { kind: 'ok' } | { kind: 'over_cap' }>;

export interface IssuesErrorStateProps {
  variant: ErrorVariant;
}

export function IssuesErrorState({ variant }: IssuesErrorStateProps): React.JSX.Element {
  switch (variant.kind) {
    case 'unauthorized':
      return (
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          heading="Token rejected"
          body="The configured SonarCloud token is missing, expired, or revoked. Paste a fresh one in the header."
        />
      );
    case 'forbidden':
      return (
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          heading="Access denied"
          body={
            variant.message.length > 0
              ? variant.message
              : 'Your token does not grant access to this project. Ask the project administrator to grant Browse permission, or switch to a token that has it.'
          }
        />
      );
    case 'not_found':
      return (
        <EmptyState
          icon={<AlertCircle className="h-6 w-6" />}
          heading="Not found"
          body="The project or branch is no longer reachable. Pick another from the header."
        />
      );
    case 'rate_limited':
      return (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          heading="Rate limited by SonarCloud"
          body={
            variant.retryAfterSeconds !== undefined
              ? `SonarCloud asks us to wait ${String(variant.retryAfterSeconds)}s before retrying. Try again shortly.`
              : 'SonarCloud is throttling requests. Try again shortly.'
          }
        />
      );
    case 'server_error':
      return (
        <EmptyState
          icon={<AlertCircle className="h-6 w-6" />}
          heading="SonarCloud returned an error"
          body={`Upstream status ${String(variant.status)}. The request did not complete; try again or check status.sonarcloud.io.`}
        />
      );
    case 'network_error':
      return (
        <EmptyState
          icon={<WifiOff className="h-6 w-6" />}
          heading="Network error"
          body={
            variant.message.length > 0
              ? `Failed to reach the Sift proxy: ${variant.message}. Check your connection or VPN.`
              : 'Failed to reach the Sift proxy. Check your connection or VPN.'
          }
        />
      );
  }
}
