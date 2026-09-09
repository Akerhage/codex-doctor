# Codex Doctor — Project Bible

Codename: Nightingale. Status: pre-alpha, documentation phase.

## Purpose
A standalone Windows desktop utility that helps diagnose Codex Desktop failures and preserve evidence before a user chooses a recovery action. The primary use case is an unresponsive or blank desktop application while development work may still be running.

## Principles
- Preserve active work over restoring the appearance of the UI.
- Observe before changing anything.
- Distinguish measured facts, inferred causes, and unknowns.
- Never promise that restarting a process preserves a task.
- Keep Atlas and other development projects outside Doctor's writable scope.
- Keep account credentials and conversation content private.
- Prefer small, reversible persistent-state changes over broad resets, but never call process termination reversible.

## Product boundaries
Doctor is not Atlas, a general Windows optimizer, a replacement Codex client, or an autonomous repair agent. It does not need access to Atlas source code. Its own repository and runtime data must be independent.

## Initial release
A secure Electron shell with React, TypeScript and Vite; a dark desktop dashboard; explicit diagnostic states; mock-data navigation; and a typed, read-only IPC foundation. No repair buttons that imply working recovery are permitted in the first sprint.

## Later capabilities
Read-only process and installation discovery, diagnostic evidence collection, redacted report export, version-aware recovery adapters, backup and verification, and optional user-approved repair operations. A watchdog may notify users, but automatic termination is out of scope until active-job safety can be demonstrated.

## Evidence requirements
A diagnostic conclusion must identify its source, collection time, and limitations. Missing telemetry is unknown, not healthy. A synthetic health score must not be presented as a measured fact.

## Release gates
Every release requires passing automated checks, a documented Windows smoke test, and an explicit statement of unverified behavior. Repair releases additionally require tests against supported Codex versions and failure/rollback scenarios.

## Milestones
M0: documentation and repository foundation.
M1: runnable UI and typed IPC with mock data.
M2: read-only Windows diagnostics.
M3: evidence export and recovery design validated against real installations.
M4: narrowly scoped, user-approved recovery operations where safety is established.
M5: optional monitoring and packaging improvements.

No milestone authorizes implementation of a later milestone. Dates and estimates are not commitments until the work has been scoped and measured.