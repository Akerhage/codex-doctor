# Local implementation handoff

## Before starting
The user should finish or safely pause any unrelated work before opening a new Claude Code session. Open only `C:\CodexDoctor`. Do not grant access to the entire C: drive or Atlas.

Fetch the approved main branch after the documentation PR is merged. Verify `git status`, `git remote -v` and the current branch before making changes. Do not reset or discard local changes.

## Task for Claude Code
Read CLAUDE.md, PROJECT_BIBLE.md, ARCHITECTURE.md, IPC_CONTRACT.md, UI_GUIDELINES.md and BUILD_SPEC_SPRINT1.md. Implement Sprint 1 only. Inspect the repository before choosing dependencies. Use compatible stable versions and commit the lockfile. Do not access Atlas, Codex user-data, credentials or unrelated repositories. Do not implement repair or process-control functionality.

Build the secure Electron/React/TypeScript/Vite foundation, typed mock IPC, dashboard and navigation. Run relevant automated checks and document exact results. Perform the Windows smoke test only when the user is ready. Report changed files, tests, limitations and remaining risks.

## Git safety
Use a feature branch. Do not merge or push to main without user approval. Do not use force push, hard reset or clean commands to resolve unexpected local state. Stop and ask if the working tree contains unrelated changes.

## Later recovery work
Before implementing recovery, request the existing working recovery script and a redacted diagnostic snapshot from the actual Codex installation. Do not guess internal state paths or keys.