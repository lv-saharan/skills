# AgentSkills Specification

Complete technical specification for SKILL.md files.

---

## Directory Structure

```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files
```

---

## SKILL.md Format

YAML frontmatter followed by Markdown content.

### Frontmatter Fields

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | Max 64 chars, lowercase alphanumeric + hyphens |
| `description` | Yes | Max 1024 chars, non-empty |
| `license` | No | License name or file reference |
| `compatibility` | No | Max 500 chars |
| `metadata` | No | String-to-string map |
| `allowed-tools` | No | Space-delimited list (experimental) |

---

## Field Specifications

### name

**Constraints:**
- 1-64 characters
- Unicode lowercase alphanumeric (a-z) and hyphens (-) only
- Must not start or end with hyphen
- Must not contain consecutive hyphens (--)
- Must match parent directory name

**Regex:** `^[a-z0-9]+(-[a-z0-9]+)*$`

```yaml
# Valid
name: pdf-processing
name: data-analysis
name: my-skill-v2

# Invalid
name: PDF-Processing    # uppercase
name: -pdf              # starts with hyphen
name: pdf--processing   # consecutive hyphens
name: pdf_processing    # underscore
```

### description

**Constraints:**
- 1-1024 characters
- Non-empty

**Purpose:** Primary triggering mechanism. Agents decide whether to use a skill based on this field.

**Best practices:**
- Describe both what the skill does AND when to use it
- Include specific keywords
- Use imperative phrasing: "Use this skill when..."
- Focus on user intent, not implementation

```yaml
# Good
description: |
  Extracts text and tables from PDF files, fills PDF forms, and merges
  multiple PDFs. Use when working with PDF documents or when the user
  mentions PDFs, forms, or document extraction.

# Poor
description: Helps with PDFs.
```

### license

```yaml
license: Apache-2.0
license: MIT
license: Proprietary. See LICENSE.txt for complete terms.
```

### compatibility

Indicates environment requirements:

```yaml
compatibility: Designed for Claude Code (or similar products)
compatibility: Requires git, docker, jq, and access to the internet
compatibility: opencode
```

### metadata

Arbitrary string-to-string mapping:

```yaml
metadata:
  author: example-org
  version: "1.0"
```

**Note on platform extensions**: Some platforms (like OpenClaw) support nested structures under a platform-specific key. For example, OpenClaw uses `metadata.openclaw` for gating, installers, and other platform features. These extensions are ignored by other AgentSkills implementations. See [08-openclaw-extensions.md](08-openclaw-extensions.md) for details.

### allowed-tools

Space-delimited list of pre-approved tools (experimental):

```yaml
allowed-tools: Bash(git:*) Bash(jq:*) Read
```

---

## Body Content

No format restrictions. Recommended sections:
- Step-by-step instructions
- Examples of inputs and outputs
- Common edge cases
- Gotchas specific to your environment

**Note:** Agent loads entire file when skill activates. Split longer content into referenced files.

---

## Optional Directories

### scripts/

Executable code agents can run. Should:
- Be self-contained or document dependencies
- Include helpful error messages
- Handle edge cases gracefully
- Support `--help` flag
- Avoid interactive prompts

### references/

Documentation loaded on demand:
- `REFERENCE.md` — Technical reference
- `FORMS.md` — Form templates, structured data
- Domain-specific files

**Keep files focused** — smaller files mean less context usage.

### assets/

Static resources:
- Templates (document, configuration)
- Images (diagrams, examples)
- Data files (lookup tables, schemas)

---

## Progressive Disclosure

| Stage | Content | Size | When Loaded |
|-------|---------|------|-------------|
| 1 | Metadata (name + description) | ~100 tokens | At startup, all skills |
| 2 | SKILL.md body | <5000 tokens | When activated |
| 3 | Resources | As needed | When referenced |

**Guidelines:**
- Keep `SKILL.md` under 500 lines
- Move detailed references to separate files
- Tell agent WHEN to load each file

---

## File References

Use relative paths from skill root:

```markdown
See [reference guide](references/REFERENCE.md) for details.

Run:
```bash
scripts/extract.py input.csv
```
```

**Keep references one level deep.** Avoid nested chains.

---

## Validation

### Using skills-ref

```bash
pip install skills-ref
skills-ref validate ./my-skill
skills-ref prompt ./my-skill
```

### Manual Checklist

- [ ] `name` matches directory name
- [ ] `name` matches `^[a-z0-9]+(-[a-z0-9]+)*$`
- [ ] `description` is 1-1024 characters with trigger keywords
- [ ] SKILL.md is under 500 lines
- [ ] File references are relative paths
- [ ] `metadata` follows spec (flat for standard, nested for platform extensions)
- [ ] No hardcoded credentials

---

## Token Budget

Approximate costs (~4 chars/token):

| Component | Size | Tokens |
|-----------|------|--------|
| Base overhead | 195 chars | ~50 |
| Per-skill entry | 97 chars + fields | ~25 + field length |

**Formula:** `total = 195 + Σ(97 + len(name) + len(description) + len(location))`

---

## Security Considerations

### Always Consider
- Skills can execute code via `scripts/`
- User input may reach instructions
- Don't include hardcoded credentials
- Validate inputs in scripts

### Avoid
- Destructive commands without safeguards
- Executing untrusted user input
- Exposing sensitive configuration
- Network requests without awareness

---

## Platform Extensions

The AgentSkills specification defines a baseline format. Individual platforms may extend it with additional features:

- **OpenClaw**: Gating, installers, slash commands, multi-agent support
- **OpenCode**: Compatibility field for environment targeting
- **Other platforms**: Check platform-specific documentation

Platform extensions are additive — skills using them remain compatible with standard AgentSkills implementations (extensions are ignored).

For OpenClaw-specific features, see [08-openclaw-extensions.md](08-openclaw-extensions.md).

---

## External Resources

- **Specification**: https://agentskills.io/specification
- **Validation Library**: https://github.com/agentskills/agentskills/tree/main/skills-ref
- **OpenClaw Skills Docs**: https://docs.openclaw.ai/zh-CN/tools/skills
- **ClawHub Registry**: https://clawhub.com
