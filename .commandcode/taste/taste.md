# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# cli
- Symlink skills from `.commandcode/skills/` to `.opencode/skills/` so both tools share the same skill files. Confidence: 0.85

# documentation
- In agent instructions and docs: prefer high-level objectives and principles over specific file paths/details, since files change and specific details are hard to maintain. Confidence: 0.75

# cli
- When scripts lack execute permission, run them with `bash ./script.sh` instead of `./script.sh`. Confidence: 0.70

# pr-creation
- Creating a PR while the style/test gate is red is acceptable; only merging requires green gates. Confidence: 0.70

