# Recovery Engine — Design Gate

No recovery engine is implemented in Sprint 1.

## Required workflow
Discover exact target -> validate ownership and installed version -> collect evidence -> preview -> verify active-job safety -> obtain confirmation -> back up affected persistent state -> execute narrowly scoped action -> verify -> audit.

If a prerequisite cannot be established, stop. A backup does not make process termination reversible. No automatic process killing, cache deletion, authentication reset or internal database modification is authorized by this document.

## Version-aware adapters
Before supporting a Codex internal state format, inspect the actual installed version and the existing working recovery script supplied by the user. Document observed paths, schemas, compatibility and failure modes. Do not infer internal keys from old reports.

## Rollback
Persistent changes should have a tested restoration procedure where technically possible. Record limitations explicitly. Active jobs and terminated processes cannot be restored merely by copying files back.

## Release gate
A recovery operation requires deterministic tests, failure-path tests, a Windows validation procedure and an explicit user-approved scope. Unknown active-job state blocks automatic intervention.