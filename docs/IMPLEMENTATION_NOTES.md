# Implementation Notes

The first implementation is intentionally small. A runnable, secure shell with mock diagnostics is more valuable than a large untested collection of repair modules.

The implementation engineer may select compatible stable dependency versions and an appropriate Electron/Vite build arrangement, but must document the choice and commit the lockfile. Do not invent internal Codex APIs or state schemas.

The initial UI should demonstrate the intended design language without introducing unnecessary state management, charting or component-library dependencies. Future shared UI packages with Atlas are explicitly deferred.

The project lead reviews changes through GitHub. Local Windows testing is performed only when the user is ready. No task should require stopping Atlas or interrupting active Codex work merely to build the foundation.