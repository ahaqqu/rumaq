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

- **Why:** concise and clear objectives for the changes.
- **Summary:** summary of the changes, not a list of files.
- **Architecture:** architectural changes.
- **Backend:** backend changes with automation test proof.
- **Frontend:** frontend changes with automation test proof.
- **Security Review:** security implications of the actual changes.
- **Performance Review:** performance implications of the actual changes.
- **Acceptance Criteria:** checklist of acceptance criteria met or not, based on `docs/TEST_STRATEGY.md`.
- **Documentation:** checklist of documentation updated or added.
- **Limitations & Warnings:** any limitations or warnings.

All sections must be written. Write `None` if there are no relevant changes for that section.

## PR Rules (non-negotiable)

- Ensure acceptance criteria in `docs/TEST_STRATEGY.md` are met before creating the PR.
- PR title and PR body/description must follow the formats defined above.
- Never merge your own PR — submit for human review only.
- Never create a PR with a dirty working tree (must be committed).
- Always create a PR even for trivial changes — every change needs a review trail.
- If a human-review gate was triggered (destructive migration, new dependency, auth change), state it prominently in **Limitations & Warnings**.
