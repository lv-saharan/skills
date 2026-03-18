# Skill Templates

Quick-start templates for common skill types.

---

## Basic Template

```markdown
---
name: my-skill
description: Brief description. Use when [context], [keywords], or [file types].
---

# My Skill

## When to Use
- User mentions [keywords]
- User works with [file types]
- User needs to [action]

## Workflow
1. Step one
2. Step two
3. Step three

## Output
[Expected output format]
```

---

## Gotchas Template

```markdown
---
name: my-skill
description: [What it does]. Use when [context].
---

# My Skill

## When to Use
- [Trigger conditions]

## Gotchas
- [Non-obvious fact 1]
- [Non-obvious fact 2]
- [Edge case]

## Workflow
1. Step one
2. Step two
```

---

## Script-Bundled Template

```markdown
---
name: automated-workflow
description: Automates [workflow]. Use when [context].
---

# Automated Workflow

## Quick Start
```bash
python scripts/run.py [arguments]
```

## Scripts
| Script | Purpose |
|--------|---------|
| `scripts/run.py` | Main workflow |
| `scripts/validate.py` | Validation |

## Workflow
1. Input validation
2. Processing
3. Output generation

## Validation
```bash
python scripts/validate.py output/
```
```

---

## Multi-Framework Template

```markdown
---
name: multi-framework
description: [Capability] across multiple frameworks.
---

# Multi-Framework Skill

## Select Framework
Ask user which framework:
- **Option A**: [description]
- **Option B**: [description]

Read appropriate reference:
- Option A: [references/option-a.md](references/option-a.md)
- Option B: [references/option-b.md](references/option-b.md)

## Common Workflow
[Steps applying to all frameworks]
```

---

## Checklist Template

```markdown
---
name: checklist-skill
description: [What it does]. Use when [context].
---

# Checklist Skill

## Progress
- [ ] Step 1: [Description]
- [ ] Step 2: [Description]
- [ ] Step 3: [Description]
- [ ] Step 4: [Description]
- [ ] Step 5: [Description]

## Validation
```bash
scripts/validate.sh
```
```

---

## Copy-Paste Starter

```markdown
---
name: 
description: 
---

# 

## When to Use


## Workflow
1. 
2. 
3. 

## Output


## Examples
**Input**: 
**Output**: 
```
