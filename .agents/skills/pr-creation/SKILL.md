---
name: pr-creation
description: |
  Creating or opening a pull request. Invoke when the user says "create a PR",
  "open a PR", "pr-creation", or "submit PR". Do NOT invoke for simply fixing
  CI or pushing commits — only when a new PR needs to be opened or an existing
  PR needs its description updated.
---

# pr-creation

## Steps

1. **Check current state**: `git status`, `git log --oneline -5`, and check if a PR already exists for the branch.

2. **Ensure CI gate is green**: Run `scripts/github/ci.sh` locally. If it fails, fix the issue before proceeding. PRs with a red CI gate are acceptable only if the failure is a known pre-existing issue (e.g., unfixable transitive advisory) documented in the PR body.

3. **Validate docs**: If API docs were affected, run `scripts/docs.sh` and verify `docs/API.md` is up to date.

4. **Write the PR description**: Use the template below. Include a summary of what changed, why, and verification steps. Reference the issue or handoff if applicable.

5. **Create or update the PR**: Use `gh pr create` for new PRs or `gh pr edit` for existing ones.

## PR description template

```markdown
## Summary

<one-paragraph summary of what this PR does and why>

## Changes

- <change 1>
- <change 2>
- <change 3>

## Verification

- [ ] CI gate passes (`scripts/github/ci.sh`)
- [ ] Docs up to date (`scripts/docs.sh`)
- [ ] Unit tests pass
```

## Conventions

- Do not merge the PR unless explicitly asked.
- Use `gh api repos/:owner/:repo/pulls/:number -X PATCH` instead of `gh pr edit` (see AGENTS.md).
