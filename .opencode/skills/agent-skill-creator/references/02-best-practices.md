# Best Practices for Skill Creators

How to write well-scoped, effective skills.

---

## Start from Real Expertise

**Common pitfall:** Asking LLM to generate skill without domain-specific context → vague, generic procedures.

### Extract from Completed Tasks

After completing a task with an agent, extract:
- **Steps that worked** — sequence leading to success
- **Corrections you made** — where you steered approach
- **Input/output formats** — what data looked like
- **Context you provided** — project-specific facts agent didn't know

### Synthesize from Artifacts

Use project-specific material:
- Internal documentation, runbooks, style guides
- API specifications, schemas, configuration files
- Code review comments, issue trackers
- Version control history (especially fixes)
- Real failure cases and resolutions

**Key:** Project-specific material, not generic references.

---

## Refine with Real Execution

First draft usually needs refinement. Run skill against real tasks, feed results back.

<Tip>
  Read agent execution traces, not just final outputs. If agent wastes time:
  - Instructions may be too vague
  - Instructions may not apply to current task
  - Too many options without clear default
</Tip>

---

## Spending Context Wisely

Every token in SKILL.md competes for agent's attention.

### Add What Agent Lacks, Omit What It Knows

Focus on what agent *wouldn't* know:
- Project-specific conventions
- Domain-specific procedures
- Non-obvious edge cases
- Particular tools/APIs

Don't explain basics (what PDF is, how HTTP works).

```markdown
<!-- Too verbose -->
## Extract PDF text
PDF (Portable Document Format) files contain text, images, and other content...

<!-- Better -->
## Extract PDF text
Use pdfplumber for text extraction. For scanned documents, fall back to
pdf2image with pytesseract.
```

**Ask:** "Would agent get this wrong without this instruction?"

### Design Coherent Units

Like functions, skills should encapsulate coherent work:
- **Too narrow:** Multiple skills load for single task
- **Too broad:** Hard to activate precisely
- **Just right:** Single coherent unit

### Structure with Progressive Disclosure

- Keep `SKILL.md` under 500 lines
- Move details to `references/`
- Tell agent WHEN to load each file

---

## Calibrating Control

### Give Freedom When...

Multiple approaches valid, task tolerates variation:

```markdown
## Code review process
1. Check database queries for SQL injection
2. Verify authentication on every endpoint
3. Look for race conditions in concurrent code paths
```

### Be Prescriptive When...

Consistency matters, specific sequence required:

```markdown
## Database migration
Run exactly this sequence:
```bash
python scripts/migrate.py --verify --backup
```
Do not modify the command or add flags.
```

### Provide Defaults, Not Menus

```markdown
<!-- Too many options -->
You can use pypdf, pdfplumber, PyMuPDF, or pdf2image...

<!-- Clear default -->
Use pdfplumber for text extraction:
```python
import pdfplumber
```
For scanned PDFs requiring OCR, use pdf2image instead.
```

---

## Instruction Patterns

### Gotchas Sections

Highest-value content: environment-specific facts defying assumptions.

```markdown
## Gotchas

- The `users` table uses soft deletes. Include
  `WHERE deleted_at IS NULL` or results include deactivated accounts.
- User ID is `user_id` in database, `uid` in auth, `accountId` in billing.
- `/health` returns 200 if web server runs, even if database is down.
  Use `/ready` to check full health.
```

### Templates for Output

```markdown
## Report Structure

Use this template:
```markdown
# [Analysis Title]

## Executive Summary
[One-paragraph overview]

## Key Findings
- Finding 1
- Finding 2

## Recommendations
1. Recommendation 1
2. Recommendation 2
```
```

### Checklists

```markdown
## Form Processing Workflow

Progress:
- [ ] Step 1: Analyze form (`scripts/analyze_form.py`)
- [ ] Step 2: Create field mapping (edit `fields.json`)
- [ ] Step 3: Validate (`scripts/validate_fields.py`)
- [ ] Step 4: Fill form (`scripts/fill_form.py`)
- [ ] Step 5: Verify (`scripts/verify_output.py`)
```

### Validation Loops

```markdown
## Editing Workflow

1. Make edits
2. Run validation: `python scripts/validate.py output/`
3. If validation fails:
   - Review error message
   - Fix issues
   - Run again
4. Only proceed when validation passes
```

### Plan-Validate-Execute

For batch/destructive operations:

```markdown
## PDF Form Filling

1. Extract fields: `python scripts/analyze_form.py input.pdf` → `form_fields.json`
2. Create `field_values.json` mapping fields to values
3. Validate: `python scripts/validate_fields.py form_fields.json field_values.json`
4. If validation fails, revise and re-validate
5. Fill: `python scripts/fill_form.py input.pdf field_values.json output.pdf`
```

---

## Bundling Reusable Scripts

When iterating, if agent independently writes similar helper scripts across test cases → bundle in `scripts/`.

See [04-using-scripts.md](04-using-scripts.md) for script design.

---

## Checklist Before Publishing

- [ ] Skill grounded in real expertise
- [ ] Instructions focus on what agent lacks
- [ ] Coherent unit of work
- [ ] Specificity calibrated to task fragility
- [ ] Defaults provided, not menus
- [ ] Gotchas documented
- [ ] Output templates included where needed
- [ ] Validation loops for quality
- [ ] Scripts bundled for repeated work
- [ ] SKILL.md under 500 lines

---

## External Resources

- **Best Practices**: https://agentskills.io/skill-creation/best-practices
- **Example Skills**: https://github.com/anthropics/skills
