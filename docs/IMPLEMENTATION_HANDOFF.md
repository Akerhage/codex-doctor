# Implementation Handoff

After the foundation PR is approved and merged, start Sprint 1 in a new branch. Read the repository instructions and active specification before coding. The implementation must remain limited to a secure Electron/React/TypeScript/Vite shell with mock diagnostics and typed read-only IPC.

Do not access Atlas, inspect Codex user data, terminate processes, or implement recovery. Report actual test results and remaining limitations. Windows validation requires a local test when the user is ready.