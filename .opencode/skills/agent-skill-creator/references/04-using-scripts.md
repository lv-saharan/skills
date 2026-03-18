# Using Scripts in Skills

How to run commands and bundle executable scripts.

---

## One-Off Commands

Reference existing packages directly:

### uvx (Python)
```bash
uvx ruff@0.8.0 check .
uvx black@24.10.0 .
```

### npx (Node.js)
```bash
npx eslint@9 --fix .
npx create-vite@6 my-app
```

### go run (Go)
```bash
go run golang.org/x/tools/cmd/goimports@v0.28.0 .
```

**Tips:**
- Pin versions for reproducibility
- State prerequisites in SKILL.md
- Move complex commands to scripts

---

## Referencing Scripts

Use relative paths from skill root:

```markdown
## Available Scripts

- `scripts/validate.sh` — Validates config files
- `scripts/process.py` — Processes input data

## Workflow

1. Run validation:
   ```bash
   bash scripts/validate.sh "$INPUT_FILE"
   ```
```

---

## Self-Contained Scripts

### Python (PEP 723)

```python
# scripts/extract.py
# /// script
# dependencies = ["beautifulsoup4"]
# ///

from bs4 import BeautifulSoup
# ...
```

```bash
uv run scripts/extract.py
```

### Deno

```typescript
#!/usr/bin/env -S deno run

import * as cheerio from "npm:cheerio@1.0.0";
// ...
```

```bash
deno run scripts/extract.ts
```

### Bun

```typescript
#!/usr/bin/env bun

import * as cheerio from "cheerio@1.0.0";
// ...
```

```bash
bun run scripts/extract.ts
```

### Ruby

```ruby
require 'bundler/inline'

gemfile do
  source 'https://rubygems.org'
  gem 'nokogiri'
end
# ...
```

```bash
ruby scripts/extract.rb
```

---

## Designing for Agentic Use

### Avoid Interactive Prompts (Required)

Agents run in non-interactive shells. Accept input via:
- Command-line flags
- Environment variables
- Stdin

```bash
# Bad: hangs waiting
$ python scripts/deploy.py
Target environment: _

# Good: clear error
$ python scripts/deploy.py
Error: --env is required. Options: development, staging, production.
```

### Document with --help

```
Usage: scripts/process.py [OPTIONS] INPUT_FILE

Process input data and produce summary report.

Options:
  --format FORMAT    Output: json, csv, table (default: json)
  --output FILE      Write to FILE instead of stdout
  --verbose          Print progress to stderr

Examples:
  scripts/process.py data.csv
  scripts/process.py --format csv --output report.csv data.csv
```

### Write Helpful Errors

```
Error: --format must be one of: json, csv, table.
       Received: "xml"
```

### Use Structured Output

Prefer JSON/CSV/TSV over free-form text:

```json
{"name": "my-service", "status": "running", "created": "2025-01-15"}
```

**Separate data from diagnostics:**
- stdout → structured data
- stderr → progress, warnings

---

## Further Considerations

| Consideration | Why |
|---------------|-----|
| **Idempotency** | Agents may retry. "Create if not exists" > fail on duplicate |
| **Input constraints** | Reject ambiguous input with clear error |
| **Dry-run support** | `--dry-run` for destructive operations |
| **Exit codes** | Distinct codes for different failures |
| **Safe defaults** | Require `--confirm` for destructive ops |
| **Output size** | Support `--offset` or require `--output` for large output |

---

## External Resources

- **Using Scripts**: https://agentskills.io/skill-creation/using-scripts
- **PEP 723**: https://peps.python.org/pep-0723/
