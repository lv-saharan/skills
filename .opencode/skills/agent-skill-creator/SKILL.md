---
name: agent-skill-creator
description: Create, modify, and optimize AgentSkills-compatible skills with platform-specific support for OpenCode and OpenClaw. Use when users want to create a new skill from scratch, improve an existing skill, debug skill triggering issues, or understand the skill format. Covers core AgentSkills spec plus OpenClaw gating, ClawHub registry, and multi-agent patterns. Trigger on phrases like "create a skill", "make a skill", "write a skill", "skill development", "skill creator".
license: MIT
compatibility: opencode
---

# Agent Skill Creator

Guide for creating AgentSkills-compatible skills with systematic evaluation.

## Quick Start

### 1. Create Directory

```bash
mkdir -p .opencode/skills/my-skill
```

### 2. Write SKILL.md

```markdown
---
name: my-skill
description: What this skill does. Use when [context], [keywords], or [file types].
---

# My Skill

## When to Use
- User mentions [keywords]
- User works with [file types]

## Workflow
1. Step one
2. Step two
3. Step three
```

### 3. Test

```bash
/skills  # In OpenCode chat - verify skill appears
```

---

## Core Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Capture Expertise                                  │
│ → Extract from completed tasks or synthesize from artifacts │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Draft Skill                                        │
│ → Write frontmatter + instructions + gotchas                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Add Resources                                      │
│ → scripts/, references/, assets/ as needed                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Evaluate & Iterate                                 │
│ → Test cases → Assertions → Grade → Revise → Repeat         │
└─────────────────────────────────────────────────────────────┘
```

**Detailed guidance:** [references/03-development-workflow.md](references/03-development-workflow.md)

---

## Frontmatter Reference

| Field | Required | Constraints | Example |
|-------|----------|-------------|---------|
| `name` | Yes | 1-64 chars, `^[a-z0-9]+(-[a-z0-9]+)*$` | `pdf-processing` |
| `description` | Yes | 1-1024 chars, PRIMARY TRIGGER | See below |
| `license` | No | License name | `MIT` |
| `compatibility` | No | Max 500 chars | `opencode` |
| `metadata` | No | Flat string-to-string | `author: name` |

### Writing Effective Descriptions

**Formula:** `[Core capability]. Use when [contexts], [keywords], [file types].`

```yaml
# Good
description: |
  Analyzes CSV and tabular data files — compute summary statistics,
  add derived columns, generate charts. Use when user has CSV, TSV,
  or Excel file and wants to explore or transform data, even if
  they don't explicitly mention "CSV" or "analysis."

