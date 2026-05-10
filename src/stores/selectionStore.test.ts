// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';

import type { OrgKey, ProjectKey } from '../types/sonar';
import { createSelectionStore } from './selectionStore';

const orgKey = 'acme' as OrgKey;
const otherOrgKey = 'other-corp' as OrgKey;
const projectKey = 'acme_widget-service' as ProjectKey;
const otherProjectKey = 'acme_other' as ProjectKey;

describe('selectionStore', () => {
  it('starts with all selection slots null', () => {
    const s = createSelectionStore().getState();
    expect(s.organizationKey).toBeNull();
    expect(s.projectKey).toBeNull();
    expect(s.branchName).toBeNull();
  });

  it('setOrganization sets the org and cascades-clears project + branch', () => {
    const store = createSelectionStore();
    store.setState({ organizationKey: orgKey, projectKey, branchName: 'main' });
    store.getState().setOrganization(otherOrgKey);
    expect(store.getState().organizationKey).toBe(otherOrgKey);
    expect(store.getState().projectKey).toBeNull();
    expect(store.getState().branchName).toBeNull();
  });

  it('setProject sets the project and cascades-clears branch', () => {
    const store = createSelectionStore();
    store.setState({ organizationKey: orgKey, projectKey, branchName: 'main' });
    store.getState().setProject(otherProjectKey);
    expect(store.getState().organizationKey).toBe(orgKey);
    expect(store.getState().projectKey).toBe(otherProjectKey);
    expect(store.getState().branchName).toBeNull();
  });

  it('setBranch only updates the branch slot', () => {
    const store = createSelectionStore();
    store.setState({ organizationKey: orgKey, projectKey, branchName: null });
    store.getState().setBranch('feature/abc');
    expect(store.getState().branchName).toBe('feature/abc');
    expect(store.getState().organizationKey).toBe(orgKey);
    expect(store.getState().projectKey).toBe(projectKey);
  });

  it('reset clears every slot', () => {
    const store = createSelectionStore();
    store.setState({ organizationKey: orgKey, projectKey, branchName: 'main' });
    store.getState().reset();
    const s = store.getState();
    expect(s.organizationKey).toBeNull();
    expect(s.projectKey).toBeNull();
    expect(s.branchName).toBeNull();
  });

  it('two stores are independent', () => {
    const a = createSelectionStore();
    const b = createSelectionStore();
    a.getState().setOrganization(orgKey);
    expect(a.getState().organizationKey).toBe(orgKey);
    expect(b.getState().organizationKey).toBeNull();
  });
});
