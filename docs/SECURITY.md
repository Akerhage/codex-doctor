# Security and Privacy

## Trust boundaries
The renderer is untrusted relative to privileged desktop services. Use a narrow context-isolated preload API, validate IPC input and output, disable renderer Node integration, and restrict navigation and external content.

## Local data
Do not collect secrets, account tokens or conversation contents by default. Diagnostic reports must redact sensitive paths and identifiers and require explicit consent before including raw logs or dumps. Do not commit runtime diagnostics or backups.

## Process safety
Do not identify processes by generic executable names alone. Do not terminate or restart processes without verified ownership and a separately approved recovery procedure. Unknown active-job state blocks automatic intervention.

## Filesystem
The development workspace is C:\CodexDoctor. No writes to Atlas or sibling repositories. Runtime access to Codex data is read-only until a specific recovery adapter has been reviewed and authorized.

## Reporting
Security-sensitive findings should be reported privately to the repository owner. Do not publish credentials, private logs or exploit details in public issues.

## Scope
This document establishes requirements, not a claim that the unbuilt application has passed a security audit.