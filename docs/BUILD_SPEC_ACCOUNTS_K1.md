# K1 — Account panel with manually reported values

## Status
- Implemented in draft pull request #7 on branch `claude/project-thread-u7cxa1`. Not merged into `main`, not approved for integration and not verified on Windows or in a running Electron app.
- On `main`, Codex Doctor has the M1 shell and M2 read-only diagnostics only. No account feature exists there.
- K0 and K2–K6 are planned phases only (see `docs/ROADMAP.md`). Nothing from them is implemented.

## Context
The user operates several separate Codex accounts, each with its own subscription, weekly limit, 5-hour limit and a limited number of manual resets. The account track is planned in phases K0–K6 (see `docs/ROADMAP.md`). K1 is the only phase authorized for implementation, and its implementation is still under review. The Phase 1 analysis behind this plan is kept outside the repository because it describes the user's private accounts.

## Goal
Give the user one place in Codex Doctor to register their Codex accounts and record what they can see about each account's capacity, with explicit provenance, age and unknown states. K1 contains no automatic data collection.

## Safety boundary
K1 must not:
- read, write or list anything under the Codex home directory, its configuration or its sign-in data;
- start, inspect or signal Codex or any other process;
- make network requests;
- verify, change or switch the active Codex account;
- activate or consume a manual reset;
- compute recommendations;
- add dependencies or SQLite;
- change `electron/services/windows-diagnostics.ts`.

`tests/accounts-isolation.test.ts` scans every K1 source file for terms that would indicate credential, process or network access.

## Data model
Defined in `src/shared/accounts-contracts.ts`.

- `AccountRecord`: `id` (UUID v4 created in the main process), `label` (1–60 characters), `email` (normalized to lower case, unique), `note` (≤ 500 characters or `null`), `createdAt`.
- `CapacitySnapshot`: `source: 'manual'`, `observedAt` (when the user saw the values), `recordedAt` (when Doctor stored them), weekly and 5-hour remaining percentage (integer 0–100) and reset time, manual resets left (integer 0–99), subscription end date (calendar date) and renewal status (`renewed` | `pending` | `unknown`).
- `null` always means unknown. An empty form field is stored as `null`, never as 0 or 100.
- `reportedActiveAccountId`: the account the user says is active. The UI labels it "reported by you". Doctor does not verify it.
- At most 20 snapshots are kept per account; the oldest observation is dropped first.

## Storage
- File: `<Electron userData>/accounts/registry.json`, `schemaVersion: 1`. On Windows this is normally `%APPDATA%\codex-doctor\accounts\registry.json`. Nothing is written to the repository.
- The file contains account email addresses. It contains no credentials.
- Writes go to a new temporary file in the same directory, opened with `wx` so an existing file or link at that path is never followed or replaced. The file is flushed with `fsync`, then renamed over the registry. On failure the temporary file is removed and the previous registry is kept (`REGISTRY_WRITE_FAILED`).
- A registry that cannot be read, parsed or validated is never overwritten. Reads and writes return `REGISTRY_UNREADABLE` until the user resolves the file manually.
- Updates are serialized within one Doctor process. Doctor does not yet prevent a second instance from running, so two instances could overwrite each other's changes.
- No file is created until the first successful change.
- Error messages returned to the renderer are fixed texts. They contain no file paths and no system error text.

### File permissions
- The temporary file is created with mode 0600. This restricts access on Linux and macOS only.
- On Windows, Node maps the mode to the read-only attribute and does not set an ACL. The registry inherits the ACL of `%APPDATA%\codex-doctor`, which is normally limited to the user, SYSTEM and Administrators. This has not been verified; see the manual Windows test.
- The registry is not encrypted.

### Links and junctions
- The rename replaces a link at `registry.json` instead of writing through it (tested on POSIX).
- Reading follows a link at `registry.json`. Content from the link target is used only if it passes full registry validation, and the next write replaces the link.
- A link or junction at the `accounts` directory or above is followed. Creating one requires write access to the user's own profile, so it is outside what K1 defends against.

## Classification
`src/shared/accounts-capacity.ts` classifies each value as:
- `unknown`: not reported;
- `known` (shown as "Reported"): reported by the user and not verified live;
- `elapsed` (shown as "Reset passed"): the reported reset time has passed. The reported percentage is still shown as reported. Doctor does not assume the window is back at 100 %.

