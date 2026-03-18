# Description Builder

Generate effective skill descriptions using a structured template.

---

## Input Worksheet

Fill in the blanks:

### 1. Core Capability
What does this skill do? (one sentence)

```
[_________________________________________________________________]
```

### 2. User Contexts
When would a user need this? (list 3-5 scenarios)

```
1. [____________________________________________________________]
2. [____________________________________________________________]
3. [____________________________________________________________]
4. [____________________________________________________________]
5. [____________________________________________________________]
```

### 3. Keywords
What words might users say? (list 5-10)

```
[_______________________________________________________________]
```

### 4. File Types
What file types are involved? (include extensions)

```
[_______________________________________________________________]
```

### 5. Actions
What actions does the skill perform?

```
[_______________________________________________________________]
```

---

## Assembly Template

Combine your answers:

```
[Core Capability from #1]. Use when [contexts from #2], or when 
the user mentions [keywords from #3], [file types from #4], or 
needs to [actions from #5].
```

---

## Examples

### Example 1: CSV Analyzer

**Inputs:**
- Core: Analyzes CSV files and generates insights
- Contexts: User has sales data, needs summary stats, wants charts
- Keywords: csv, spreadsheet, data, analyze, chart, statistics
- Files: .csv, .tsv, .xlsx
- Actions: compute statistics, generate charts, clean data

**Output:**
```yaml
description: |
  Analyzes CSV and tabular data files — compute summary statistics,
  add derived columns, generate charts, and clean messy data. Use
  this skill when the user has a CSV, TSV, or Excel file and wants
  to explore, transform, or visualize the data, even if they don't
  explicitly mention "CSV" or "analysis."
```

### Example 2: PDF Processor

**Inputs:**
- Core: Extracts and processes PDF content
- Contexts: User has invoices, needs text extraction, filling forms
- Keywords: pdf, document, extract, form, merge, split
- Files: .pdf
- Actions: extract text, fill forms, merge documents

**Output:**
```yaml
description: |
  Extracts text and tables from PDF files, fills PDF forms, and
  merges multiple PDFs. Use when working with PDF documents or
  when the user mentions PDFs, forms, document extraction, or
  needs to process .pdf files.
```

---

## Validation Checklist

After writing:

- [ ] Under 1024 characters
- [ ] Includes what skill does
- [ ] Includes when to use it
- [ ] Includes specific keywords
- [ ] Uses imperative phrasing ("Use when...")
- [ ] Mentions file types if applicable
- [ ] Pushy enough (lists implicit contexts)

---

## Test Your Description

Create 5 quick test queries:

| Query | Should Trigger? |
|-------|-----------------|
| [Query 1] | Yes / No |
| [Query 2] | Yes / No |
| [Query 3] | Yes / No |
| [Query 4] | Yes / No |
| [Query 5] | Yes / No |

If any feel ambiguous, revise description.
