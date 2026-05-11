// SPDX-License-Identifier: MIT

// QualityGateTab — Quality Gate surface per SPEC §7.3. Three sections:
// status pill, conditions list, and measures grid. This scaffold mounts
// the named slots; the three sections land in subsequent Phase 9
// commits.

export function QualityGateTab(): React.JSX.Element {
  return (
    <div data-testid="quality-gate-tab" className="flex flex-col gap-6">
      <section data-testid="qg-status-slot" aria-label="Quality gate status" />
      <section data-testid="qg-conditions-slot" aria-label="Quality gate conditions" />
      <section data-testid="qg-measures-slot" aria-label="Quality gate measures" />
    </div>
  );
}
