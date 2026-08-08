# Agent Instructions

Read this file before changing the repository. Also read any project specification or README that applies to the requested work.

## Collaborating With the User

Treat the user as the product owner. Explain meaningful architecture choices, tradeoffs, and risks in plain language while keeping routine implementation work moving without unnecessary approval stops.

Ask before making a choice that would materially change product behavior, architecture, data handling, cost, privacy, security, or deployment. Make reasonable, reversible implementation decisions autonomously.

## Working in the Repository

- Inspect the working tree before editing and preserve user-authored changes.
- Implement requested changes completely, including relevant tests and documentation.
- Keep changes focused; do not mix unrelated cleanup into the task.
- Update this file when build commands, verification steps, architecture, deployment, or repository conventions change.
- Never commit credentials, tokens, private keys, local environment files, or machine-specific secrets.

## Verification

- Run the most relevant available tests, checks, builds, and visual verification before reporting completion.
- Add or update tests for behavior changes when practical.
- Do not claim a check passed unless it was run successfully.
- If a check cannot be run, state exactly what remains unverified and why.

## Git and GitHub Delivery

Completed repository changes, including documentation-only changes, must be committed and pushed to GitHub before the task is considered complete.

- Do not stop to ask for routine commit or push confirmation. The user has authorized these actions for completed work.
- If this directory is not yet a Git repository, initialize it with `main` as the default branch.
- If GitHub delivery was requested and no remote exists, create or connect the matching GitHub repository using the user's authenticated account and established repository visibility convention.
- Stage only files that belong to the current task.
- Use concise commit messages that describe the outcome.
- Pull or fetch before pushing when remote work may have changed. Resolve ordinary conflicts carefully; ask the user if resolution would discard intent or requires a product decision.
- Push with a normal fast-forward update. Never force-push, rewrite shared history, delete branches or tags, or remove a repository unless the user explicitly requests it.
- After pushing, confirm the intended commit exists on the remote branch and that the working tree is clean apart from unrelated pre-existing changes.

## Automated Actions

Use available automation needed to finish and validate the requested work. This includes GitHub Actions, deployment workflows, formatters, linters, test runners, build tools, and repository scripts.

- Monitor relevant CI or deployment runs after pushing.
- Investigate failures, make in-scope fixes, commit, push, and re-check until the relevant automation passes.
- Re-run failed jobs when the failure is transient and rerunning is safe.
- Keep workflow permissions minimal and pin or constrain third-party dependencies appropriately.
- Do not trigger destructive maintenance, publish packages, create paid resources, rotate secrets, alter production data, or make other high-impact external changes unless the user explicitly requested that outcome.

## Definition of Done

A repository task is complete when the requested result is implemented, relevant verification passes, documentation is current, the finished changes are committed and pushed, and relevant GitHub automation is green or any external blocker is clearly reported.
