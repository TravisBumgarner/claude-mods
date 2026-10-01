# claude-mods

Claude Code mods: plugins of function hooks that add panes, bands, commands and tool rules
inside Claude Code. One folder per mod. Mods need Claude Code v2.1.287 or later.

| Mod | What it does |
| --- | --- |
| [`dino`](dino/) | ASCII dino-run game above the prompt while Claude works; saves scores on pause |

## Load a mod

For one session:

```bash
claude --plugin-dir ~/Programming/mods/<name>
```

For every session, list the folders in the `env` block of `~/.claude/settings.json`,
separated by `:`:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "~/Programming/mods/dino"
  }
}
```

Run `/plugin` in a session to check: the dim line under the tabs names the active mods.

## Check a mod

```bash
claude plugin validate <name>   # what it hooks and calls, and anything the engine would refuse
claude plugin test <name>       # its *.test.ts files
```

Claude Code writes each mod's types into `.claude-plugin/types/` plus a `tsconfig.json` when it
loads the mod. Both are generated and gitignored; after one load, `tsc -p <name>` type-checks it.
