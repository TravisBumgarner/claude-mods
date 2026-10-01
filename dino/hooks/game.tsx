import type { ClientModule, ClientSurface } from 'claude-code'

import type { SavedRun } from '../types'

type Props = {
  best: number
  saved: SavedRun | null
  isClaudeDone: boolean
  sky: number
}

type Phase = 'ready' | 'countdown' | 'running' | 'paused' | 'over'

type Cactus = { x: number; width: number; height: number }

type Game = {
  phase: Phase
  tick: number
  countdown: number
  score: number
  distance: number
  speed: number
  y: number
  vy: number
  cacti: Cactus[]
  gap: number
  best: number
  wasClaudeDone: boolean
  note: string
  sky: number
}

const TICK_MS = 50
const COUNTDOWN_TICKS = 60
const GRAVITY = 0.09
const DINO_ROWS = 4

// Launch speed whose peak leaves the dino's head one row under the sky's top.
const jumpFor = (sky: number) => Math.sqrt(2 * GRAVITY * Math.max(3, sky - DINO_ROWS - 1))
const tallestCactus = (sky: number) => Math.max(2, Math.min(3, sky - DINO_ROWS - 2))
const DINO_X = 3
const START_SPEED = 0.6
const MAX_SPEED = 1.6

const DINO_RUN_A = ['    __ ', '   / o)', '__/ /  ', '  /\\   ']
const DINO_RUN_B = ['    __ ', '   / o)', '__/ /  ', '  |\\   ']
const DINO_JUMP = ['    __ ', '   / o)', '__/ /  ', '  //   ']
const DINO_DEAD = ['    __ ', '   / x)', '__/ /  ', '  /\\   ']

const DIGITS: Record<number, string[]> = {
  3: [' ___ ', '  _|', ' ___|'],
  2: [' ___ ', ' ___|', '|___ '],
  1: ['     ', '   | ', '   | '],
}

const cactusRows = (c: Cactus): string[] => {
  if (c.width === 1) return Array.from({ length: c.height }, () => '|')
  if (c.width === 2) return Array.from({ length: c.height }, () => '||')

  return [' | ', ...Array.from({ length: c.height - 2 }, () => '\\|/'), ' | ']
}

const fresh = (best: number, isClaudeDone: boolean, sky: number): Game => ({
  phase: 'ready',
  tick: 0,
  countdown: 0,
  score: 0,
  distance: 0,
  speed: START_SPEED,
  y: 0,
  vy: 0,
  cacti: [],
  gap: 30,
  best,
  wasClaudeDone: isClaudeDone,
  note: '',
  sky,
})

const fromSaved = (run: SavedRun, best: number, isClaudeDone: boolean, sky: number): Game => ({
  ...fresh(best, isClaudeDone, sky),
  phase: 'paused',
  score: run.score,
  distance: run.distance,
  speed: run.speed,
  note: 'Saved run found',
})

const asRun = (g: Game): SavedRun => ({ score: g.score, speed: g.speed, distance: g.distance })

const step = (g: Game, columns: number): Game => {
  if (g.phase === 'countdown') {
    const countdown = g.countdown - 1

    return countdown <= 0
      ? { ...g, phase: 'running', countdown: 0, tick: g.tick + 1 }
      : { ...g, countdown, tick: g.tick + 1 }
  }
  if (g.phase !== 'running') return g

  let vy = g.vy
  let y = g.y
  if (y > 0 || vy > 0) {
    y = Math.max(0, y + vy)
    vy = y === 0 ? 0 : vy - GRAVITY
  }

  const cacti = g.cacti
    .map(c => ({ ...c, x: c.x - g.speed }))
    .filter(c => c.x + c.width > 0)
  let gap = g.gap - g.speed
  if (gap <= 0) {
    const width = 1 + Math.floor(Math.random() * 3)
    const height = 2 + Math.floor(Math.random() * (tallestCactus(g.sky) - 1))
    cacti.push({ x: columns, width, height })
    gap = 22 + Math.random() * 30 + g.speed * 8
  }

  const hitLeft = DINO_X + 3
  const hitRight = DINO_X + 6
  const isHit = cacti.some(c => {
    const left = Math.round(c.x)
    const overlaps = left < hitRight && left + c.width > hitLeft

    return overlaps && y < c.height
  })

  const distance = g.distance + g.speed
  const score = Math.floor(distance / 2)
  const speed = Math.min(MAX_SPEED, START_SPEED + distance / 2500)
  const next: Game = { ...g, tick: g.tick + 1, y, vy, cacti, gap, distance, score, speed }

  return isHit ? { ...next, phase: 'over', best: Math.max(g.best, score) } : next
}

