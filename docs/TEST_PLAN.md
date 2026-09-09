# Test Plan

## Foundation
Validate required documentation and JSON configuration. This does not establish application correctness.

## Sprint 1
TypeScript checks, unit tests for contracts and presentation states, production build, IPC error handling, navigation and accessibility smoke checks. Run a Windows launch test and record the exact commands and results.

## Diagnostics
Use deterministic fixtures for parsers and classifiers. Test missing permissions, absent installations, malformed data, multiple processes and unknown ownership. Verify collectors do not mutate observed state.

## Recovery
Before implementation, define version-specific fixtures, backup integrity checks, failure injection, verification and restoration tests. Test active-job uncertainty and ensure automatic intervention is blocked. A successful unit test cannot prove that a live job survives process termination.

## Reporting
Every implementation report must distinguish passed, failed, skipped and not-run checks. Do not mark a feature complete based solely on compilation.