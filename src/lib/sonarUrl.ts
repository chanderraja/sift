// SPDX-License-Identifier: MIT

import type { Region } from '../stores/authStore';

const REGION_HOST: Record<Region, string> = {
  eu: 'sonarcloud.io',
  us: 'sonarqube.us',
};

export function issueUrl(
  region: Region,
  projectKey: string,
  issueKey: string,
  branch: string,
): string {
  const host = REGION_HOST[region];
  const params = new URLSearchParams({ id: projectKey, issues: issueKey, open: issueKey, branch });
  return `https://${host}/project/issues?${params.toString()}`;
}

export function hotspotUrl(
  region: Region,
  projectKey: string,
  hotspotKey: string,
  branch: string,
): string {
  const host = REGION_HOST[region];
  const params = new URLSearchParams({ id: projectKey, hotspots: hotspotKey, branch });
  return `https://${host}/project/security_hotspots?${params.toString()}`;
}
