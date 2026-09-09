# Architecture Decision Record

## ADR-001 — Independent repository
Doctor remains separate from Atlas. No shared source package or cross-repository writes are introduced in the initial release.

## ADR-002 — React and Electron
Use React, TypeScript and Vite for the UI and Electron for desktop privileges. The renderer communicates through a narrow typed preload API.

## ADR-003 — Diagnostic-first release
The first runnable version uses mock data and read-only IPC. Recovery is deferred until the real installation and existing recovery script have been inspected.

## ADR-004 — No synthetic health percentage
Use evidence-backed states rather than an arbitrary numerical score.

## ADR-005 — Minimal initial dependencies
No SQLite, Zustand, shared UI package or automatic updater in Sprint 1 without a demonstrated requirement.

## ADR-006 — Separate approval for destructive actions
Process termination and persistent-state mutation require explicit safety review. Backups do not guarantee preservation of active jobs.

## ADR-007 — Review before merge
Work is proposed through branches and pull requests. Main remains unchanged until approved.