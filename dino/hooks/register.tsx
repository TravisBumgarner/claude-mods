import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { SavedRun, ScoreEntry } from '../types'

const TOOL = 'mcp__dino-break__start_break'

const best = atom({ plugin: 'dino-break', key: 'best' } as const, 0)
const saved = atom({ plugin: 'dino-break', key: 'saved' } as const, null)
const isClaudeDone = atom({ plugin: 'dino-break', key: 'isClaudeDone' } as const, false)
const isOpen = atom({ plugin: 'dino-break', key: 'isOpen' } as const, false)

const GUIDANCE = [
  'The dino-break mod gives the person a small game to play while they wait.',
  `When the task the person asked for will likely take longer than about one minute`,
  `(a long build, a big refactor, a test suite, a multi-step investigation), call ${TOOL}`,
  'once, as the first thing you do in that turn, then carry on with the task.',
  'It may be a deferred tool: load its schema with ToolSearch first if needed.',
  'Do not call it for quick answers or small edits, and never more than once per turn.',
].join(' ')

const isSavedRun = (value: unknown): value is SavedRun =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as SavedRun).score === 'number' &&
  typeof (value as SavedRun).speed === 'number' &&
  typeof (value as SavedRun).distance === 'number'

const recordScore = async ($: EngineInterface, score: number) => {
  const list = ((await $.store.get('scores')) as ScoreEntry[] | undefined) ?? []
  const entry: ScoreEntry = { score, at: await $.clock.now() }
  await $.store.set('scores', [...list, entry].slice(-50))

  if (score > (await read($, best))) {
    await update($, best, () => score)
    await $.store.set('best', score)
  }
}

const saveRun = async ($: EngineInterface, run: SavedRun | null) => {
  await update($, saved, () => run)
  await $.store.set('saved', run)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const stored = await $.store.get('best')
    await update($, best, () => (typeof stored === 'number' ? stored : 0))
    const run = await $.store.get('saved')
    await update($, saved, () => (isSavedRun(run) ? run : null))

    await $.tool.register({
      name: 'start_break',
      description:
        'Opens the dino-run game for the person to play while they wait. Call once at the start of a task you expect to take longer than about one minute.',
      inputSchema: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A few words on why this task will take a while' },
        },
      },
    })
    await $.command.register({
      name: 'dino',
      description: 'Play the ASCII dino-run game (run again to close it)',
    })

    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return {
      sections: [
        ...composed.sections,
        { id: 'dino-break:guidance', text: GUIDANCE, scope: 'session' },
      ],
    }
  })

  on('tool.call', { tool: /^mcp__dino-break__start_break$/ }, async $ => {
    await update($, isClaudeDone, () => false)
    await update($, isOpen, () => true)

    return {
      result: 'The dino game is open above the prompt for the person. Continue with the task.',
    }
  })

  on('command.run', { command: 'dino' }, async $ => {
    const wasOpen = await read($, isOpen)
    await update($, isOpen, () => !wasOpen)

    return {
      text: wasOpen
        ? 'Dino break closed.'
        : 'Dino break is above the prompt. Click the game, then D to start. X closes it.',
    }
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && (await read($, isOpen))) {
      await update($, isClaudeDone, () => true)
      $.ui.toast('Claude is done. Your dino run is paused and saved.')
    }

    return next(e)
  })

  on('ui.message', { component: 'AbovePrompt' }, async ($, e) => {
    const data = e.data as { type?: unknown; run?: unknown; score?: unknown }

    if ((data.type === 'pause' || data.type === 'close') && isSavedRun(data.run)) {
      await recordScore($, data.run.score)
      await saveRun($, data.run)
    } else if (data.type === 'resume') {
      await saveRun($, null)
      await update($, isClaudeDone, () => false)
    } else if (data.type === 'over' && typeof data.score === 'number') {
      await recordScore($, data.score)
      await saveRun($, null)
    }
    if (data.type === 'close') {
      await update($, isOpen, () => false)
    }

    return {}
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isOpen))) {
      return next(e)
    }
    if (e.surface !== 'terminal' && e.surface !== 'desktop') {
      return next(e)
    }

    const { Box, Client } = $.ui.resolve({ ...e, surface: e.surface })
    const sky = Math.max(6, Math.min(11, e.props.maxRows - 4))

    return (
      <Box flexDirection="column">
        <Client
          key="game"
          module="./game.tsx"
          width="100%"
          height={sky + 3}
          props={{
            best: await read($, best),
            saved: await read($, saved),
            isClaudeDone: await read($, isClaudeDone),
            sky,
          }}
        />
      </Box>
    )
  })
}
