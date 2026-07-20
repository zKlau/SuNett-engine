# Project skills

Drop Claude Code skills for this repo here. Each skill is its own folder containing a
`SKILL.md`, and Claude loads it on demand when the request matches the skill's
`description`.

## Layout

```
.claude/skills/
  <skill-name>/
    SKILL.md            # required - frontmatter + instructions
    <supporting files>  # optional scripts, templates, references the skill points to
```

## SKILL.md format

```markdown
---
name: my-skill
description:
  One line that tells Claude WHEN to use this skill. Be specific - this is
  what Claude matches against, e.g. "Use when adding a new note effect type under
  src/types/notes/effects".
---

# My skill

Step-by-step instructions, conventions to follow, and any commands to run.
Reference supporting files by relative path (e.g. ./template.ts).
```

- `name` must be kebab-case and match the folder name.
- `description` should say _when_ to trigger, not just what the skill is.
- Keep `SKILL.md` focused; move long references into separate files the skill links to.

Invoke a skill explicitly with `/<skill-name>`, or let Claude pick it up automatically
from the description.
