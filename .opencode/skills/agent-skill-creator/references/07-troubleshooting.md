# Troubleshooting Guide

Common problems and solutions.

---

## Skill Not Triggering

### Problem

Agent doesn't use skill when expected.

### Causes & Solutions

| Cause | Solution |
|-------|----------|
| Description too vague | Add specific keywords, contexts, file types |
| Task too simple | Agents skip skills for basic tasks they handle alone |
| Wrong location | Verify skill is in `.opencode/skills/` or valid location |
| Naming conflict | Check for duplicate skill names |
| Permissions deny | Check `opencode.json` skill permissions |

### Quick Fix

Rewrite description using formula:

```
[Core capability]. Use when [contexts], [keywords], [file types].
```

**Example:**
```yaml
# Before (vague)
description: Help with data.

# After (specific)
description: |
  Analyze CSV and Excel files — compute statistics, add columns,
  generate charts. Use when user has .csv, .xlsx, .tsv file and
  wants to explore or transform data.
```

---

## Skill Not Loading

### Problem

Skill doesn't appear in `/skills` list.

### Causes & Solutions

| Cause | Solution |
|-------|----------|
| Wrong filename | Must be `SKILL.md` (all caps) |
| Missing frontmatter | Add `name` and `description` fields |
| Name mismatch | `name` must match directory name |
| Invalid name format | Use `^[a-z0-9]+(-[a-z0-9]+)*$` |

### Validation

```bash
pip install skills-ref
skills-ref validate ./my-skill
```

---

## False Triggers

### Problem

Skill activates when it shouldn't.

### Causes & Solutions

| Cause | Solution |
|-------|----------|
| Description too broad | Add specificity about what skill does NOT do |
| Keyword overlap | Clarify boundaries with adjacent capabilities |
| Overfitting | Remove specific keywords added during optimization |

### Example

```yaml
# Before (triggers too broadly)
description: |
  Process files and generate output. Use when user has any file
  and needs processing.

# After (specific boundaries)
description: |
  Analyze CSV and tabular data files only. Use when user has
  .csv, .tsv, or .xlsx files. Does NOT handle PDFs, images,
  or code files.
```

---

## Skill Adds No Value

### Problem

Output with skill same as without skill.

### Causes & Solutions

| Cause | Solution |
|-------|----------|
| Instructions too generic | Add project-specific gotchas, conventions |
| Agent handles task alone | Skill may not be needed for this task |
| Redundant instructions | Remove what agent does fine without |

### Analysis

1. Compare execution transcripts (with vs without)
2. Identify what agent did differently
3. If nothing different → skill not adding value
4. Consider: Does this task need a skill at all?

---

## High Token/Time Cost

### Problem

Skill dramatically increases cost without proportional benefit.

### Causes & Solutions

| Cause | Solution |
|-------|----------|
| Verbose instructions | Cut explanations agent doesn't need |
| Too many reference files | Consolidate or remove unused references |
| Inefficient workflow | Restructure steps to reduce iterations |

### Target

Aim for:
- Pass rate improvement > 30 percentage points
- Token increase < 50%
- Time increase < 30%

---

## Inconsistent Results

### Problem

Same test case passes sometimes, fails others.

### Causes & Solutions

| Cause | Solution |
|-------|----------|
| Vague instructions | Add specific examples, clarify ambiguity |
| Flaky test case | Test case too sensitive to model variance |
| Multiple valid outputs | Assertion too strict |

### Fix

1. Read execution transcripts for failing runs
2. Identify where agent diverges
3. Add instruction to prevent divergence
4. Or: relax assertion if multiple outputs valid

---

## Permission Issues

### Problem

Skill blocked by permissions.

### Solution

In `opencode.json`:

```json
{
  "permission": {
    "skill": {
      "my-skill": "allow",
      "internal-*": "deny",
      "experimental-*": "ask"
    }
  }
}
```

| Permission | Behavior |
|------------|----------|
| `allow` | Loads immediately |
| `deny` | Hidden from agent |
| `ask` | User prompted |

---

## Quick Diagnostic Flow

```
Skill not working?
    │
    ├─→ Not appearing in /skills?
    │   └─→ Check: SKILL.md filename, frontmatter, name format
    │
    ├─→ Appears but not triggering?
    │   └─→ Check: Description specificity, task complexity
    │
    ├─→ Triggers but wrong output?
    │   └─→ Check: Instructions clarity, gotchas documented
    │
    └─→ Output same as baseline?
        └─→ Check: Is skill needed? Add unique value
```

---

## External Resources

- **AgentSkills Spec**: https://agentskills.io/specification
- **OpenCode Docs**: https://opencode.ai/docs/skills/
