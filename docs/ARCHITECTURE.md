# Architecture

## Runtime boundaries
React renderer -> context-isolated preload -> validated IPC -> Electron main -> Doctor-owned services.

The renderer has no Node integration. Privileged services never accept arbitrary shell commands or unrestricted filesystem paths from the renderer. IPC handlers validate arguments and return structured results.

## Initial structure
- `electron/main.ts`: application lifecycle and window creation.
- `electron/preload.ts`: narrow exposed API.
- `electron/ipc/`: registered handlers and validation.
- `src/`: React application, pages, components, styles and typed client API.
- `src/shared/`: contracts safe for both renderer and main process.
- `tests/`: deterministic tests.
- `docs/`: specifications and operational procedures.

Additional directories are introduced only when needed. Empty placeholder directories do not establish an architecture.

## Security
Use context isolation, disabled renderer Node integration, sandboxing where compatible, a restrictive content security policy, and explicit navigation/window-opening restrictions. Development-server access must be restricted to the intended local development environment. Do not expose a general-purpose command execution IPC.

## Diagnostics
Collectors return observations with timestamps, provenance, status and errors. Classification is separate from collection. Unknown and unavailable are first-class states. No collector may modify Codex state.

## Recovery boundary
Recovery is a separate subsystem with explicit target validation, preview, backup where applicable, confirmation, execution, verification and audit. It is not part of the initial implementation. Internal Codex formats must be discovered and versioned rather than guessed.

## Persistence
Do not introduce SQLite in Sprint 1. Later Doctor-owned history may use SQLite with migrations and bounded retention. Never open or modify Codex databases merely because they use SQLite.

## Testing
Unit-test pure logic and contract validation. Test IPC boundaries and error handling. Windows-specific collectors require fixtures and manual validation against a known installation. CI cannot establish that a live recovery preserves active work.

## Dependencies
Use the smallest dependency set necessary for the active sprint. Pin versions through a committed lockfile. Do not introduce Zustand, a UI framework, charting libraries, auto-update, or packaging dependencies without a demonstrated requirement.