# Codex Doctor

**Nightingale — pre-alpha**

A standalone Windows diagnostic and recovery utility for Codex Desktop. The project prioritizes preserving active development work, collecting evidence and making recovery decisions explicit.

## Status
Version `0.1.0-alpha.1`. M0 (foundation documentation), M1 (runnable shell) and a first M2 slice (read-only Windows diagnostics) are on `main`. There is no repair engine.

What the app does today:

- Opens an Electron desktop window with a React dashboard, navigation and explicit evidence states (healthy, warning, failed, unavailable, unknown, mock).
- On Windows, discovers Codex installation roots from AppX package and uninstall registry metadata using a fixed, Doctor-owned PowerShell script.
- Lists only processes whose executable path is under a discovered installation root, with PID, parent PID, executable name and the ownership evidence. A process is never classified as Codex-owned from its name alone.
- Refreshes evidence on demand and shows which PIDs appeared or disappeared since the previous snapshot.
- Reports active-job state as `unknown`. Process presence is not treated as evidence of task activity.
- Keeps the Recovery page disabled.

On macOS and Linux the app runs, but live diagnostics report `unavailable`. The Sprint 1 mock snapshot remains as a labelled fallback. Behavior against a real Codex installation cannot be checked in CI and depends on the local Windows test described in `docs/BUILD_SPEC_M2.md`.

## Technology
Electron, React, TypeScript and Vite. Node.js powers privileged desktop services in the Electron main process. PowerShell is used only for the narrowly scoped, read-only Windows queries described in `docs/BUILD_SPEC_M2.md`. SQLite is a possible later dependency.

## Safety
Read-only by default. No automatic process termination, cache deletion, session reset or modification of Codex internal state. Diagnostics do not read command lines, conversation content, credentials, cookies or session databases. Recovery operations require version-aware validation and separate approval. Atlas and sibling repositories are outside the writable workspace.

## Running locally
Requires Node.js (CI uses Node 26) and npm. The intended local repository is `C:\CodexDoctor`. Live diagnostics require Windows with `powershell.exe` available.

Install the locked dependencies:

```
npm ci
```

Available scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite dev server for the renderer at `http://127.0.0.1:5173`. In a plain browser the preload API is absent, so use it together with Electron. |
| `npm run build` | Typechecks and builds the renderer into `dist/` and the Electron main and preload code into `dist-electron/`. |
| `npm run electron` | Launches the desktop app from the built output. Run `npm run build` first. |
| `npm test` | Runs the Vitest unit tests (payload validation, ownership path matching, process deltas). |
| `npm run typecheck` | Typechecks the renderer and Electron projects without emitting files. |

To run the built app:

```
npm run build
npm run electron
```

To develop the renderer with hot reload inside Electron, build once so `dist-electron/` exists, start the dev server, and point Electron at it from a second terminal:

```
npm run build
npm run dev
```

```powershell
$env:CODEX_DOCTOR_DEV_URL = "http://127.0.0.1:5173"
npm run electron
```

Changes to `electron/` code need `npm run build` again before relaunching.

CI runs `npm ci`, `npm run typecheck`, `npm test` and `npm run build` on `windows-latest`.

## Documentation
- `CLAUDE.md`: implementation rules and workspace isolation.
- `docs/PROJECT_BIBLE.md`: purpose and boundaries.
- `docs/ARCHITECTURE.md`: runtime architecture.
- `docs/UI_GUIDELINES.md`: visual language.
- `docs/IPC_CONTRACT.md`: privileged API contract.
- `docs/BUILD_SPEC_SPRINT1.md`: M1 runnable shell scope.
- `docs/BUILD_SPEC_M2.md`: M2 read-only diagnostics scope.
- `docs/TEST_PLAN.md`: test approach.
- `docs/REPAIR_ENGINE.md`: future recovery safety gates.
- `docs/WATCHDOG_SPEC.md`: future monitoring policy.
- `docs/ROADMAP.md`: staged milestones.

## License
No license has been selected. The repository is public, but publication alone does not grant a general license to reuse the code. The owner will choose a license before a public release.
