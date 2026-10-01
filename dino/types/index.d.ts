export type SavedRun = {
  score: number
  speed: number
  distance: number
}

export type ScoreEntry = { score: number; at: number }

declare module 'claude-code' {
  interface PluginState {
    'dino-break': {
      best: number
      saved: SavedRun | null
      isClaudeDone: boolean
      isOpen: boolean
    }
  }
}
