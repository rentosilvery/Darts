import type {
  GameConfig, GameState, LeagueFinalStats, LeagueLegResult, Player, Prompt, Session,
} from './types'
import { startingScore } from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

const fill = <T,>(n: number, v: T): T[] => Array.from({ length: n }, () => v)

export const legAverage = (p: Player) =>
  p.roundHistory.length === 0
    ? 0
    : p.roundHistory.reduce((a, r) => a + r.scored, 0) / p.roundHistory.length

export const overallAverage = (p: Player) =>
  p.totalRoundsPlayed === 0 ? 0 : p.totalScoredAllLegs / p.totalRoundsPlayed

const newPlayer = (name: string, profileId: string | undefined, cfg: GameConfig): Player => ({
  id: uid(),
  name,
  profileId,
  score: startingScore(cfg.mode),
  currentTarget: 1,
  roundHistory: [],
  totalRoundsPlayed: 0,
  totalScoredAllLegs: 0,
  count100Plus: 0,
  count60Plus: 0,
  count40Plus: 0,
  bustCount: 0,
  bestTurn: 0,
  gameAverages: [],
})

/** Push the current state onto the undo stack and return a mutable copy. */
const begin = (sess: Session): Session => ({
  ...sess,
  history: [...sess.history, sess.state],
  state: structuredClone(sess.state),
  flash: null,
})

/** A mutable copy without touching the undo stack (history already pushed). */
const cont = (sess: Session): Session => ({ ...sess, state: structuredClone(sess.state), flash: null })

function advancePlayer(s: GameState) {
  const n = s.players.length
  let next = (s.currentPlayerIndex + 1) % n
  if (s.leagueMode) {
    let guard = 0
    while (s.playerFinishedThisLeg[next] && guard < n) {
      next = (next + 1) % n
      guard++
    }
  }
  s.currentPlayerIndex = next
}

function recordTurn(s: GameState, idx: number, scoreBefore: number, scored: number) {
  const p = s.players[idx]
  p.roundHistory.push({ scoreBefore, scored, bust: false })
  p.totalRoundsPlayed++
  p.totalScoredAllLegs += scored
  if (scored >= 100) p.count100Plus++
  if (scored >= 60) p.count60Plus++
  if (scored >= 40) p.count40Plus++
  if (scored > p.bestTurn) p.bestTurn = scored
}

function recordBust(s: GameState, idx: number) {
  const p = s.players[idx]
  p.roundHistory.push({ scoreBefore: p.score, scored: 0, bust: true })
  p.totalRoundsPlayed++
  p.bustCount++
}

