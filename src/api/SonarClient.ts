// SPDX-License-Identifier: MIT

// SonarClient — typed wrapper over the same-origin Sift proxy at
// `/api/sonar/v1/...`. Per ARCHITECTURE.md §2 (Module 1) and §5
// ("Errors as values, not exceptions"), every public method returns
// `Result<T>`; the client never throws.
//
// Methods land one-per-commit through the rest of Phase 3. This file is
// the constructor + shared plumbing the methods will use.

export interface SonarClientOptions {
  region: 'eu' | 'us';
  getToken: () => string;
}

export class SonarClient {
  protected readonly region: 'eu' | 'us';
  protected readonly getToken: () => string;

  constructor(opts: SonarClientOptions) {
    this.region = opts.region;
    this.getToken = opts.getToken;
  }
}
