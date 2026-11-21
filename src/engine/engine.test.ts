import { describe, expect, it } from 'vitest'
import {
  answerDoubleIn, answerDoubleOut, bust, chooseStarter, createSession, matchRecords,
  nextLeagueGame, submitScore, undo,
} from './engine'
import type { GameConfig, Session } from './types'

const cfg = (over: Partial<GameConfig> = {}): GameConfig => ({
  mode: { kind: 'x01', start: 501 },
  doubleIn: false,
  doubleOut: false,
  legsToWinSet: 1,
  setsToWin: 1,
  leagueMode: false,
  leagueGameCount: 3,
  ...over,
})

const start = (c: GameConfig, names = ['Ana', 'Ben']) =>
  chooseStarter(createSession(names.map((name) => ({ name, profileId: `p-${name}` })), c), 0)

const play = (s: Session, ...scores: number[]) => scores.reduce(submitScore, s)

describe('x01', () => {
  it('subtracts scores and rotates players', () => {
    const s = play(start(cfg()), 60, 45)
    expect(s.state.players[0].score).toBe(441)
    expect(s.state.players[1].score).toBe(456)
    expect(s.state.currentPlayerIndex).toBe(0)
  })

  it('busts when overshooting and moves on', () => {
    let s = start(cfg({ mode: { kind: 'x01', start: 301 } }))
    s = play(s, 180, 0, 100, 0) // Ana on 21
    s = submitScore(s, 40)
    expect(s.state.players[0].score).toBe(21)
    expect(s.state.players[0].bustCount).toBe(1)
    expect(s.state.currentPlayerIndex).toBe(1)
    expect(s.flash).toMatch(/Bust/)
  })

  it('double out asks for confirmation and a "no" is a bust', () => {
    let s = start(cfg({ mode: { kind: 'x01', start: 301 }, doubleOut: true }))
    s = play(s, 180, 0, 81, 0) // Ana on 40
    s = submitScore(s, 40)
    expect(s.prompt?.type).toBe('doubleOut')
    s = answerDoubleOut(s, false)
    expect(s.state.players[0].score).toBe(40)
    expect(s.state.currentPlayerIndex).toBe(1)
    s = play(s, 0, 40)
    s = answerDoubleOut(s, true)
    expect(s.prompt?.type).toBe('winner')
    expect(s.state.winnerIndex).toBe(0)
  })

  it('leaving 1 with double out is a bust', () => {
    let s = start(cfg({ mode: { kind: 'x01', start: 301 }, doubleOut: true }))
    s = play(s, 180, 0, 80, 0, 40)
    expect(s.state.players[0].score).toBe(41)
    expect(s.state.players[0].bustCount).toBe(1)
  })

  it('double in: a miss scores nothing, a hit opens the player', () => {
    let s = start(cfg({ doubleIn: true }))
    s = submitScore(s, 60)
    expect(s.prompt?.type).toBe('doubleIn')
    s = answerDoubleIn(s, false)
    expect(s.state.players[0].score).toBe(501)
    expect(s.state.currentPlayerIndex).toBe(1)
    s = submitScore(s, 60)
    s = answerDoubleIn(s, true)
    expect(s.state.players[1].score).toBe(441)
    s = submitScore(s, 0) // Ana, zero needs no question
    s = submitScore(s, 60) // Ben already open
    expect(s.prompt).toBeNull()
    expect(s.state.players[1].score).toBe(381)
  })

  it('undo restores the previous turn', () => {
    let s = play(start(cfg()), 100)
    s = undo(s)
    expect(s.state.players[0].score).toBe(501)
    expect(s.state.currentPlayerIndex).toBe(0)
  })

  it('logs every turn in throw order and clears it each leg', () => {
    let s = start(cfg({ mode: { kind: 'x01', start: 301 }, legsToWinSet: 2 }))
    s = play(s, 60, 45)
    s = bust(s)
    expect(s.state.log).toEqual([
      { player: 0, scoreBefore: 301, scored: 60, bust: false },
      { player: 1, scoreBefore: 301, scored: 45, bust: false },
      { player: 0, scoreBefore: 241, scored: 0, bust: true },
    ])
    s = undo(s)
    expect(s.state.log).toHaveLength(2)
    s = play(s, 180, 0, 61) // Ana checks out
    expect(s.prompt?.type).toBe('legWon')
    expect(s.state.log).toEqual([])
  })

  it('bust key records a bust round', () => {
    const s = bust(start(cfg()))
    expect(s.state.players[0].roundHistory[0]).toEqual({ scoreBefore: 501, scored: 0, bust: true })
  })

  it('legs and sets lead to a match winner; leg winner starts next', () => {
    let s = start(cfg({ mode: { kind: 'x01', start: 301 }, legsToWinSet: 2 }))
    s = play(s, 180, 0, 121)
    expect(s.prompt).toEqual({ type: 'legWon', name: 'Ana', nextStarter: 0 })
    expect(s.state.playerLegsWon).toEqual([1, 0])
    s = chooseStarter(s, 1)
    s = play(s, 0, 180, 0, 121)
    expect(s.prompt?.type).toBe('winner')
    expect(s.state.playerSetsWon).toEqual([1, 0])
    const rec = matchRecords(s.state)
    expect(rec.find((r) => r.profileId === 'p-Ana')?.won).toBe(true)
    expect(rec.find((r) => r.profileId === 'p-Ana')?.rounds).toBe(4)
  })
})

describe('league', () => {
  it('awards points by finishing order and ends after N games', () => {
    let s = start(cfg({ mode: { kind: 'x01', start: 301 }, leagueMode: true, leagueGameCount: 2 }), ['Ana', 'Ben', 'Cy'])
    s = play(s, 180, 0, 0, 121) // Ana finishes first
    expect(s.prompt).toBeNull()
    expect(s.flash).toMatch(/Ana/)
    expect(s.state.currentPlayerIndex).toBe(1)
    s = play(s, 180, 0, 121) // Ben (180), Cy (0), Ben finishes -> Cy auto last
    expect(s.prompt?.type).toBe('leagueLegResults')
    expect(s.state.playerLeaguePoints).toEqual([3, 2, 1])
    s = nextLeagueGame(s)
    expect(s.prompt).toEqual({ type: 'startingPlayer', suggested: 0 })
    s = chooseStarter(s, 2)
    s = play(s, 180, 0, 0, 121) // Cy finishes first
    s = play(s, 180, 0, 121) // Ana 180, Ben 0, Ana checks out; Ben is last
    expect(s.prompt?.type).toBe('leagueFinal')
  })
})

describe('around the clock', () => {
  it('advances targets by hits and finishes past 20', () => {
    let s = start(cfg({ mode: { kind: 'atc' } }))
    for (let i = 0; i < 7; i++) s = play(s, 3, 0)
    expect(s.state.players[0].currentTarget).toBe(21)
    expect(s.prompt?.type).toBe('winner')
    expect(matchRecords(s.state)).toEqual([])
  })
})
