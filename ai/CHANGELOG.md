# AI changelog

This file records implementation decisions and validation for agent-capsule.

## 2026-09-25 — cross-tool handoff verification

- Added `verifyHandoffs` to check that an exact JSON value returned by one recorded tool call reached a later call's arguments unchanged.
- Added a fail-closed CLI command with distinct pass, mismatch and invalid-input exit statuses, plus public types, offline demo coverage and focused regressions.
- Kept the claim narrow: the check proves equality inside a captured trace, not causal attribution, semantic correctness, model reliability or side-effect safety.
- Validation: syntax checks, strict TypeScript checks, 15 tests and the offline demo. No live model or external tool was invoked.

## 2026-09-21 — v0.1.0 alpha

- Implemented the documented offline core, CLI, typed public API and extension contracts.
- Added an optional pinned Jev 1.13.0 adapter through DecisionPacks at commit `3c90b6e667c16653b9a6ae00b376df9bddbd8461`.
- Added explicit deadlines, portable JSON validation, private non-overwriting artifacts and error propagation. CLI output preflight avoids rerunning tools against an existing target.
- Added offline examples, regression tests, loopback HTTP integration tests and Node 22/24 CI.
- Validation: syntax, TypeScript no-emit checks, tests and demo. No build performed. Live Jev inference and model quality were not tested.
