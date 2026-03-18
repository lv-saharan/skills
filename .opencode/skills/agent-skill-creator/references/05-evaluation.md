# Evaluating Skill Output Quality

Test whether your skill produces good outputs using eval-driven iteration.

---

## Designing Test Cases

Test cases have three parts:
- **Prompt**: Realistic user message
- **Expected output**: Description of success
- **Input files** (optional): Files skill needs

Store in `evals/evals.json`:

```json
{
  "skill_name": "csv-analyzer",
  "evals": [
    {
      "id": 1,
      "prompt": "I have sales data in data/sales_2025.csv. Find top 3 months by revenue and make a bar chart.",
      "expected_output": "Bar chart showing top 3 months with labeled axes.",
      "files": ["evals/files/sales_2025.csv"]
    }
  ]
}
```

### Tips for Test Prompts

- Start with 2-3 test cases
- Vary phrasings, detail levels, formality
- Cover edge cases
- Use realistic context (file paths, column names, backstory)

---

## Running Evals

### Workspace Structure

```
my-skill/
├── SKILL.md
└── evals/
    └── evals.json

my-skill-workspace/
└── iteration-1/
    ├── eval-test-1/
    │   ├── with_skill/
    │   │   ├── outputs/
    │   │   ├── timing.json
    │   │   └── grading.json
    │   └── without_skill/
    │       └── ...
    └── benchmark.json
```

### Spawn Runs

**With-skill:**
```
Execute this task:
- Skill path: /path/to/my-skill
- Task: [test prompt]
- Input files: [files]
- Save outputs to: workspace/iteration-1/eval-name/with_skill/outputs/
```

**Baseline:** Same prompt, no skill path.

### Capture Timing Data

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332
}
```

---

## Writing Assertions

Add after seeing first outputs.

### Good Assertions
- "The output file is valid JSON" — verifiable
- "The bar chart has labeled axes" — observable
- "The report includes at least 3 recommendations" — countable

### Weak Assertions
- "The output is good" — too vague
- "Uses exactly phrase X" — too brittle

```json
{
  "assertions": [
    "The output includes a bar chart image file",
    "The chart shows exactly 3 months",
    "Both axes are labeled",
    "The chart title mentions revenue"
  ]
}
```

---

## Grading Outputs

Evaluate each assertion, record PASS/FAIL with evidence:

```json
{
  "assertion_results": [
    {
      "text": "The output includes a bar chart image file",
      "passed": true,
      "evidence": "Found chart.png (45KB) in outputs/"
    },
    {
      "text": "Both axes are labeled",
      "passed": false,
      "evidence": "Y-axis labeled but X-axis has no label"
    }
  ],
  "summary": {
    "passed": 3,
    "failed": 1,
    "total": 4,
    "pass_rate": 0.75
  }
}
```

### Grading Principles

- Require concrete evidence for PASS
- Review assertions themselves (fix too easy/hard ones)

---

## Aggregating Results

Compute summary in `benchmark.json`:

```json
{
  "run_summary": {
    "with_skill": {
      "pass_rate": { "mean": 0.83, "stddev": 0.06 },
      "time_seconds": { "mean": 45.0, "stddev": 12.0 },
      "tokens": { "mean": 3800, "stddev": 400 }
    },
    "without_skill": {
      "pass_rate": { "mean": 0.33, "stddev": 0.10 },
      "time_seconds": { "mean": 32.0, "stddev": 8.0 },
      "tokens": { "mean": 2100, "stddev": 300 }
    },
    "delta": {
      "pass_rate": 0.50,
      "time_seconds": 13.0,
      "tokens": 1700
    }
  }
}
```

**Delta tells you:** What skill costs (time, tokens) vs what it buys (pass rate improvement).

---

## Analyzing Patterns

| Pattern | Action |
|---------|--------|
| Assertions always pass (both configs) | Remove — doesn't show skill value |
| Assertions always fail (both configs) | Fix assertion or test case |
| Passes with skill, fails without | Skill adding value — understand why |
| High stddev (inconsistent) | Tighten instructions, add examples |
| Time/token outliers | Read transcript, find bottleneck |

---

## Human Review

Record feedback in `feedback.json`:

```json
{
  "eval-top-months-chart": "Chart missing axis labels; months in alphabetical not chronological order.",
  "eval-clean-missing-emails": ""
}
```

Empty feedback = output looked fine.

---

## The Iteration Loop

1. Give eval signals + SKILL.md to LLM
2. Review and apply proposed changes
3. Rerun all tests in `iteration-<N+1>/`
4. Grade and aggregate
5. Review with human
6. Repeat

**Stop when:**
- Satisfied with results
- Feedback consistently empty
- No meaningful improvement

---

## External Resources

- **Evaluating Skills**: https://agentskills.io/skill-creation/evaluating-skills
- **skill-creator**: https://github.com/anthropics/skills/tree/main/skills/skill-creator
