# Watchdog — Future Design

Not implemented in Sprint 1.

The initial watchdog, if implemented, will observe and notify only. It must not terminate or restart Codex processes, clear state, or assume that a missing UI heartbeat proves a task has stopped.

Monitoring must distinguish application availability, process existence and verified task state. These are separate observations. Unknown task state must remain unknown.

Collection intervals, resource limits, retention and notification behavior require measurement before implementation. Monitoring must not create significant load or interfere with the application being observed.

Any future automatic recovery requires a separate safety review, version-specific ownership validation, verified active-job semantics and explicit opt-in. No automatic recovery is authorized by this specification.