const draw = (g: Game, columns: number): string[] => {
  const width = Math.max(30, columns)
  const SKY = g.sky
  const grid = Array.from({ length: SKY }, () => Array.from({ length: width }, () => ' '))
  const put = (row: number, col: number, text: string) => {
    if (row < 0 || row >= SKY) return
    for (let i = 0; i < text.length; i += 1) {
      const at = col + i
      const ch = text[i]
      if (at >= 0 && at < width && ch !== undefined && ch !== ' ') grid[row]![at] = ch
    }
  }

  const cloudX = Math.floor(width - ((g.distance / 4) % (width + 10)))
  put(1, cloudX, '.--.')
  put(2, cloudX - 1, '(____)')

  for (const c of g.cacti) {
    const rows = cactusRows(c)
    rows.forEach((text, i) => put(SKY - c.height + i, Math.round(c.x), text))
  }

  const sprite =
    g.phase === 'over'
      ? DINO_DEAD
      : g.y > 0
        ? DINO_JUMP
        : Math.floor(g.tick / 3) % 2 === 0
          ? DINO_RUN_A
          : DINO_RUN_B
  const top = SKY - sprite.length - Math.round(g.y)
  sprite.forEach((text, i) => put(top + i, DINO_X, text))

  if (g.phase === 'countdown') {
    const n = Math.ceil(g.countdown / (COUNTDOWN_TICKS / 3))
    const digit = DIGITS[n] ?? DIGITS[1]!
    digit.forEach((text, i) => put(3 + i, Math.floor(width / 2) - 2, text))
  }

  const ground = Array.from({ length: width }, (_, i) =>
    (i + Math.floor(g.distance)) % 7 === 0 ? '.' : '_',
  ).join('')

  return [...grid.map(row => row.join('')), ground]
}

const pad = (n: number) => String(n).padStart(5, '0')

const message = (g: Game): string => {
  switch (g.phase) {
    case 'ready':
      return 'Click here, then D to start. Space/Up jump, P pause, X close.'
    case 'countdown':
      return 'Get ready...'
    case 'running':
      return 'Space/Up: jump   P: pause   X: close'
    case 'paused':
      return `${g.note ? `${g.note}. ` : ''}PAUSED, score saved. Press D to resume.`
    case 'over':
      return `GAME OVER at ${g.score}. Press D to play again.`
  }
}

const DinoGame: ClientModule<Props, Game> = (props, surface: ClientSurface<Game>) => {
  const { Box, Text } = surface.elements

  if (surface.state === undefined) {
    const initial = props.saved
      ? fromSaved(props.saved, props.best, props.isClaudeDone, props.sky)
      : fresh(props.best, props.isClaudeDone, props.sky)
    surface.setState(initial)

    surface.every(TICK_MS, () => {
      const g = surface.state
      if (g === undefined) return
      if (g.phase === 'countdown' || g.phase === 'running') {
        const next = step(g, surface.columns)
        if (next.phase === 'over') {
          surface.post({ type: 'over', score: next.score })
        }
        surface.setState(next)
      }
    })

    surface.onKey(key => {
      const g = surface.state
      if (g === undefined) return
      const k = key.key.toLowerCase()

      if ((k === ' ' || k === 'space' || k === 'up' || k === 'w') && g.phase === 'running') {
        if (g.y === 0) surface.setState({ ...g, vy: jumpFor(g.sky), y: 0.01 })
      } else if (k === 'p' && (g.phase === 'running' || g.phase === 'countdown')) {
        surface.post({ type: 'pause', run: asRun(g) })
        surface.setState({ ...g, phase: 'paused', best: Math.max(g.best, g.score), note: '' })
      } else if (k === 'x') {
        const isLive = g.phase === 'running' || g.phase === 'countdown' || g.phase === 'paused'
        surface.post({ type: 'close', ...(isLive && g.score > 0 ? { run: asRun(g) } : {}) })
      } else if (k === 'd') {
        if (g.phase === 'paused') {
          surface.post({ type: 'resume' })
          surface.setState({ ...g, phase: 'countdown', countdown: COUNTDOWN_TICKS, note: '' })
        } else if (g.phase === 'ready' || g.phase === 'over') {
          surface.setState({
            ...fresh(Math.max(g.best, g.score), g.wasClaudeDone, g.sky),
            phase: 'countdown',
            countdown: COUNTDOWN_TICKS,
          })
        }
      }
    })

    return <Text dimColor>Loading dino...</Text>
  }

  let g = surface.state
  if (g.sky !== props.sky) {
    g = { ...g, sky: props.sky }
    surface.setState(g)
  }
  if (props.isClaudeDone && !g.wasClaudeDone) {
    const isLive = g.phase === 'running' || g.phase === 'countdown'
    if (isLive) surface.post({ type: 'pause', run: asRun(g) })
    g = {
      ...g,
      wasClaudeDone: true,
      phase: isLive ? 'paused' : g.phase,
      note: 'Claude is done',
    }
    surface.setState(g)
  } else if (!props.isClaudeDone && g.wasClaudeDone) {
    g = { ...g, wasClaudeDone: false }
    surface.setState(g)
  }

  const best = Math.max(g.best, props.best)
  const rows = draw(g, surface.columns)

  return (
    <Box flexDirection="column">
      <Text>
        <Text dimColor>HI {pad(best)}  </Text>
        <Text bold>{pad(g.score)}</Text>
        {props.isClaudeDone ? <Text color="green">   Claude is done</Text> : <Text dimColor>   Claude is working...</Text>}
      </Text>
      {rows.map((row, i) => (
        <Text key={`r${i}`} wrap="truncate">
          {row}
        </Text>
      ))}
      <Text color={g.phase === 'over' ? 'red' : g.phase === 'paused' ? 'yellow' : undefined} wrap="truncate">
        {message(g)}
      </Text>
    </Box>
  )
}

export default DinoGame
