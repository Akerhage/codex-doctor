# Roadmap

## M0 — Foundation
Repository documentation, safety boundaries, architecture and first implementation specification. No runtime code required.

## M1 — Runnable shell
Electron, React, TypeScript, Vite, typed read-only IPC, mock dashboard, navigation and automated checks. Windows smoke test required.

## M2 — Read-only diagnostics
Discover the actual Codex installation and process ownership. Collect bounded process and event evidence. No mutations.

## M3 — Evidence and recovery research
Redacted diagnostic export, inspection of the user's existing recovery script, version-aware state research and test fixtures.

## M4 — Controlled recovery
Implement only operations whose ownership, active-job safety, validation and restoration limitations have been established. Explicit user approval required.

## M5 — Monitoring and distribution
Optional notification-only watchdog, packaging and release automation after build and security validation.

## Account track (K0–K6)
Separate track for managing several Codex accounts, approved by the user on 2026-10-10. All phases are planned; none is on `main`. K1 is implemented in a draft pull request that is under review and not merged. Later phases are roadmap context and each requires its own specification and approval.

- K0 — Manual verification on the user's machine of Codex versions, the Codex home directory, the credential storage mode and the app-server schema. No code.
- K1 — Account panel with manually reported values. No access to Codex files, credentials, processes or network. Draft pull request only. See `docs/BUILD_SPEC_ACCOUNTS_K1.md`.
- K2 — Rule-based account recommendation over reported data, after the rules are specified and approved.
- K3 — Read-only live status for the active account through Codex's own interface.
- K4 — Saved sign-in profiles for inactive accounts, after a separate credential-storage security decision.
- K5 — User-confirmed manual account switch under the `REPAIR_ENGINE.md` gates.
- K6 — Manual reset activation, only with separate explicit approval.

Automatic account rotation is out of scope.

A milestone is complete only after its acceptance criteria are verified. No speculative completion dates or unsupported recovery guarantees.