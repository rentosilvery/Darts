import { useCallback, useEffect, useState } from 'react'
import { BoardArt, IconBack, IconCheck, IconPeople, IconUndo } from '../components/Icons'
import { Dialog, ProfileDot, Sheet, Toast, fmt1 } from '../components/ui'
import { checkoutHint, isPossibleTurn } from '../engine/checkout'
import {
  answerDoubleIn, answerDoubleOut, bust, chooseStarter, clearFlash, legAverage, nextLeagueGame,
  overallAverage, submitScore, undo,
} from '../engine/engine'
import type { GameState, Player, Session } from '../engine/types'
import { modeLabel } from '../engine/types'
import { Results } from './Results'

type Update = (fn: (s: Session) => Session) => void

export function Game(props: { session: Session; update: Update; onExit: () => void; onRematch: () => void }) {
  const { session, update } = props
  const st = session.state
  const [digits, setDigits] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [showScores, setShowScores] = useState(false)

  useWakeLock()

  const n = st.players.length
  const cur = st.players[st.currentPlayerIndex]
  const prev = st.players[(st.currentPlayerIndex - 1 + n) % n]
  const next = st.players[(st.currentPlayerIndex + 1) % n]
  const x01 = st.mode.kind === 'x01'

  const value = digits === '' ? null : Number(digits)
  const valid = value !== null && isPossibleTurn(value)

  const enter = useCallback(() => {
    if (!valid || value === null) return
    update((s) => submitScore(s, value))
    setDigits('')
  }, [valid, value, update])

  const press = useCallback((k: string) => {
    if (k === 'back') return setDigits((d) => d.slice(0, -1))
    setDigits((d) => {
      const p = d === '0' ? k : d + k
      return p.length <= 3 && Number(p) <= 180 ? p : d
    })
  }, [])

  // Hardware keyboard support (desktop / tablets)
  useEffect(() => {
    if (!x01) return
    const h = (e: KeyboardEvent) => {
      if (session.prompt || confirmEnd || showScores) return
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('back')
      else if (e.key === 'Enter') enter()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [x01, press, enter, session.prompt, confirmEnd, showScores])

  const prompt = session.prompt
  if (prompt?.type === 'winner' || prompt?.type === 'leagueFinal') {
    return <Results session={session} onRematch={props.onRematch} onNew={props.onExit} />
  }

  const hint = x01 && cur.score <= 170 ? checkoutHint(cur.score) : null
  const log = st.log ?? []
  const lastTurns = log.slice(-2).reverse()
  const anySaved = st.players.some((p) => p.profileId)
  const undoButton = (
    <button
      className="undo-btn"
      aria-label="Undo last turn"
      disabled={session.history.length === 0}
      onClick={() => { update(undo); setDigits('') }}
    >
      <IconUndo />
    </button>
  )

  return (
    <main className="screen">
      <header className="topbar">
        <button className="text-btn" onClick={() => setConfirmEnd(true)}>End</button>
        <div className="match-status">{matchStatus(st)}</div>
        <button className="text-btn gold" onClick={() => setShowScores(true)} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <IconPeople width={18} height={18} /> Scores
        </button>
      </header>

      <section className="stage" aria-live="polite">
        <BoardArt className="board-art" />
        <SideColumn player={prev} role="Previous" show={n >= 3} st={st} index={(st.currentPlayerIndex - 1 + n) % n} />
        <div className="current">
          <div className="name">
            <ProfileDot profileId={cur.profileId} />
            <span>{cur.name}</span>
          </div>
          {x01 ? (
            <div key={`${cur.id}-${cur.score}`} className="score num pop" aria-label={`${cur.name} needs ${cur.score}`}>
              {cur.score}
            </div>
          ) : (
            <div key={`${cur.id}-${cur.currentTarget}`} className="score atc num pop" aria-label={`${cur.name} is on ${cur.currentTarget}`}>
              {cur.currentTarget > 20 ? 'Done' : cur.currentTarget}
            </div>
          )}
          <div className="avg">
            {x01 ? (
              st.leagueMode ? (
                <>This game <b className="num">{fmt1(legAverage(cur))}</b>, overall <b className="num">{fmt1(overallAverage(cur))}</b></>
              ) : (
                <>Average <b className="num">{fmt1(legAverage(cur))}</b>{metaFor(st, st.currentPlayerIndex) && <>, {metaFor(st, st.currentPlayerIndex)}</>}</>
              )
            ) : (
              'Target'
            )}
          </div>
          <div className="checkout" aria-label={hint ? `Checkout ${hint}` : undefined}>
            {hint?.split(' ').map((d, i) => <span key={i}>{d}</span>)}
          </div>
        </div>
        <SideColumn player={next} role="Next" show={n >= 2} st={st} index={(st.currentPlayerIndex + 1) % n} />
      </section>

      <section className="feed" aria-label="Last turns">
        {lastTurns.length === 0 ? (
          <div className="feed-empty">{x01 ? 'No turns yet this leg' : 'No turns yet'}</div>
        ) : (
          lastTurns.map((t, i) => {
            const p = st.players[t.player]
            const after = x01
              ? t.bust ? t.scoreBefore : t.scoreBefore - t.scored
              : Math.min(t.scoreBefore + t.scored, 21)
            return (
              <div className={`feed-row num${i === 0 ? ' latest' : ''}`} key={log.length - i}>
                <span className="who">
                  <ProfileDot profileId={p.profileId} placeholder={anySaved} />
                  <span>{p.name}</span>
                </span>
                <span className={`pts${t.bust ? ' bust' : ''}`}>
                  {t.bust ? 'Bust' : t.scored}
                  {!x01 && <small>{t.scored === 1 ? ' hit' : ' hits'}</small>}
                </span>
                <span className="path">
                  {t.scoreBefore} → <b>{!x01 && after > 20 ? 'done' : after}</b>
                </span>
              </div>
            )
          })
        )}
      </section>

      {x01 ? (
        <>
          <div className="entry">
            <div className={`value num${digits === '' ? ' placeholder' : ''}${value !== null && !valid ? ' invalid' : ''}`} aria-live="polite">
              {digits === '' ? 'Turn total' : digits}
            </div>
            {undoButton}
            <button className="enter" disabled={!valid} onClick={enter}>
              <IconCheck /> Enter
            </button>
          </div>
          {value !== null && !valid && <div className="pad-hint">{value} can’t be scored with three darts.</div>}
          <div className="pad">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((k) => (
              <button key={k} className="key" onClick={() => press(k)}>{k}</button>
            ))}
            <button className="key bust" onClick={() => { update(bust); setDigits('') }}>BUST</button>
            <button className="key" onClick={() => press('0')}>0</button>
            <button className="key back" aria-label="Delete digit" onClick={() => press('back')}><IconBack /></button>
          </div>
        </>
      ) : (
        <>
          <div className="entry">
            <div className="atc-q">How many darts hit <b>{cur.currentTarget}</b>?</div>
            {undoButton}
          </div>
          <div className="pad atc">
            {[0, 1, 2, 3].map((h) => (
              <button key={h} className="key" onClick={() => update((s) => submitScore(s, h))}>{h}</button>
            ))}
          </div>
        </>
      )}


      {/* ---------- prompts ---------- */}

      {(prompt?.type === 'startingPlayer' || prompt?.type === 'legWon') && (
        <StarterSheet
          key={JSON.stringify(prompt)}
          players={st.players}
          suggested={prompt.type === 'legWon' ? prompt.nextStarter : prompt.suggested}
          title={prompt.type === 'legWon' ? `${prompt.name} takes the leg` : 'Who throws first?'}
          subtitle={prompt.type === 'legWon' ? `${matchStatus(st)}. Who throws first?` : undefined}
          onStart={(i) => update((s) => chooseStarter(s, i))}
          onEnd={() => setConfirmEnd(true)}
        />
      )}

      {prompt?.type === 'doubleIn' && (
        <Dialog title="Opened on a double?" body={`Double in is on. Did ${cur.name} hit a double to start scoring this turn?`}>
          <button className="cta" style={{ background: 'var(--green)', boxShadow: 'none' }} onClick={() => update((s) => answerDoubleIn(s, true))}>
            Yes, count {prompt.score}
          </button>
          <button className="cta quiet" onClick={() => update((s) => answerDoubleIn(s, false))}>No double</button>
        </Dialog>
      )}

      {prompt?.type === 'doubleOut' && (
        <Dialog title="Finished on a double?" body={`Double out is on. Did ${cur.name}'s last dart land on a double?`}>
          <button className="cta" style={{ background: 'var(--green)', boxShadow: 'none' }} onClick={() => update((s) => answerDoubleOut(s, true))}>
            Yes, game shot
          </button>
          <button className="cta quiet" onClick={() => update((s) => answerDoubleOut(s, false))}>No, it’s a bust</button>
        </Dialog>
      )}

      {prompt?.type === 'leagueLegResults' && (
        <Sheet
          title={`Game ${st.leagueGamesPlayed} of ${st.leagueGameCount}`}
          subtitle="Points so far"
          footer={<button className="cta" onClick={() => update(nextLeagueGame)}>Next game</button>}
        >
          <table className="ltable num">
            <tbody>
              {prompt.results.map((r) => (
                <tr key={r.name + r.position}>
                  <td className="pos">{r.position}</td>
                  <td className="nm">{r.name}<small>Average {fmt1(r.legAverage)}</small></td>
                  <td className="gain">+{r.pointsEarned}</td>
                  <td className="tot">{r.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Sheet>
      )}

      {showScores && <ScoresSheet st={st} onClose={() => setShowScores(false)} />}

      {confirmEnd && (
        <Dialog title="End this game?" body="Scores from this game won’t be added to anyone’s stats." onClose={() => setConfirmEnd(false)}>
          <button className="cta" onClick={props.onExit}>End game</button>
          <button className="cta quiet" onClick={() => setConfirmEnd(false)}>Keep playing</button>
        </Dialog>
      )}

      {session.flash && <Toast text={session.flash} onDone={() => update(clearFlash)} />}
    </main>
  )
}

// ---------------------------------------------------------------------------

function matchStatus(st: GameState): string {
  const mode = modeLabel(st.mode)
  if (st.leagueMode) return `${mode} league, game ${Math.min(st.leagueGamesPlayed + 1, st.leagueGameCount)} of ${st.leagueGameCount}`
  const legNo = st.playerLegsWon.reduce((a, b) => a + b, 0) + 1
  const setNo = st.playerSetsWon.reduce((a, b) => a + b, 0) + 1
  if (st.setsToWin > 1) return `${mode}, set ${setNo} leg ${legNo}`
  if (st.legsToWinSet > 1) return `${mode}, leg ${legNo}`
  const rules = [st.doubleIn && 'double in', st.doubleOut && 'double out'].filter(Boolean).join(', ')
  return rules ? `${mode}, ${rules}` : mode
}

/** Legs/sets or league points for one player, if the format has them. */
function metaFor(st: GameState, i: number): string | null {
  if (st.leagueMode) return `${st.playerLeaguePoints[i]} pts`
  if (st.setsToWin > 1) return `sets ${st.playerSetsWon[i]}, legs ${st.playerLegsWon[i]}`
  if (st.legsToWinSet > 1) return `legs ${st.playerLegsWon[i]}`
  return null
}

function SideColumn({ player, role, show, st, index }: { player: Player; role: string; show: boolean; st: GameState; index: number }) {
  if (!show) return <div className="side" />
  const meta = metaFor(st, index)
  const done = st.leagueMode && st.playerFinishedThisLeg[index]
  return (
    <div className="side">
      <div className="role">{role}</div>
      <div className="name">
        <ProfileDot profileId={player.profileId} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</span>
      </div>
      <div className="val num">{st.mode.kind === 'x01' ? player.score : player.currentTarget > 20 ? 'Done' : player.currentTarget}</div>
      {(meta || done) && <div className="meta">{done ? 'Finished' : meta}</div>}
    </div>
  )
}

function StarterSheet(props: {
  players: Player[]
  suggested: number
  title: string
  subtitle?: string
  onStart: (i: number) => void
  onEnd: () => void
}) {
  const [sel, setSel] = useState(props.suggested)
  return (
    <Sheet
      title={props.title}
      subtitle={props.subtitle}
      footer={
        <>
          <button className="cta" onClick={() => props.onStart(sel)}>
            {props.players.length > 1 ? `${props.players[sel]?.name} throws first` : 'Start'}
          </button>
          <button className="text-btn" style={{ width: '100%', marginTop: 6 }} onClick={props.onEnd}>
            End game
          </button>
        </>
      }
    >
      {props.players.length > 1 && (
        <div className="panel">
          {props.players.map((p, i) => (
            <button key={p.id} className="choice" aria-pressed={sel === i} onClick={() => setSel(i)}>
              <ProfileDot profileId={p.profileId} placeholder />
              <span className="grow">{p.name}</span>
              {sel === i && <IconCheck className="tick" />}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}

function ScoresSheet({ st, onClose }: { st: GameState; onClose: () => void }) {
  const x01 = st.mode.kind === 'x01'
  return (
    <Sheet title="Scores" subtitle={matchStatus(st)} onClose={onClose}>
      <div className="panel">
        {st.players.map((p, i) => {
          const meta = metaFor(st, i)
          const isCur = i === st.currentPlayerIndex
          return (
            <div key={p.id} className="row" style={isCur ? { background: 'var(--gold-soft)' } : undefined}>
              <ProfileDot profileId={p.profileId} placeholder />
              <span className="grow">
                <span className="label">{p.name}</span>
                <span className="sub" style={{ display: 'block' }}>
                  {[
                    isCur && 'Throwing now',
                    x01 && (st.leagueMode
                      ? `this game ${fmt1(legAverage(p))}, overall ${fmt1(overallAverage(p))}`
                      : `average ${fmt1(legAverage(p))}`),
                    meta,
                  ].filter(Boolean).join(', ').replace(/^./, (c) => c.toUpperCase())}
                </span>
              </span>
              <span className="num" style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 32, color: isCur ? 'var(--gold)' : undefined }}>
                {x01 ? p.score : p.currentTarget > 20 ? 'Done' : p.currentTarget}
              </span>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}

/** Keep the screen on while a game is running (where supported). */
function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    const acquire = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === 'visible') lock = await nav.wakeLock.request('screen')
      } catch {
        /* denied or unsupported */
      }
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      document.removeEventListener('visibilitychange', acquire)
      lock?.release().catch(() => {})
    }
  }, [])
}
