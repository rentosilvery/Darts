export type GameMode = { kind: 'x01'; start: 301 | 501 } | { kind: 'atc' }

export const modeLabel = (m: GameMode) => (m.kind === 'x01' ? String(m.start) : 'Around the Clock')
export const startingScore = (m: GameMode) => (m.kind === 'x01' ? m.start : 0)

export interface RoundEntry {
  scoreBefore: number
  scored: number
  /** true when the turn was a bust (scored is 0) */
  bust: boolean
}

export interface Player {
  id: string
  name: string
  /** links to a saved PlayerProfile; undefined for guests */
  profileId?: string
  /** x01: remaining score */
  score: number
  /** Around the Clock: current target 1–20, 21 = finished */
  currentTarget: number
  /** current leg only */
  roundHistory: RoundEntry[]
  // Cumulative across all legs of the match / league
  totalRoundsPlayed: number
  totalScoredAllLegs: number
  count100Plus: number
  count60Plus: number
  count40Plus: number
  bustCount: number
  bestTurn: number
  /** league: one average per completed game */
  gameAverages: number[]
}

export interface GameConfig {
  mode: GameMode
  doubleIn: boolean
  doubleOut: boolean
  legsToWinSet: number
  setsToWin: number
  leagueMode: boolean
  leagueGameCount: number
}

export interface GameState extends GameConfig {
  players: Player[]
  currentPlayerIndex: number
  isGameOver: boolean
  winnerIndex: number | null
  /** double-in: whether each player has opened this leg */
  playerOpened: boolean[]
  playerLegsWon: number[]
  playerSetsWon: number[]
  /** player who threw first in the current leg (for rotating the start) */
  legStarterIndex: number
  leagueGamesPlayed: number
  playerLeaguePoints: number[]
  playerFinishedThisLeg: boolean[]
  legFinishOrder: number[]
  /** every turn of the current leg, all players, in throw order */
  log: TurnLogEntry[]
}

export interface TurnLogEntry extends RoundEntry {
  /** index into players */
  player: number
}

export interface LeagueLegResult {
  name: string
  position: number
  pointsEarned: number
  totalPoints: number
  legAverage: number
}

export interface LeagueFinalStats {
  id: string
  name: string
  profileId?: string
  rank: number
  totalPoints: number
  overallAverage: number
  gameAverages: number[]
  count100Plus: number
  count60Plus: number
  count40Plus: number
  bustCount: number
  bestTurn: number
}

/** A question or notice the game is waiting on. Only one at a time. */
export type Prompt =
  | { type: 'startingPlayer'; suggested: number }
  | { type: 'doubleOut'; score: number }
  | { type: 'doubleIn'; score: number }
  | { type: 'legWon'; name: string; nextStarter: number }
  | { type: 'leaguePlayerFinished'; name: string; points: number }
  | { type: 'leagueLegResults'; results: LeagueLegResult[] }
  | { type: 'leagueFinal'; results: LeagueFinalStats[] }
  | { type: 'winner' }

export interface Session {
  state: GameState
  /** snapshots for undo */
  history: GameState[]
  prompt: Prompt | null
  /** transient notice, e.g. "Bust" */
  flash: string | null
  /** set once lifetime stats have been written for this match */
  recorded: boolean
}
