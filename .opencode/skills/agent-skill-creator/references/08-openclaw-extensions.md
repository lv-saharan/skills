# OpenClaw Platform Extensions

Platform-specific features for OpenClaw-compatible environments.

---

## Overview

OpenClaw extends the AgentSkills specification with additional frontmatter fields and metadata. These extensions enable:

- **Gating**: Filter skills at load time based on environment
- **Installers**: Define how to install required tools
- **Slash Commands**: Expose skills as user-invocable commands
- **Multi-Agent**: Support shared vs. workspace-specific skills

**Important**: These extensions are OpenClaw-specific. Skills using them remain compatible with other AgentSkills implementations (extensions are ignored).

---

## Skill Locations and Priority

OpenClaw loads skills from multiple locations:

| Priority | Location | Scope |
|----------|----------|-------|
| 1 (highest) | `<workspace>/skills/<name>/SKILL.md` | Project/workspace |
| 2 | `~/.openclaw/skills/<name>/SKILL.md` | User (all workspaces) |
| 3 | Built-in skills (bundled with installation) | System |

**Name conflicts**: Higher priority location wins.

### Multi-Agent Setup

In multi-agent environments:

- **Single-agent skills**: Place in `<workspace>/skills/` — only that agent sees them
- **Shared skills**: Place in `~/.openclaw/skills/` — all agents on the machine see them
- **Extra directories**: Configure via `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "load": {
      "extraDirs": ["/path/to/shared/skills"]
    }
  }
}
```

---

## Gating (Load-Time Filtering)

Skills can be conditionally loaded based on environment requirements.

### metadata.openclaw.requires

```yaml
---
name: my-skill
description: Process data using external tools.
metadata:
  {
    "openclaw":
      {
        "requires":
          {
            "bins": ["uv", "python"],
            "env": ["API_KEY"],
            "config": ["feature.enabled"]
          }
      }
  }
---
```

| Field | Type | Meaning |
|-------|------|---------|
| `bins` | string[] | Binary must exist in PATH |
| `anyBins` | string[] | At least one binary must exist |
| `env` | string[] | Environment variable must be set (or provided in config) |
| `config` | string[] | Config path in `openclaw.json` must be truthy |

### always: Skip All Gating

```yaml
metadata:
  { "openclaw": { "always": true } }
```

When set, skill always loads regardless of other gating conditions.

### os: Platform Restriction

```yaml
metadata:
  { "openclaw": { "os": ["darwin", "linux"] } }
```

Valid values: `darwin`, `linux`, `win32`. Skill only loads on matching platforms.

---

## Installers

Define how users can install required tools.

### Installer Types

| Kind | Example |
|------|---------|
| `brew` | Homebrew package |
| `node` | npm package |
| `go` | Go package |
| `uv` | Python package via uv |
| `download` | Direct download |

### Example

```yaml
---
name: gemini
description: Use Gemini CLI for coding assistance.
metadata:
  {
    "openclaw":
      {
        "emoji": "♊️",
        "requires": { "bins": ["gemini"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gemini-cli",
              "bins": ["gemini"],
              "label": "Install Gemini CLI (brew)"
            },
            {
              "id": "npm",
              "kind": "node",
              "package": "@anthropic/gemini-cli",
              "bins": ["gemini"],
              "label": "Install Gemini CLI (npm)"
            }
          ]
      }
  }
---
```

### Installer Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier for this installer |
| `kind` | Yes | `brew`, `node`, `go`, `uv`, `download` |
| `label` | No | Display text for UI |
| `bins` | No | Binaries this installer provides |
| `os` | No | Platform filter: `["darwin"]`, `["linux"]`, etc. |

### Download Installer

```yaml
install:
  - id: "download-linux"
    kind: "download"
    url: "https://example.com/tool-linux.tar.gz"
    archive: "tar.gz"
    targetDir: "~/.openclaw/tools/my-tool"
```

---

## Primary Environment Variable

Associate an API key with the skill:

```yaml
metadata:
  { "openclaw": { "primaryEnv": "GEMINI_API_KEY" } }
```

Users can then configure in `openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "gemini": {
        "apiKey": "your-key-here"
      }
    }
  }
}
```

The `apiKey` value is injected as `GEMINI_API_KEY` during agent runs.

---

## Slash Commands (User-Invocable Skills)

### Basic User Invocation

```yaml
---
name: my-tool
description: A tool users can invoke directly.
user-invocable: true
---
```

When `user-invocable: true` (default), the skill appears as a slash command: `/my-tool`

### Disable Model Invocation

```yaml
user-invocable: true
disable-model-invocation: true
```

- Skill visible as slash command
- Skill NOT included in model's skill list (model can't auto-invoke)

### Direct Tool Dispatch

For skills that should execute immediately without model processing:

```yaml
---
name: deploy
description: Deploy to production.
user-invocable: true
command-dispatch: tool
command-tool: deploy_tool
command-arg-mode: raw
---
```

When user runs `/deploy staging`, the tool receives:

```json
{
  "command": "staging",
  "commandName": "deploy",
  "skillName": "deploy"
}
```

---

## UI Display

### Emoji

```yaml
metadata:
  { "openclaw": { "emoji": "🚀" } }
```

Displayed in OpenClaw's skill UI.

### Homepage

```yaml
---
name: my-skill
homepage: https://example.com/my-skill-docs
---
```

Or via metadata:

```yaml
metadata:
  { "openclaw": { "homepage": "https://example.com/docs" } }
```

---

## Configuration Override

Users can override skill settings in `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "my-skill": {
        "enabled": true,
        "apiKey": "SECRET_KEY",
        "env": {
          "API_ENDPOINT": "https://custom.endpoint"
        },
        "config": {
          "timeout": 30000
        }
      }
    }
  }
}
```

| Field | Purpose |
|-------|---------|
| `enabled` | Enable/disable the skill |
| `apiKey` | Value for `primaryEnv` variable |
| `env` | Environment variables to inject |
| `config` | Custom configuration values |

---

## Sandbox Considerations

When running agents in sandboxed containers:

- **Binary requirements**: Tools specified in `requires.bins` must exist in BOTH host AND container
- **Install in container**: Use `agents.defaults.sandbox.docker.setupCommand` to install tools
- **Network access**: Required for installers that download packages
- **Root/writable**: Needed for package installation in container

Example sandbox setup:

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "docker": {
          "setupCommand": "apt-get update && apt-get install -y python3 uv"
        }
      }
    }
  }
}
```

---

## Permission Control

Control skill loading via permissions:

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

| Value | Behavior |
|-------|----------|
| `allow` | Load immediately |
| `deny` | Hide from agent |
| `ask` | Prompt user for permission |

---

## Plugin Skills

Plugins can bundle skills via `openclaw.plugin.json`:

```json
{
  "skills": ["skills/my-plugin-skill"]
}
```

Plugin skills follow the same priority rules as other skills.

---

## Session Snapshots

OpenClaw takes a snapshot of eligible skills at session start. Changes to skills or configuration take effect in the next session.

**Hot reload**: Enable skill watching for automatic refresh:

```json
{
  "skills": {
    "load": {
      "watch": true,
      "watchDebounceMs": 250
    }
  }
}
```

---

## External Resources

- **OpenClaw Skills Docs**: https://docs.openclaw.ai/zh-CN/tools/skills
- **OpenClaw Configuration**: https://docs.openclaw.ai/tools/skills-config
- **ClawHub Registry**: https://clawhub.com