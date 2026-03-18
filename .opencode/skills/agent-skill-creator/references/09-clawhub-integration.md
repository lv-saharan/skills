# ClawHub Integration Guide

Publish, discover, and manage skills via the ClawHub registry.

---

## What is ClawHub?

ClawHub is the public skill registry for OpenClaw. It enables:

- **Discovery**: Browse available skills at https://clawhub.com
- **Installation**: Install skills to your workspace with one command
- **Updates**: Keep skills up-to-date automatically
- **Publishing**: Share your skills with the community

---

## Installing Skills

### Install to Workspace

```bash
clawhub install <skill-slug>
```

Installs to `./skills/` (or configured workspace directory). OpenClaw recognizes these as workspace skills in the next session.

### Install to User Directory

```bash
clawhub install --global <skill-slug>
```

Installs to `~/.openclaw/skills/` — available across all your workspaces.

### Install Specific Version

```bash
clawhub install <skill-slug>@1.2.0
```

---

## Updating Skills

### Update All Installed Skills

```bash
clawhub update --all
```

### Update Specific Skill

```bash
clawhub update <skill-slug>
```

### Check for Updates

```bash
clawhub outdated
```

Lists skills with available updates.

---

## Syncing (Publishing)

### Prerequisites

1. Account on https://clawhub.com
2. Authenticated CLI:

```bash
clawhub login
```

### Publish a Skill

```bash
clawhub publish ./my-skill
```

### Sync All Skills in Directory

```bash
clawhub sync --all
```

Scans current directory for skills, publishes updates for any that have changed.

### Skill Manifest

Create a `skill.json` for richer metadata:

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "Brief description for registry listing",
  "author": "your-name",
  "tags": ["productivity", "automation"],
  "homepage": "https://example.com/my-skill"
}
```

---

## Skill Discovery

### CLI Search

```bash
clawhub search <query>
```

### Browse Web

Visit https://clawhub.com to:
- Browse categories
- Read skill documentation
- See installation counts
- Check compatibility

---

## Private Skills

ClawHub supports private skills for teams:

```bash
# Install from private namespace
clawhub install @my-org/private-skill

# Publish to private namespace
clawhub publish --scope @my-org ./my-skill
```

Private skills require authentication and appropriate permissions.

---

## Version Management

### Semantic Versioning

Skills should follow semver:

```
MAJOR.MINOR.PATCH

- MAJOR: Breaking changes
- MINOR: New features, backward compatible
- PATCH: Bug fixes
```

### Version Constraints

Users can specify version constraints:

```bash
# Exact version
clawhub install my-skill@1.2.0

# Version range
clawhub install my-skill@^1.2.0
```

---

## Skill Dependencies

Declare dependencies in `skill.json`:

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "dependencies": {
    "utils-helper": "^2.0.0"
  }
}
```

ClawHub installs dependencies automatically.

---

## Best Practices

### Publishing

1. **Test thoroughly** before publishing
2. **Document clearly** in SKILL.md
3. **Use semantic versioning** for updates
4. **Include examples** in `assets/examples/`
5. **Write good descriptions** for discovery

### Skill Manifest

Always include a `skill.json`:

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "Clear, searchable description",
  "author": "your-name",
  "license": "MIT",
  "repository": "https://github.com/user/my-skill",
  "keywords": ["keyword1", "keyword2"],
  "openclaw": {
    "minVersion": "1.0.0"
  }
}
```

### README

Include a `README.md` for ClawHub listing:

```markdown
# My Skill

Brief description of what this skill does.

## Installation

\`\`\`bash
clawhub install my-skill
\`\`\`

## Usage

Examples and usage instructions.

## Configuration

Required environment variables, configuration options.

## License

MIT
```

---

## Migration from Other Platforms

### From npm

```bash
# If skill was published as npm package
clawhub install npm:my-skill-package
```

### From GitHub

```bash
# Install directly from repo
clawhub install github:user/repo
```

---

## Troubleshooting

### Skill Not Found

```bash
# Check exact slug
clawhub search my-skill

# Verify namespace for private skills
clawhub install @org/skill-name
```

### Authentication Failed

```bash
# Re-authenticate
clawhub logout
clawhub login
```

### Version Conflict

```bash
# Check installed versions
clawhub list

# Force specific version
clawhub install my-skill@1.0.0 --force
```

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `clawhub install <slug>` | Install skill to workspace |
| `clawhub install --global <slug>` | Install to user directory |
| `clawhub update --all` | Update all installed skills |
| `clawhub update <slug>` | Update specific skill |
| `clawhub outdated` | List skills with updates |
| `clawhub list` | List installed skills |
| `clawhub search <query>` | Search registry |
| `clawhub publish <path>` | Publish skill |
| `clawhub sync --all` | Sync all skills in directory |
| `clawhub login` | Authenticate |
| `clawhub logout` | Remove authentication |
| `clawhub info <slug>` | Show skill details |

---

## External Resources

- **ClawHub Website**: https://clawhub.com
- **OpenClaw Skills Docs**: https://docs.openclaw.ai/zh-CN/tools/skills
- **ClawHub CLI Docs**: https://docs.openclaw.ai/tools/clawhub