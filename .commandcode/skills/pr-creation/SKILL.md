# PR Creation Skill

Use this skill whenever creating or opening a pull request in this repository.

## Workflow

1. Create a new branch from `main`.
2. Analyze the security implications of the actual changes.
3. Analyze the performance implications of the actual changes.
4. Read `docs/` (`README.md` and all `.md` files), validate them against the code, and update whichever side is out of sync so they stay consistent.
5. Ensure all acceptance criteria in `docs/TEST_STRATEGY.md` pass.
6. Run `./scripts/style.sh` to auto-format and lint-fix (use `./scripts/style.sh --check` to verify without writing).
7. Run `./scripts/test.sh unit`.
8. Create the PR when the acceptance criteria in `docs/TEST_STRATEGY.md` are met.

## PR Title Format

```
<type>(<scope>): <short summary>     # max 72 chars
```

Types: `feat` · `fix` · `refactor` · `docs` · `chore`
Scope: the resource or route touched

## PR Description / Body Format

The PR description is the body shown in GitHub. Write it in Markdown with the following sections in order:

## Why

Concise and clear objectives for the changes.

## Summary

Summary of the changes, not a list of files.

## Architecture

Architectural changes. Write `None` if none.

## Backend

Backend changes with automation test proof. Write `None` if none.

## Frontend

Frontend changes with automation test proof. Write `None` if none.

## Security Review

Security implications of the actual changes. Write `None` if none.

## Performance Review

Performance implications of the actual changes. Write `None` if none.

## Acceptance Criteria

Checklist of acceptance criteria met or not, based on `docs/TEST_STRATEGY.md`.

## Documentation

Checklist of documentation updated or added.

## Limitations & Warnings

Any limitations or warnings, or `None`.

All sections must be written. Write `None` if there are no relevant changes for that section.

## PR Rules (non-negotiable)

- Ensure acceptance criteria in `docs/TEST_STRATEGY.md` are met before creating the PR.
- PR title and PR body/description must follow the formats defined above.
- Never merge your own PR — submit for human review only.
- Never create a PR with a dirty working tree (must be committed).
- Always create a PR even for trivial changes — every change needs a review trail.
- If a human-review gate was triggered (destructive migration, new dependency, auth change), state it prominently in **Limitations & Warnings**.
