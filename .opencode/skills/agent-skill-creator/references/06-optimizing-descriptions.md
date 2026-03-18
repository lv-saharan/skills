# Optimizing Skill Descriptions

Improve your skill's description to trigger reliably on relevant prompts.

---

## How Triggering Works

1. Agent loads only `name` + `description` of each skill at startup
2. When task matches description, full `SKILL.md` loads
3. Agent follows instructions

**The description carries the entire burden of triggering.**

**Note:** Agents only consult skills for tasks beyond basic capabilities. Simple requests may not trigger even with matching description.

---

## Writing Effective Descriptions

### Formula

```
[Core capability]. Use when [specific contexts], [user phrases], [file types], or [actions].
```

### Principles

- **Imperative phrasing:** "Use this skill when..." not "This skill does..."
- **Focus on user intent:** What user is trying to achieve
- **Err on being pushy:** List contexts including implicit mentions
- **Keep concise:** A few sentences to short paragraph (max 1024 chars)

### Example

```yaml
# Before
description: Process CSV files.

# After
description: |
  Analyze CSV and tabular data files — compute summary statistics,
  add derived columns, generate charts, and clean messy data. Use
  this skill when user has CSV, TSV, or Excel file and wants to
  explore, transform, or visualize data, even if they don't
  explicitly mention "CSV" or "analysis."
```

---

## Designing Trigger Eval Queries

Create ~20 queries: 8-10 should-trigger, 8-10 should-not-trigger.

```json
[
  {
    "query": "I've got a spreadsheet in ~/data/q4_results.xlsx with revenue in col C — can you add profit margin column?",
    "should_trigger": true
  },
  {
    "query": "whats the quickest way to convert this json file to yaml",
    "should_trigger": false
  }
]
```

### Should-Trigger Queries

Vary along multiple axes:

| Axis | Examples |
|------|----------|
| **Phrasing** | Formal, casual, typos, abbreviations |
| **Explicitness** | "analyze this CSV" vs "my boss wants a chart" |
| **Detail** | Terse vs context-heavy |
| **Complexity** | Single-step vs multi-step |

**Most useful:** Cases where skill would help but connection isn't obvious.

### Should-Not-Trigger Queries

Test **near-misses** — share keywords but need different capability:

```json
// Strong negative (shares concepts, different task)
{"query": "I need to update formulas in my Excel budget spreadsheet", "should_trigger": false}
{"query": "write a python script that reads csv and uploads to postgres", "should_trigger": false}

// Weak negative (obviously irrelevant)
{"query": "Write a fibonacci function", "should_trigger": false}
```

---

## Testing Trigger Behavior

### Basic Approach

1. Run each query through agent with skill installed
2. Observe whether agent invokes skill
3. Query "passes" if:
   - `should_trigger: true` AND skill invoked, OR
   - `should_trigger: false` AND skill NOT invoked

### Run Multiple Times

Model behavior is nondeterministic. Run each 3x, compute **trigger rate**:

```
trigger_rate = triggers / runs
```

**Pass threshold:**
- Should-trigger: trigger_rate > 0.5
- Should-not-trigger: trigger_rate < 0.5

---

## The Optimization Loop

### 1. Split Queries

- **Train set (~60%)**: Guide improvements
- **Validation set (~40%)**: Check generalization

Both sets should have proportional mix of should/should-not-trigger.

### 2. Evaluate

Run current description against both sets.

### 3. Identify Failures (Train Set Only)

- Which should-trigger queries didn't trigger?
- Which should-not-trigger queries did?

### 4. Revise Description

| Problem | Solution |
|---------|----------|
| Should-trigger failing | Broaden scope, add context |
| Should-not-trigger false-positive | Add specificity, clarify boundaries |
| **Avoid:** Adding specific keywords from failures (overfitting) |

### 5. Repeat

Until train passes or no improvement.

### 6. Select Best

By **validation pass rate** (not train).

**Five iterations** is usually enough.

---

## Applying the Result

1. Update `description` in `SKILL.md`
2. Verify under 1024 characters
3. Sanity check with fresh queries (5-10, never seen during optimization)

---

## External Resources

- **Optimizing Descriptions**: https://agentskills.io/skill-creation/optimizing-descriptions
- **skill-creator**: https://github.com/anthropics/skills/tree/main/skills/skill-creator
