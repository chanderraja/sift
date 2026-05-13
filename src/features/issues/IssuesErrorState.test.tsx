// SPDX-License-Identifier: MIT

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IssuesErrorState } from './IssuesErrorState';

describe('IssuesErrorState', () => {
  it('renders the unauthorized state', () => {
    render(<IssuesErrorState variant={{ kind: 'unauthorized' }} />);
    expect(screen.getByText('Token rejected')).toBeInTheDocument();
  });

  it('renders the forbidden state with the upstream message when present', () => {
    render(
      <IssuesErrorState variant={{ kind: 'forbidden', message: 'Browse permission required.' }} />,
    );
    expect(screen.getByText(/Browse permission required/)).toBeInTheDocument();
  });

  it('falls back to a generic forbidden body when the message is empty', () => {
    render(<IssuesErrorState variant={{ kind: 'forbidden', message: '' }} />);
    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(screen.getByText(/Browse permission/)).toBeInTheDocument();
  });

  it('renders the not_found state', () => {
    render(<IssuesErrorState variant={{ kind: 'not_found' }} />);
    expect(screen.getByText('Not found')).toBeInTheDocument();
  });

  it('renders rate_limited with retry-after seconds when provided', () => {
    render(<IssuesErrorState variant={{ kind: 'rate_limited', retryAfterSeconds: 30 }} />);
    expect(screen.getByText(/30s/)).toBeInTheDocument();
  });

  it('renders rate_limited without retry-after seconds when absent', () => {
    render(<IssuesErrorState variant={{ kind: 'rate_limited' }} />);
    expect(screen.getByText(/throttling/i)).toBeInTheDocument();
  });

  it('renders server_error with upstream status', () => {
    render(<IssuesErrorState variant={{ kind: 'server_error', status: 502 }} />);
    expect(screen.getByText(/502/)).toBeInTheDocument();
  });

  it('renders network_error with the message when present', () => {
    render(<IssuesErrorState variant={{ kind: 'network_error', message: 'DNS lookup failed' }} />);
    expect(screen.getByText(/DNS lookup failed/)).toBeInTheDocument();
  });

  it('renders parse_error with a Sift-bug message', () => {
    render(<IssuesErrorState variant={{ kind: 'parse_error' }} />);
    expect(screen.getByText(/could not parse/i)).toBeInTheDocument();
    expect(screen.getByText(/file an issue/i)).toBeInTheDocument();
  });

  it('renders parse_error with the failing field when hint is provided', () => {
    render(
      <IssuesErrorState
        variant={{ kind: 'parse_error', hint: 'issues.0.severity — Invalid enum value' }}
      />,
    );
    expect(screen.getByText(/issues\.0\.severity/)).toBeInTheDocument();
  });
});