function resetLeg(s: GameState) {
  const n = s.players.length
  for (const p of s.players) {
    p.score = startingScore(s.mode)
    p.currentTarget = 1
    p.roundHistory = []
  }
  s.playerOpened = fill(n, !s.doubleIn)
  s.playerFinishedThisLeg = fill(n, false)
  s.legFinishOrder = []
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

export function createSession(
  players: { name: string; profileId?: string }[],
  cfg: GameConfig,
): Session {
  const n = players.length
  const state: GameState = {
    ...cfg,
    players: players.map((p) => newPlayer(p.name, p.profileId, cfg)),
    currentPlayerIndex: 0,
    isGameOver: false,
    winnerIndex: null,
    playerOpened: fill(n, !cfg.doubleIn),
    playerLegsWon: fill(n, 0),
    playerSetsWon: fill(n, 0),
    legStarterIndex: 0,
    leagueGamesPlayed: 0,
    playerLeaguePoints: fill(n, 0),
    playerFinishedThisLeg: fill(n, false),
    legFinishOrder: [],
  }
  return {
    state,
    history: [],
    prompt: n > 1 ? { type: 'startingPlayer', suggested: 0 } : null,
    flash: null,
    recorded: false,
  }
}

/** "Play again" with the same players and rules. */
export function rematch(sess: Session): Session {
  const s = sess.state
  return createSession(
    s.players.map((p) => ({ name: p.name, profileId: p.profileId })),
    {
      mode: s.mode,
      doubleIn: s.doubleIn,
      doubleOut: s.doubleOut,
      legsToWinSet: s.legsToWinSet,
      setsToWin: s.setsToWin,
      leagueMode: s.leagueMode,
      leagueGameCount: s.leagueGameCount,
    },
  )
}

export function chooseStarter(sess: Session, idx: number): Session {
  const next = cont(sess)
  next.state.currentPlayerIndex = idx
  next.state.legStarterIndex = idx
  next.prompt = null
  return next
}

export function undo(sess: Session): Session {
  if (sess.history.length === 0) return sess
  const history = sess.history.slice(0, -1)
  return { ...sess, state: sess.history[sess.history.length - 1], history, prompt: null, flash: null }
}

export const clearFlash = (sess: Session): Session => (sess.flash ? { ...sess, flash: null } : sess)

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Enter a turn: x01 = points scored, Around the Clock = darts that hit the target. */
export function submitScore(sess: Session, total: number): Session {
  if (sess.prompt || sess.state.isGameOver) return sess
  const s = sess.state

  if (s.mode.kind === 'atc') {
    const next = begin(sess)
    const st = next.state
    const p = st.players[st.currentPlayerIndex]
    p.roundHistory.push({ scoreBefore: p.currentTarget, scored: total, bust: false })
    p.totalRoundsPlayed++
    p.currentTarget = Math.min(p.currentTarget + total, 21)
    if (p.currentTarget > 20) {
      st.isGameOver = true
      st.winnerIndex = st.currentPlayerIndex
      next.prompt = { type: 'winner' }
    } else {
      advancePlayer(st)
    }
    return next
  }

  const idx = s.currentPlayerIndex
  if (s.doubleIn && !s.playerOpened[idx] && total > 0) {
    return { ...sess, prompt: { type: 'doubleIn', score: total }, flash: null }
  }
  return scoreX01(begin(sess), total)
}

/** Core x01 scoring. `sess` must already have its undo snapshot pushed. */
function scoreX01(sess: Session, total: number): Session {
  const st = sess.state
  const idx = st.currentPlayerIndex
  const remaining = st.players[idx].score
  const left = remaining - total

  if (left < 0 || (left === 1 && st.doubleOut)) {
    recordBust(st, idx)
    advancePlayer(st)
    return { ...sess, flash: `Bust. ${st.players[idx].name} stays on ${remaining}.` }
  }

  if (left === 0) {
    if (st.doubleOut) return { ...sess, prompt: { type: 'doubleOut', score: total } }
    return finishLeg(sess, idx, total)
  }

  st.players[idx].score = left
  recordTurn(st, idx, remaining, total)
  advancePlayer(st)
  return sess
}

/** The BUST key: the current turn scores nothing. */
export function bust(sess: Session): Session {
  if (sess.prompt || sess.state.isGameOver || sess.state.mode.kind !== 'x01') return sess
  const next = begin(sess)
  recordBust(next.state, next.state.currentPlayerIndex)
  advancePlayer(next.state)
  return next
}

export function answerDoubleIn(sess: Session, hitDouble: boolean): Session {
  if (sess.prompt?.type !== 'doubleIn') return sess
  const total = sess.prompt.score
  const next = begin({ ...sess, prompt: null })
  const st = next.state
  const idx = st.currentPlayerIndex
  if (!hitDouble) {
    // Not opened: the turn counts, but scores nothing.
    recordTurn(st, idx, st.players[idx].score, 0)
    advancePlayer(st)
    return { ...next, flash: `${st.players[idx].name} hasn't opened yet.` }
  }
  st.playerOpened[idx] = true
  return scoreX01(next, total)
}

export function answerDoubleOut(sess: Session, onDouble: boolean): Session {
  if (sess.prompt?.type !== 'doubleOut') return sess
  const total = sess.prompt.score
  // The snapshot was pushed when the turn was entered.
  const next = cont({ ...sess, prompt: null })
  const st = next.state
  const idx = st.currentPlayerIndex
  if (!onDouble) {
    recordBust(st, idx)
    advancePlayer(st)
    return { ...next, flash: `Bust. ${st.players[idx].name} stays on ${st.players[idx].score}.` }
  }
  return finishLeg(next, idx, total)
}

function finishLeg(sess: Session, idx: number, total: number): Session {
  const st = sess.state
  const before = st.players[idx].score
  st.players[idx].score = 0
  recordTurn(st, idx, before, total)
  return st.leagueMode ? leaguePlayerFinished(sess, idx) : legWon(sess, idx)
}

// ---------------------------------------------------------------------------
// Sets & legs
// ---------------------------------------------------------------------------

function legWon(sess: Session, w: number): Session {
  const st = sess.state
  const n = st.players.length
  st.playerLegsWon[w]++
  if (st.playerLegsWon[w] >= st.legsToWinSet) {
    st.playerSetsWon[w]++
    if (st.playerSetsWon[w] >= st.setsToWin) {
      // Keep the final leg count so the results screen can show the scoreline.
      st.isGameOver = true
      st.winnerIndex = w
      return { ...sess, prompt: { type: 'winner' } }
    }
    st.playerLegsWon = fill(n, 0)
  }
  const name = st.players[w].name
  const nextStarter = w // the leg winner throws first next leg
  resetLeg(st)
  st.currentPlayerIndex = nextStarter
  const prompt: Prompt = { type: 'legWon', name, nextStarter }
  return { ...sess, prompt }
}

// ---------------------------------------------------------------------------
// League
// ---------------------------------------------------------------------------

function leaguePlayerFinished(sess: Session, idx: number): Session {
  const st = sess.state
  const n = st.players.length
  st.playerFinishedThisLeg[idx] = true
  st.legFinishOrder.push(idx)
  const position = st.legFinishOrder.length
  const points = n - position + 1

  const unfinished = st.playerFinishedThisLeg.filter((f) => !f).length
  if (unfinished <= 1) {
    if (unfinished === 1) {
      const last = st.playerFinishedThisLeg.findIndex((f) => !f)
      st.playerFinishedThisLeg[last] = true
      st.legFinishOrder.push(last)
    }
    return leagueLegComplete(sess)
  }
  advancePlayer(st)
  const pts = points === 1 ? '1 point' : `${points} points`
  return { ...sess, flash: `${st.players[idx].name} checked out in position ${position}, ${pts}.` }
}

function leagueLegComplete(sess: Session): Session {
  const st = sess.state
  const n = st.players.length
  for (const p of st.players) p.gameAverages.push(legAverage(p))
  st.legFinishOrder.forEach((pIdx, pos) => {
    st.playerLeaguePoints[pIdx] += n - pos
  })
  st.leagueGamesPlayed++

  if (st.leagueGamesPlayed >= st.leagueGameCount) {
    const ranked = st.players
      .map((_, i) => ({ i, pts: st.playerLeaguePoints[i] }))
      .sort((a, b) => b.pts - a.pts || overallAverage(st.players[b.i]) - overallAverage(st.players[a.i]))
    const results: LeagueFinalStats[] = ranked.map(({ i, pts }, rank) => {
      const p = st.players[i]
      return {
        id: p.id,
        name: p.name,
        profileId: p.profileId,
        rank: rank + 1,
        totalPoints: pts,
        overallAverage: overallAverage(p),
        gameAverages: p.gameAverages,
        count100Plus: p.count100Plus,
        count60Plus: p.count60Plus,
        count40Plus: p.count40Plus,
        bustCount: p.bustCount,
        bestTurn: p.bestTurn,
      }
    })
    st.isGameOver = true
    st.winnerIndex = ranked[0]?.i ?? null
    return { ...sess, prompt: { type: 'leagueFinal', results } }
  }

  const results: LeagueLegResult[] = st.legFinishOrder.map((pIdx, pos) => ({
    name: st.players[pIdx].name,
    position: pos + 1,
    pointsEarned: n - pos,
    totalPoints: st.playerLeaguePoints[pIdx],
    legAverage: legAverage(st.players[pIdx]),
  }))
  return { ...sess, prompt: { type: 'leagueLegResults', results } }
}

/** Continue from the league table to the next game. */
export function nextLeagueGame(sess: Session): Session {
  if (sess.prompt?.type !== 'leagueLegResults') return sess
  const next = cont(sess)
  const first = next.state.legFinishOrder[0] ?? 0
  resetLeg(next.state)
  next.state.currentPlayerIndex = first
  next.prompt = next.state.players.length > 1 ? { type: 'startingPlayer', suggested: first } : null
  return next
}

// ---------------------------------------------------------------------------
// Lifetime stats to merge into saved profiles when a 301/501 match ends.
// ---------------------------------------------------------------------------

export interface MatchRecord {
  profileId: string
  won: boolean
  rounds: number
  scored: number
  count100Plus: number
  count60Plus: number
  count40Plus: number
  bustCount: number
  bestTurn: number
}

export function matchRecords(st: GameState): MatchRecord[] {
  if (st.mode.kind !== 'x01' || !st.isGameOver) return []
  return st.players.flatMap((p, i) =>
    p.profileId
      ? [{
          profileId: p.profileId,
          won: i === st.winnerIndex,
          rounds: p.totalRoundsPlayed,
          scored: p.totalScoredAllLegs,
          count100Plus: p.count100Plus,
          count60Plus: p.count60Plus,
          count40Plus: p.count40Plus,
          bustCount: p.bustCount,
          bestTurn: p.bestTurn,
        }]
      : [],
  )
}
