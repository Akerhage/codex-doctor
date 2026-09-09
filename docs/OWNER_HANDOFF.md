# Owner Handoff

The foundation pull request is documentation-only. Review and merge it before starting local implementation.

Once merged, open PowerShell in C:\CodexDoctor and verify the repository context. Run `git status` and `git remote -v`. If the working tree is clean, run `git pull --ff-only origin main`. Do not discard unexpected local changes.

Open Claude Code in that directory and ask it to read CLAUDE.md and docs/LOCAL_HANDOFF.md, then implement docs/BUILD_SPEC_SPRINT1.md on a new feature branch. Do not grant access to Atlas or the entire drive.

The first Windows test should be scheduled when no unrelated active development task needs to be interrupted. The initial application uses mock data and does not need to inspect or repair Codex.