// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';

import { hotspotUrl, issueUrl } from './sonarUrl';

describe('issueUrl', () => {
  it('builds an EU issue URL', () => {
    expect(issueUrl('eu', 'my_project', 'AYx8K1pQ-1', 'main')).toBe(
      'https://sonarcloud.io/project/issues?id=my_project&issues=AYx8K1pQ-1&open=AYx8K1pQ-1&branch=main',
    );
  });

  it('builds a US issue URL', () => {
    expect(issueUrl('us', 'my_project', 'AYx8K1pQ-1', 'main')).toBe(
      'https://sonarqube.us/project/issues?id=my_project&issues=AYx8K1pQ-1&open=AYx8K1pQ-1&branch=main',
    );
  });

  it('percent-encodes special characters in projectKey and branch', () => {
    const url = issueUrl('eu', 'org:my project', 'key1', 'feat/my branch');
    expect(url).toContain('id=org%3Amy+project');
    expect(url).toContain('branch=feat%2Fmy+branch');
  });
});

describe('hotspotUrl', () => {
  it('builds an EU hotspot URL', () => {
    expect(hotspotUrl('eu', 'my_project', 'AYx8K1pQ-2', 'main')).toBe(
      'https://sonarcloud.io/project/security_hotspots?id=my_project&hotspots=AYx8K1pQ-2&branch=main',
    );
  });

  it('builds a US hotspot URL', () => {
    expect(hotspotUrl('us', 'my_project', 'AYx8K1pQ-2', 'main')).toBe(
      'https://sonarqube.us/project/security_hotspots?id=my_project&hotspots=AYx8K1pQ-2&branch=main',
    );
  });

  it('percent-encodes special characters in projectKey and branch', () => {
    const url = hotspotUrl('eu', 'org:my project', 'key2', 'feat/my branch');
    expect(url).toContain('id=org%3Amy+project');
    expect(url).toContain('branch=feat%2Fmy+branch');
  });
});