# Poor (too vague)
description: Process CSV files.
```

**Full specification:** [references/01-specification.md](references/01-specification.md)

---

## Progressive Disclosure

Skills load in three stages:

| Stage | Content | Size | When Loaded |
|-------|---------|------|-------------|
| 1 | name + description | ~100 tokens | Always |
| 2 | SKILL.md body | <500 lines | When triggered |
| 3 | references/ | Unlimited | On demand |

**Key principle:** Keep SKILL.md under 500 lines. Move details to `references/`.

---

## Instruction Patterns

| Pattern | Use When | Details |
|---------|----------|---------|
| **Gotchas** | Environment has non-obvious facts | List assumptions that defy reason |
| **Templates** | Specific output format needed | Provide exact template structure |
| **Checklists** | Multi-step workflow | Progress tracking with checkboxes |
| **Validation Loop** | Quality assurance needed | Do → Validate → Fix → Repeat |
| **Plan-Validate-Execute** | Destructive/batch operations | Create plan → Validate → Execute |

**Detailed patterns:** [references/02-best-practices.md](references/02-best-practices.md)

---

## Evaluation Workflow

### 1. Design Test Cases (2-3 to start)

```json
{
  "skill_name": "csv-analyzer",
  "evals": [{
    "id": 1,
    "prompt": "I have sales data in data/sales.csv. Find top 3 months and make a chart.",
    "expected_output": "Bar chart showing top 3 months by revenue with labeled axes.",
    "files": ["evals/files/sales.csv"]
  }]
}
```

### 2. Run With/Without Skill

Compare output quality and token/time cost against baseline.

### 3. Write Assertions

```json
{
  "assertions": [
    "The output includes a bar chart image file",
    "The chart shows exactly 3 months",
    "Both axes are labeled"
  ]
}
```

### 4. Iterate

Grade → Review → Revise → Repeat until satisfied.

**Full evaluation guide:** [references/05-evaluation.md](references/05-evaluation.md)

---

## Optimizing Descriptions

### Create Trigger Eval Queries (~20 total)

```json
[
  {
    "query": "I've got a spreadsheet in ~/data/q4_results.xlsx — can you add profit margin column?",
    "should_trigger": true
  },
  {
    "query": "whats the quickest way to convert this json to yaml",
    "should_trigger": false
  }
]
```

### The Loop

1. Split: 60% train, 40% validation
2. Evaluate (run each 3x for trigger rate)
3. Revise based on train failures only
4. Select best by validation pass rate

**Full optimization guide:** [references/06-optimizing-descriptions.md](references/06-optimizing-descriptions.md)

---

## Skill Locations (OpenCode)

| Priority | Location | Scope |
|----------|----------|-------|
| 1 | `.opencode/skills/<name>/SKILL.md` | Project |
| 2 | `~/.config/opencode/skills/<name>/SKILL.md` | Global |
| 3 | `.claude/skills/<name>/SKILL.md` | Project |
| 4 | `~/.claude/skills/<name>/SKILL.md` | Global |
| 5 | `.agents/skills/<name>/SKILL.md` | Project |
| 6 | `~/.agents/skills/<name>/SKILL.md` | Global |

**Project skills override global** with same name.

---

## Platform Extensions

The AgentSkills specification defines a baseline format. Platforms extend it with additional features:

### OpenClaw Extensions

- **Gating**: Filter skills at load time based on binaries, env vars, config
- **Installers**: Define how to install required tools
- **Slash Commands**: Expose skills as user-invocable commands
- **Multi-Agent**: Support for workspace vs. shared skills
- **ClawHub**: Public skill registry for discovery and publishing

**Detailed guide:** [references/08-openclaw-extensions.md](references/08-openclaw-extensions.md)

### ClawHub Registry

- **Discover**: Browse skills at https://clawhub.com
- **Install**: `clawhub install <skill-slug>`
- **Publish**: `clawhub publish ./my-skill`

**Integration guide:** [references/09-clawhub-integration.md](references/09-clawhub-integration.md)

---

## Validation Checklist

Before finalizing:

- [ ] `name` matches directory name
- [ ] `name` matches `^[a-z0-9]+(-[a-z0-9]+)*$`
- [ ] `description` is 1-1024 chars with trigger keywords
- [ ] SKILL.md is under 500 lines
- [ ] File references are relative paths
- [ ] `metadata` follows spec (flat for standard, nested for platform extensions)
- [ ] No hardcoded secrets
- [ ] (OpenClaw) Gating properly configured if environment requirements exist
- [ ] (OpenClaw) Installers specified if external tools needed
- [ ] (OpenClaw) `primaryEnv` set if API key required

**Validate with:** `skills-ref validate ./my-skill`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Skill not triggering | Enhance description with specific keywords; ensure task is complex enough |
| Skill not loading | Verify `SKILL.md` filename (all caps); check frontmatter has required fields |
| False triggers | Add specificity to description; clarify boundaries |
| Skill adds no value | Remove instructions the agent handles fine alone; keep skill lean |

**Full troubleshooting:** [references/07-troubleshooting.md](references/07-troubleshooting.md)

---

## Reference Files

| File | Purpose |
|------|---------|
| [01-specification.md](references/01-specification.md) | Complete technical specification |
| [02-best-practices.md](references/02-best-practices.md) | Authoring best practices |
| [03-development-workflow.md](references/03-development-workflow.md) | Step-by-step development guide |
| [04-using-scripts.md](references/04-using-scripts.md) | Script bundling guide |
| [05-evaluation.md](references/05-evaluation.md) | Evaluation workflow |
| [06-optimizing-descriptions.md](references/06-optimizing-descriptions.md) | Description optimization |
| [07-troubleshooting.md](references/07-troubleshooting.md) | Troubleshooting guide |
| [08-openclaw-extensions.md](references/08-openclaw-extensions.md) | OpenClaw platform features |
| [09-clawhub-integration.md](references/09-clawhub-integration.md) | ClawHub registry guide |

## Templates & Examples

| Resource | Purpose |
|----------|---------|
| [assets/templates.md](assets/templates.md) | Quick-start templates |
| [assets/examples/roll-dice/](assets/examples/roll-dice/) | Complete example skill |
| [assets/description-builder.md](assets/description-builder.md) | Description generator |

---

## External Resources

- **AgentSkills Spec**: https://agentskills.io/specification
- **OpenCode Docs**: https://opencode.ai/docs/skills/
- **OpenClaw Docs**: https://docs.openclaw.ai/zh-CN/tools/skills
- **ClawHub Registry**: https://clawhub.com
- **Example Skills**: https://github.com/anthropics/skills
- **Validation Library**: https://github.com/agentskills/agentskills/tree/main/skills-ref
