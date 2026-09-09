# Codex Doctor

**Nightingale — pre-alpha**

A standalone Windows diagnostic and recovery utility for Codex Desktop. The project prioritizes preserving active development work, collecting evidence and making recovery decisions explicit.

## Status
Documentation foundation is in progress. There is no runnable application or implemented repair engine yet.

## Technology
Electron, React, TypeScript and Vite. Node.js powers privileged desktop services. PowerShell may be used for narrowly scoped Windows diagnostics. SQLite is a possible later dependency, not part of the initial sprint.

## Safety
Read-only by default. No automatic process termination, cache deletion, session reset or modification of Codex internal state. Recovery operations require version-aware validation and separate approval. Atlas and sibling repositories are outside the writable workspace.

## Development
The intended local repository is `C:\CodexDoctor`. Read `CLAUDE.md` and `docs/BUILD_SPEC_SPRINT1.md` before implementation. Do not run build commands until the project bootstrap has been committed.

## Documentation
- `docs/PROJECT_BIBLE.md`: purpose and boundaries.
- `docs/ARCHITECTURE.md`: runtime architecture.
- `docs/UI_GUIDELINES.md`: visual language.
- `docs/IPC_CONTRACT.md`: privileged API contract.
- `docs/BUILD_SPEC_SPRINT1.md`: first implementation scope.
- `docs/REPAIR_ENGINE.md`: future recovery safety gates.
- `docs/WATCHDOG_SPEC.md`: future monitoring policy.
- `docs/ROADMAP.md`: staged milestones.

## License
No license has been selected. The repository is public, but publication alone does not grant a general license to reuse the code. The owner will choose a license before a public release.