There is no age limit. A value is never classified as outdated or unusable because of its age. Instead every reported value shows how long ago it was observed, and each card shows the observation time and the label "manual entry, not verified live". The user decides whether an old value is still useful. K1 has no recommendation rules or scores.

A subscription end date in the past is shown as "Date passed". It is not interpreted as the subscription having ended, since subscriptions can be renewed early.

## IPC
Channels are listed in `accountChannels`. All arguments are validated again in the main process; the renderer cannot pass paths.

| Method | Channel | Input |
|---|---|---|
| `accounts.getState()` | `doctor:accounts:get-state` | none |
| `accounts.upsertAccount(input)` | `doctor:accounts:upsert-account` | `{ id: UUID \| null, label, email, note }` |
| `accounts.removeAccount(id)` | `doctor:accounts:remove-account` | UUID |
| `accounts.recordManualSnapshot(input)` | `doctor:accounts:record-manual-snapshot` | `ManualSnapshotInput` |
| `accounts.setReportedActive(id)` | `doctor:accounts:set-reported-active` | UUID or `null` |

Every method returns `Result<AccountsState>`. Error codes: `INVALID_INPUT`, `DUPLICATE_EMAIL`, `ACCOUNT_NOT_FOUND`, `REGISTRY_UNREADABLE`, `REGISTRY_WRITE_FAILED`, and `INVALID_ACCOUNTS_PAYLOAD` from response validation. The sandboxed preload cannot import project modules, so it duplicates the response validator from `src/shared/accounts-validation.ts`. `tests/accounts-preload-parser.test.ts` runs the real preload file against the shared parser so that the two stay in sync.

Additional input rules enforced in the main process: an observation cannot be more than 5 minutes in the future, and a reset time cannot be earlier than the observation.

## UI
New "Accounts" navigation entry, independent of diagnostic collection. Each account card shows weekly and 5-hour remaining capacity with reset time, manual resets left, subscription end date and renewal status, each with its state, plus the source and age of the latest observation. Forms start empty so earlier values are never re-stamped as new observations. Removal requires a second confirmation click.

## Verification
Automated (`npm test`):
- `tests/accounts-validation.test.ts`: input and registry validation, including negative cases.
- `tests/accounts-capacity.test.ts`: unknown, elapsed and passed-date classification; values stay `known` regardless of age and the age is reported.
- `tests/accounts-operations.test.ts`: state transitions, duplicates, future observations, history limit.
- `tests/accounts-registry-store.test.ts`: persistence across restart, corrupt, invalid and directory-shaped registries left untouched, failed temporary write or rename keeps the previous file and cleans up, error messages without paths, a link at the registry path is replaced rather than written through (POSIX only), serialized concurrent updates.
- `tests/accounts-handlers.test.ts`: handler → store → response validation for the full flow, and rejection of invalid arguments without writing.
- `tests/accounts-format.test.ts`: form parsing (empty is unknown) and age formatting.
- `tests/accounts-preload-parser.test.ts`: the type-stripped `electron/preload.cts` runs in a separate VM context with a fake `electron` module. Its response parser must give the same result as the shared parser for valid and invalid registries, and the exposed methods must use the documented channels. Electron is not started.
- `tests/accounts-isolation.test.ts`: K1 sources contain no Codex, credential, process or network references.

Manual Windows test (not yet performed):
1. Close Codex. Record file metadata (not contents) of the Codex home directory: `Get-ChildItem -Recurse -File -Force $env:USERPROFILE\.codex | Select-Object FullName, Length, LastWriteTimeUtc | Export-Csv before.csv`.
2. `npm run build`, start the app, open Accounts.
3. Add four test accounts with `@example.test` addresses, report values for some fields only, mark one as active, edit one, remove one.
4. Restart the app and confirm the values, sources and ages persist and unreported fields show Unknown.
5. Confirm the registry exists at `%APPDATA%\codex-doctor\accounts\registry.json` and contains no unexpected fields. Run `icacls "$env:APPDATA\codex-doctor\accounts\registry.json"` and confirm only your user, SYSTEM and Administrators have access.
6. Corrupt the registry by hand, restart, and confirm the page shows the unreadable error and the file is unchanged.
7. With Codex still closed, repeat step 1 into `after.csv` and confirm it is identical to `before.csv`.
8. Check keyboard navigation and visible focus through all forms.

## Known limitations
- All capacity values are manual and may be wrong or outdated; Doctor cannot detect that.
- The reported active account is not verified.
- Email addresses are stored in plain text in the user profile.
- The UI is English, like the rest of Doctor.
