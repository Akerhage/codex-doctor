# K1 — Account panel with manually reported values

## Context
The user operates several separate Codex accounts, each with its own subscription, weekly limit, 5-hour limit and a limited number of manual resets. The account track is planned in phases K0–K6 (see `docs/ROADMAP.md`). K1 is the only phase authorized for implementation. The Phase 1 analysis behind this plan is kept outside the repository because it describes the user's private accounts.

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
- Writes go to a new temporary file in the same directory (`wx`, mode 0600 where supported), are flushed with `fsync`, then renamed over the registry. On failure the temporary file is removed and the previous registry is kept (`REGISTRY_WRITE_FAILED`).
- A registry that cannot be read, parsed or validated is never overwritten. Reads and writes return `REGISTRY_UNREADABLE` until the user resolves the file manually.
- Updates are serialized in the main process.
- No file is created until the first successful change.

## Classification
`src/shared/accounts-capacity.ts` classifies each value as:
- `unknown`: not reported;
- `known` (shown as "Reported"): reported and within the freshness limit;
- `stale` (shown as "Outdated"): older than 24 h (weekly, resets) or 5 h (5-hour window);
- `elapsed` (shown as "Reset passed"): the reported reset time has passed, so the reported percentage no longer applies. Doctor does not assume the window is back at 100 %.

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

Every method returns `Result<AccountsState>`. Error codes: `INVALID_INPUT`, `DUPLICATE_EMAIL`, `ACCOUNT_NOT_FOUND`, `REGISTRY_UNREADABLE`, `REGISTRY_WRITE_FAILED`, and `INVALID_ACCOUNTS_PAYLOAD` from response validation. The sandboxed preload duplicates the response validator from `src/shared/accounts-validation.ts`; both must be kept in sync.

Additional input rules enforced in the main process: an observation cannot be more than 5 minutes in the future, and a reset time cannot be earlier than the observation.

## UI
New "Accounts" navigation entry, independent of diagnostic collection. Each account card shows weekly and 5-hour remaining capacity with reset time, manual resets left, subscription end date and renewal status, each with its state, plus the source and age of the latest observation. Forms start empty so earlier values are never re-stamped as new observations. Removal requires a second confirmation click.

## Verification
Automated (`npm test`):
- `tests/accounts-validation.test.ts`: input and registry validation, including negative cases.
- `tests/accounts-capacity.test.ts`: unknown, stale, elapsed and passed-date classification.
- `tests/accounts-operations.test.ts`: state transitions, duplicates, future observations, history limit.
- `tests/accounts-registry-store.test.ts`: persistence across restart, corrupt and invalid files left untouched, failed rename keeps the previous file and cleans up, serialized concurrent updates.
- `tests/accounts-handlers.test.ts`: handler → store → response validation for the full flow, and rejection of invalid arguments without writing.
- `tests/accounts-format.test.ts`: form parsing (empty is unknown) and age formatting.
- `tests/accounts-isolation.test.ts`: K1 sources contain no Codex, credential, process or network references.

Manual Windows test (not yet performed):
1. Record hashes of the Codex home directory: `Get-ChildItem -Recurse -File $env:USERPROFILE\.codex | Get-FileHash | Export-Csv before.csv`.
2. `npm run build`, start the app, open Accounts.
3. Add four test accounts with `@example.test` addresses, report values for some fields only, mark one as active, edit one, remove one.
4. Restart the app and confirm the values, sources and ages persist and unreported fields show Unknown.
5. Confirm the registry exists at `%APPDATA%\codex-doctor\accounts\registry.json` and contains no unexpected fields.
6. Corrupt the registry by hand, restart, and confirm the page shows the unreadable error and the file is unchanged.
7. Repeat step 1 into `after.csv` and confirm it is identical to `before.csv`.
8. Check keyboard navigation and visible focus through all forms.

## Known limitations
- All capacity values are manual and may be wrong or outdated; Doctor cannot detect that.
- The reported active account is not verified.
- Email addresses are stored in plain text in the user profile.
- The UI is English, like the rest of Doctor.
