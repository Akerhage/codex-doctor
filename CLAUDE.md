# CLAUDE.md — Codex Doctor

## Role

You are the implementation engineer for Codex Doctor. Architecture, safety policy, product scope, and sprint boundaries are defined by the repository documentation and by explicit instructions from the project lead. Implement those specifications precisely. Do not invent new architecture, repair behavior, process control, or filesystem access patterns when requirements are unclear.

If a required behavior is ambiguous, stop before changing code and ask for clarification.

## Project identity

Codex Doctor is a Windows desktop diagnostic and recovery utility for Codex Desktop. It is an independent project located at `C:\CodexDoctor` and must remain isolated from Atlas and all sibling repositories.

Primary stack:

- Electron shell
- React
- TypeScript
- Vite
- Node.js in the Electron main process
- PowerShell only for narrowly scoped Windows operations where it is the appropriate interface
- SQLite may be introduced later for Doctor-owned history and diagnostic records

## Workspace isolation — mandatory

Treat `C:\CodexDoctor` as the only writable workspace.

Do not:

- edit, rename, delete, or create files outside this repository;
- access `C:\Atlas` or any sibling repository unless the user explicitly authorizes a read-only inspection for a specific task;
- search parent directories for projects;
- run Git commands outside this repository;
- alter Git remotes belonging to another repository;
- scan or terminate unrelated Node, Electron, Git, Claude, browser, server, or developer processes;
- infer that a process belongs to Codex merely because its executable name is generic.

If a task appears to require access outside `C:\CodexDoctor`, stop and explain exactly what is required and why.

## Safety model

Codex Doctor is diagnostic-first. Read-only observation is the default.

Until a repair path has been explicitly specified, implemented, reviewed, and tested, do not add automatic mutations to Codex state, caches, configuration, sessions, authentication data, databases, or processes.

Never assume that:

- a live backend process means an active Codex task will survive renderer termination;
- low CPU or network usage means a Codex job is idle;
- killing or restarting an Electron renderer is safe;
- internal Codex state keys or SQLite schemas are stable;
- clearing caches is harmless;
- a backup guarantees reversibility of a running process or active task.

Any future repair operation that changes state must have all of the following before it is considered production-ready:

1. a precise target and ownership check;
2. a dry-run or preview path where technically meaningful;
3. a backup for persistent state that will be modified;
4. validation before mutation;
5. post-action verification;
6. explicit failure handling;
7. rollback for persistent changes where rollback is technically possible;
8. an audit entry describing what was attempted and what changed.

Process termination is not considered reversible and must never be described as such.

## Active-job protection

Never terminate, restart, suspend, or manipulate a Codex process as part of an automatic workflow unless the project specification defines a verified method for determining process ownership and active-job semantics for the installed Codex version.

If ownership or active-job state cannot be established with high confidence, surface the evidence to the user and require manual confirmation.

## Account and privacy isolation

The user may operate multiple Codex accounts. Do not merge account-scoped information.

Do not expose, log, copy, export, or commit:

- authentication tokens;
- cookies;
- secrets;
- private prompts or conversation contents unless explicitly required for a user-approved diagnostic action;
- sensitive project content from unrelated repositories.

Diagnostic exports must default to metadata and redacted values. Raw logs or dumps containing sensitive content require explicit user consent.

## Architecture rules

React renderer code must not import Node.js modules directly.

All privileged operations flow through:

`React renderer -> typed preload API -> Electron main process -> diagnostic/service module`

Use `contextIsolation: true` and keep Node integration disabled in the renderer.

IPC contracts must be typed and documented. Avoid ad-hoc string channels scattered through the codebase.

Do not put PowerShell invocation logic inside React components.

Keep data collection separate from presentation. UI components render explicit observed states; they do not invent diagnostic conclusions.

## Evidence over synthetic health scores

Do not represent an arbitrary weighted score as measured system health.

Prefer explicit states such as:

- observed healthy;
- warning;
- failed;
- unavailable;
- unknown;
- not yet checked.

Every diagnostic conclusion shown to the user must be traceable to collected evidence.

## TypeScript rules

Use strict TypeScript.

Avoid `any`. If external data is unknown, use `unknown` and validate it before use.

Prefer small named types and discriminated unions for IPC results and diagnostic states.

Use named exports unless a framework convention strongly favors a default export.

Functions should have one clear responsibility. Do not use line-count limits as a substitute for cohesive design; split files when responsibilities diverge or reviewability materially improves.

## React rules

Prefer function components and hooks.

Do not introduce a global state library unless the sprint specification demonstrates a concrete need. Start with local state, context, or a small dedicated store only where state is genuinely cross-cutting.

Do not add visual libraries, component frameworks, or charting dependencies without approval.

Accessibility matters: keyboard navigation, visible focus, semantic controls, and readable contrast are required.

## Styling

The visual language should be inspired by the current Atlas screenshots supplied by the user: dark navy/slate surfaces, restrained teal/cyan accents, rounded panels, clear status pills, and dense but calm desktop information architecture.

Do not copy Atlas source code. Do not assume exact Atlas colors, fonts, spacing, or component implementations unless they are explicitly supplied.

## PowerShell rules

PowerShell scripts must be narrowly scoped and must validate all paths and process identities they operate on.

Where a script mutates persistent state and the operation supports preview semantics, expose a dry-run or `-WhatIf` mode.

Do not hide errors with broad `try/catch` blocks. Return structured error information to the caller.

Never use broad recursive deletion against application-data roots. Target exact known paths only after ownership validation.

## Filesystem and state rules

Do not guess Codex installation paths, app-data paths, database locations, state keys, or schema names.

Discovery must be explicit and non-destructive. Record what was found and how it was identified.

Before adding support for a Codex internal state file or database, inspect the actual installed version and document the observed schema or format in a versioned diagnostic adapter.

## Git rules

Work only in this repository.

Use small, reviewable commits with Conventional Commit prefixes:

- `feat:` new user-facing capability
- `fix:` bug fix
- `refactor:` behavior-preserving internal change
- `docs:` documentation only
- `test:` tests only
- `style:` visual-only change
- `chore:` build, tooling, or maintenance

Do not combine unrelated refactors with feature work.

Do not force-push or rewrite shared history unless explicitly instructed.

Before editing a file, inspect its call sites and dependent contracts when the change could affect behavior elsewhere.

## Testing and validation

No feature is complete because it compiles.

For every changed behavior, validate the full input/output chain that the change touches. This includes IPC boundaries, error states, and renderer behavior where applicable.

Prefer deterministic unit tests for parsers, validators, classification logic, and state transitions.

Use integration tests for IPC contracts where practical.

Windows-specific behavior that cannot be reproduced in CI must have a documented manual test procedure.

Never claim a repair is safe, successful, or non-disruptive without evidence from the relevant test.

## Sprint discipline

Only implement the active sprint specification.

Do not pre-build later repair, watchdog, workspace-scanning, SQLite, updater, or packaging systems unless the active build specification requires them.

When a future feature is mentioned in design documentation, treat it as roadmap context, not permission to implement it.

## Current phase

Current milestone: Sprint 0 / Foundation documentation.

The first implementation sprint will bootstrap the Electron + React + TypeScript + Vite shell and a diagnostic-first UI using mock data. It must not contain Codex repair logic, automatic process control, destructive state changes, or Atlas integration.

## Completion report

At the end of an implementation task, report:

1. files changed;
2. behavior implemented;
3. tests or checks run;
4. anything not verified;
5. risks or assumptions that remain.

Do not report work as complete if required validation could not be performed.