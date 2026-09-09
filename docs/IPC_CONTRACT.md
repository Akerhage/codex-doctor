# IPC Contract

## Boundary
Only the context-isolated preload exposes privileged functionality. The renderer must not receive raw Electron IPC objects, Node APIs, arbitrary command execution or unrestricted filesystem access.

## Initial API
`getEnvironment(): Promise<Result<EnvironmentInfo>>`
`getMockSnapshot(): Promise<Result<DiagnosticSnapshot>>`

Result is a discriminated union with success data or a structured error containing a stable code and safe message. EnvironmentInfo includes Doctor version, platform, architecture and runtime versions. DiagnosticSnapshot includes `source: "mock"`, an ISO timestamp, and observations with stable identifiers, status and explanatory text.

## Validation
Validate IPC arguments and returned external data at trust boundaries. Reject unexpected values rather than coercing them into valid diagnostic states. Do not expose stack traces or sensitive paths to the renderer by default.

## Future API policy
New privileged methods require a documented purpose, explicit input/output types, validation, ownership checks and tests. Mutation APIs must be separate from read-only diagnostics and require their own safety review. No generic `executeCommand`, `readFile` or `deletePath` method is permitted.