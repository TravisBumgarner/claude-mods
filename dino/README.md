# dino

An ASCII take on Chrome's offline dino game that runs in a band above the Claude Code
prompt while Claude works on something long. The plugin is named `dino-break`.

```
HI 00412  00087   Claude is working...
      .--.
     (____)
    __
   / o)
__/ /         \|/
  /\           |
_____._______._______._______.
Space/Up: jump   P: pause   X: close
```

## Load it

Mods need Claude Code v2.1.287 or later (`claude --version`).

For one session:

```bash
claude --plugin-dir ~/Programming/mods/dino
```

For every session, add the folder to the `env` block of `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "~/Programming/mods/dino"
  }
}
```

To load several mods, separate their paths with `:`. Interactive sessions watch the folder,
so edits reload when you save.

Run `/plugin` to check it loaded: the dim line under the tabs should name `dino-break`.

## Play

| Key | Does |
| --- | --- |
| click the game | gives it the keyboard (Esc hands it back to the prompt) |
| `D` | start, or resume a paused run after a 3-2-1 countdown |
| `Space` / `Up` / `W` | jump |
| `P` | pause and save the score |
| `X` | save and close |

`/dino` opens or closes the game by hand.

## How it opens on its own

The mod gives Claude a `start_break` tool and adds a line to the system prompt telling Claude
to call it first when a task looks like it'll take more than about a minute. When Claude
finishes the turn, the game pauses, saves your run, and shows a toast.

This depends on Claude guessing the task length, so it won't fire every time. `/dino` always
works.

## Scores

Saved in the mod's own store under `~/.claude` (not in this repo):

- `best`: high score
- `scores`: last 50 runs
- `saved`: the paused run, which comes back as "Press D to resume" in the next session

## Files

| File | What |
| --- | --- |
| `.claude-plugin/plugin.json` | manifest |
| `hooks/hooks.json` | points at `register.tsx` |
| `hooks/register.tsx` | `start_break` tool, `/dino`, the band, saving scores |
| `hooks/game.tsx` | the game: keys, physics, drawing (runs as a `Client` surface module) |
| `types/index.d.ts` | state contract |
| `tests/dino.test.tsx` | start, pause, resume |

## Develop

```bash
claude plugin validate ~/Programming/mods/dino
claude plugin test ~/Programming/mods/dino
```

After the mod loads once, Claude Code writes its types into `.claude-plugin/types/` and a
`tsconfig.json`, and `tsc -p .` type-checks it. Both are generated and gitignored.

`claude plugin test` refused to run while this was written ("hooks modules are turned off in
this process"), so the test is type-checked but hasn't run yet.
