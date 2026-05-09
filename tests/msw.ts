// SPDX-License-Identifier: MIT

// MSW request handlers for SonarCloud V1 endpoints fronted by the Sift
// proxy. The SPA calls relative paths like `/api/sonar/v1/...`; the
// proxy (Phase 2) is what forwards them to sonarcloud.io in production.
// In tests we intercept those same relative paths with MSW so unit and
// integration tests never make a real network call.
//
// Handlers use the redacted fixtures committed under tests/fixtures/.
// Per IMPLEMENTATION.md Phase 3, some handlers vary their response by
// query parameter (e.g. `severities=BLOCKER` returns the empty-result
// fixture). Tests that need other shapes should call `server.use(...)`
// to layer a one-off handler on top of the defaults.

import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';

import organizationsSearch from './fixtures/organizations-search.json';
import projectsSearch from './fixtures/projects-search.json';
import projectBranchesList from './fixtures/project-branches-list.json';
import issuesSearch from './fixtures/issues-search.json';
import issuesSearchBlocker from './fixtures/issues-search-blocker.json';
import hotspotsSearch from './fixtures/hotspots-search.json';
import qualitygatesProjectStatus from './fixtures/qualitygates-project-status.json';
import measuresComponent from './fixtures/measures-component.json';

export const handlers = [
  http.get('/api/sonar/v1/organizations/search', () => HttpResponse.json(organizationsSearch)),

  http.get('/api/sonar/v1/projects/search', () => HttpResponse.json(projectsSearch)),

  http.get('/api/sonar/v1/project_branches/list', () => HttpResponse.json(projectBranchesList)),

  // Severity-specific fixture is the only canned variation in the base set:
  // `severities=BLOCKER` returns the recorded empty-result fixture.
  http.get('/api/sonar/v1/issues/search', ({ request }) => {
    const url = new URL(request.url);
    const severities = url.searchParams.get('severities');
    if (severities === 'BLOCKER') return HttpResponse.json(issuesSearchBlocker);
    return HttpResponse.json(issuesSearch);
  }),

  http.get('/api/sonar/v1/hotspots/search', () => HttpResponse.json(hotspotsSearch)),

  http.get('/api/sonar/v1/qualitygates/project_status', () =>
    HttpResponse.json(qualitygatesProjectStatus),
  ),

  http.get('/api/sonar/v1/measures/component', () => HttpResponse.json(measuresComponent)),
];

export const server = setupServer(...handlers);
