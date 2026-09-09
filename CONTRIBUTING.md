# Contributing

## Workflow
Work in a dedicated branch from the current main branch. Keep changes scoped to one feature or correction. Read CLAUDE.md and the active sprint specification before editing.

## Review
Inspect affected call sites and contracts. Explain behavior changes, tests, unverified assumptions and risks. Do not combine unrelated refactors with a feature. Never force-push shared history without explicit approval.

## Safety
No changes to Atlas or sibling repositories. No secrets, authentication data, private conversations or raw sensitive diagnostics in commits. No automatic Codex process termination or state mutation without a separately approved safety specification.

## Commits
Use Conventional Commits such as feat:, fix:, docs:, test:, refactor: and chore:.

## Completion
A change is complete only when relevant automated checks pass and required Windows-specific validation is documented. Do not claim unperformed tests passed. Pull requests should remain unmerged until reviewed.