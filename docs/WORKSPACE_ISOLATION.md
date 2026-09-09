# Workspace Isolation

Git repositories are independent, but a working directory is not a security sandbox. An agent or script with filesystem permissions can access sibling directories unless its environment restricts that access.

Open Claude Code in C:\CodexDoctor only. Do not grant broad filesystem access or run commands from C:\. Verify the current directory, Git root and remote before committing or pushing. Do not use generic process-killing commands or recursive cleanup outside explicitly validated Doctor-owned paths.

Atlas is not a dependency of Doctor. No Atlas source, credentials, deployment configuration or runtime data is required for Sprint 1. If a future task requires reference material, request a specific read-only copy rather than scanning the Atlas repository.

A separate Git remote prevents ordinary commits from being pushed to the wrong repository when commands are run in the correct working tree. It does not prevent an agent from deliberately or accidentally changing directories. Always verify the repository context before destructive Git operations.