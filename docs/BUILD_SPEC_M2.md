# M2 — Read-only Windows diagnostics

## Goal
Replace the Sprint 1 mock-only diagnostic path with bounded, read-only Windows evidence about the installed Codex Desktop application and processes whose executable paths can be tied to a discovered installation root.

## Safety boundary
M2 may observe package metadata and process metadata. It must not terminate, restart, suspend, signal, inject into, attach a debugger to, clear caches for, edit files for, or otherwise mutate Codex. It must not inspect conversation content, credentials, tokens, cookies, command-line arguments, environment variables, memory, open handles, browser storage, session databases or unrelated process details.

A process must never be classified as Codex-owned from its executable name alone. Ownership requires an executable path under a Codex installation root discovered from Windows package or uninstall metadata. If that relationship cannot be established, ownership is unknown.

## First implementation slice
1. Discover candidate installation roots from Windows AppX package metadata and uninstall registry metadata using a fixed, Doctor-owned PowerShell script.
2. Filter candidates locally to records whose package/display identity contains `Codex` or `OpenAI`.
3. Enumerate only processes whose executable path is under a discovered candidate root. Do not return unrelated process metadata from PowerShell.
4. Return PID, parent PID, executable basename, ownership evidence and installation metadata through typed IPC.
5. Keep active-job state explicitly `unknown`; process presence is not evidence of task activity.
6. Keep Recovery disabled.
7. Keep the Sprint 1 mock snapshot available only as a fallback/demo path; the primary dashboard must use live read-only diagnostics on Windows.

## Provenance and status
Every snapshot includes collection time, source and limitations. Installation discovery can be `detected`, `not-detected`, `unavailable` or `error`. Process evidence can be `detected`, `none`, `unavailable` or `error`. A missing installation or process is not automatically a healthy state.

## PowerShell constraints
- Invoke `powershell.exe` directly with `-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass` and a fixed script string owned by Doctor.
- No renderer-provided script, path, command, wildcard or argument may reach PowerShell.
- Use only read operations (`Get-AppxPackage`, registry reads and `Get-CimInstance Win32_Process`).
- Do not query command lines.
- Filter process output inside PowerShell so unrelated process paths are not returned to Doctor.
- Bound execution time and output size.

## Acceptance
Automated tests must cover payload validation and ownership/path matching logic with fixtures. Windows CI must pass typecheck, unit tests and build. Local Windows validation must confirm that live collection either identifies the installed Codex instance conservatively or reports an explicit unknown/not-detected state without mutation. Real installation behavior remains unverified until that local test is performed.
