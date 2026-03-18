# Skill Development Workflow

Step-by-step guide for creating skills.

---

## Overview

```
Phase 1: Capture Expertise
    ↓
Phase 2: Draft Skill
    ↓
Phase 3: Add Resources
    ↓
Phase 4: Evaluate & Iterate
```

---

## Phase 1: Capture Expertise

### Option A: Extract from Completed Tasks

1. Complete a real task with an agent
2. Document:
   - Steps that led to success
   - Corrections you made along the way
   - Input/output formats observed
   - Context you had to provide

### Option B: Synthesize from Artifacts

1. Gather project-specific material:
   - Documentation, runbooks, style guides
   - API specs, schemas, configs
   - Code review comments
   - Issue tracker patterns
   - Version control history

2. Feed into LLM with prompt:
   ```
   Based on these artifacts, create a skill that enables
   an agent to [capability]. Include:
   - When to use the skill
   - Step-by-step workflow
   - Gotchas specific to this environment
   - Output format requirements
   ```

---

## Phase 2: Draft Skill

### Write Frontmatter

```yaml
---
name: my-skill
description: |
  [Core capability]. Use when [contexts], [keywords], [file types].
license: MIT
compatibility: opencode
---
```

### Write Instructions

**Structure:**
```markdown
# Skill Title

## When to Use
- Bullet list of trigger conditions

## Workflow
1. Step one
2. Step two
3. Step three

## Gotchas (if any)
- Non-obvious facts

## Output Format (if specific)
[Template or description]
```

**Principles:**
- Use imperative form
- Explain the why, not just the what
- Provide defaults, not menus
- Keep under 500 lines total

---

## Phase 3: Add Resources

### scripts/ — Executable Code

For deterministic/repetitive tasks:

```python
# scripts/process.py
# /// script
# dependencies = ["pandas"]
# ///
import pandas as pd
# ...
```

See [04-using-scripts.md](04-using-scripts.md) for script design.

### references/ — Documentation

Move detailed content from main SKILL.md:
- Technical references
- Domain-specific guides
- Extended examples

**Tell agent when to load:**
```markdown
For AWS deployment, read [references/aws.md](references/aws.md).
If API returns error, check [references/errors.md](references/errors.md).
```

### assets/ — Static Resources

- Templates
- Images/diagrams
- Data files (schemas, lookup tables)

---

## Phase 4: Evaluate & Iterate

### Step 1: Create Test Cases (2-3 to start)

```json
{
  "skill_name": "my-skill",
  "evals": [{
    "id": 1,
    "prompt": "Realistic user request",
    "expected_output": "Description of success",
    "files": ["evals/files/input.csv"]
  }]
}
```

### Step 2: Run Evaluations

Run each test case:
- **With skill** — using your SKILL.md
- **Without skill** — baseline comparison

Save outputs to separate directories.

### Step 3: Write Assertions

After seeing outputs, add verifiable assertions:

```json
{
  "assertions": [
    "The output includes a chart image",
    "The chart shows exactly 3 items",
    "Axes are labeled"
  ]
}
```

### Step 4: Grade and Review

1. Grade each assertion (PASS/FAIL with evidence)
2. Review outputs manually
3. Record feedback

### Step 5: Revise

Based on failures:
- Generalize from feedback
- Explain the why
- Remove instructions agent handles alone
- Bundle repeated work into scripts

### Step 6: Repeat

Create new iteration directory, rerun all tests.

**Stop when:**
- Satisfied with results
- Feedback consistently empty
- No meaningful improvement

See [05-evaluation.md](05-evaluation.md) for full evaluation guide.

---

## Quick Reference

| Phase | Output | Key Question |
|-------|--------|--------------|
| 1. Capture | Expertise document | What makes this task unique? |
| 2. Draft | SKILL.md v1 | What does agent need to know? |
| 3. Resources | scripts/, references/ | What can be bundled? |
| 4. Evaluate | Test results | Does it work reliably? |

---

## External Resources

- **Evaluating Skills**: https://agentskills.io/skill-creation/evaluating-skills
- **skill-creator**: https://github.com/anthropics/skills/tree/main/skills/skill-creator
