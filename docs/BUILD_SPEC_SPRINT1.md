# Sprint 1 — Runnable Foundation

## Goal
Build a standalone Windows Electron application with React, TypeScript and Vite. It must launch, display a polished diagnostic-first interface, and demonstrate a typed read-only IPC boundary. All Codex telemetry is mock data.

## Scope
1. Bootstrap a minimal TypeScript/Vite/React/Electron project with a committed lockfile.
2. Implement a secure main window and context-isolated preload.
3. Expose `getEnvironment()` and `getMockSnapshot()` through typed IPC.
4. Implement Dashboard, Diagnostics, Recovery and Settings navigation.
5. Show explicit mock/unknown status labels and a timeline of sample events.
6. Add loading, empty and error states.
7. Add unit tests for contract validation and diagnostic-state presentation.
8. Document local development, production build and Windows smoke testing.

## UI requirements
Use the Atlas-inspired dark navy/slate visual language without copying Atlas code. Provide a sidebar, top bar, status cards, evidence panel and timeline. Use responsive layouts, semantic controls, keyboard focus and reduced-motion support. Do not invent real telemetry or a numerical health score.

The Recovery page must state that repairs are not implemented. No functional repair, restart, cache-clearing or process-control buttons are allowed.

## IPC contract
`getEnvironment(): Promise<Result<EnvironmentInfo>>`
`getMockSnapshot(): Promise<Result<DiagnosticSnapshot>>`

EnvironmentInfo contains Doctor version, platform, architecture and runtime versions. DiagnosticSnapshot contains a source marker of `mock`, collection timestamp, and explicit observations. Result is a discriminated success/error union. Validate all values crossing IPC.

## Security acceptance
- Renderer Node integration disabled.
- Context isolation enabled.
- No arbitrary shell or filesystem IPC.
- Navigation and new-window requests restricted.
- CSP appropriate to development and production.
- No access to Atlas or Codex user-data directories.
- No automatic process termination or persistent-state mutation.

## Verification
Run dependency installation, TypeScript checks, unit tests, production renderer build and Electron packaging/build checks supported by the chosen tooling. Record exact commands and results. Perform a Windows launch smoke test locally; do not claim it passed from CI alone.

## Completion criteria
The app launches on Windows, navigation works, mock data is unmistakably labeled, IPC errors are handled, and all automated checks pass. Document remaining limitations. Do not implement later milestones or unrelated refactors.

## Implementation handoff
Before coding, inspect the current repository and this specification. Choose compatible stable dependency versions and record them in the lockfile. Report the proposed file tree and any material ambiguity. Then implement in small reviewable commits. Do not modify Atlas or any sibling repository.