---
name: roll-dice
description: Roll dice with true randomness. Use when asked to roll a die (d6, d20, etc.), roll dice, or generate random dice rolls for games or simulations.
license: MIT
---

# Roll Dice

Roll dice using true randomness from system entropy.

## When to Use

- User asks to "roll a d20", "roll 2d6", etc.
- User needs random numbers for games (D&D, board games)
- User needs random dice rolls for simulations

## How to Roll

### Bash (Linux/macOS)

```bash
# Single die: shuf -i 1-<sides> -n 1
shuf -i 1-20 -n 1    # Roll d20
shuf -i 1-6 -n 1     # Roll d6
```

### PowerShell (Windows)

```powershell
# Single die: Get-Random -Minimum 1 -Maximum (<sides> + 1)
Get-Random -Minimum 1 -Maximum 21   # Roll d20
Get-Random -Minimum 1 -Maximum 7    # Roll d6
```

### Python (Cross-platform)

```python
import secrets
result = secrets.randbelow(20) + 1  # Roll d20
```

## Notation

- `dX` = one die with X sides (e.g., d20 = 20-sided die)
- `NdX` = roll N dice with X sides (e.g., 2d6 = roll two 6-sided dice)
- `NdX+Y` = roll N dice with X sides, add Y modifier (e.g., 1d20+5)

## Examples

**User:** "Roll a d20"
**Response:** "You rolled a 17 on a d20."

**User:** "Roll 2d6"
**Response:** "You rolled 2d6: 4 + 3 = 7"

**User:** "I need a random number between 1 and 100"
**Response:** "Your random number is 73."
