# Changelog

## Unreleased

### Added
- M2 read-only Windows diagnostics (first slice): Codex installation discovery from AppX package and uninstall registry metadata through a fixed PowerShell script, and process listing limited to executables under a discovered installation root.
- Ownership evidence, collection time, source and limitations on every diagnostic snapshot; active-job state is always reported as `unknown`.
- Manual "Refresh evidence" action with a PID-set comparison between snapshots.
- Payload validation and ownership path-matching tests, and Windows CI for typecheck, unit tests and build.
- M1 runnable shell: Electron, React, TypeScript and Vite with a context-isolated preload, typed IPC, dashboard and navigation using explicit mock, unknown and unavailable states.
- Committed npm lockfile and `npm run dev`, `build`, `electron`, `test` and `typecheck` scripts.
- Initial repository structure.
- Project constitution and workspace isolation rules.
- Product scope, architecture, UI and IPC specifications.
- Sprint 1 and M2 implementation specifications.
- Recovery and watchdog safety gates.
- Roadmap and contribution guidelines.

### Not included
- No repair, recovery or process-control functionality. The Recovery page is disabled.
- Live diagnostics are unavailable outside Windows.
