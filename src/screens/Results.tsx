import { StatGrid, fmt1 } from '../components/ui'
import { overallAverage } from '../engine/engine'
import type { Session } from '../engine/types'

/** End of a match (winner) or a league (final table). */
export function Results({ session, onRematch, onNew }: { session: Session; onRematch: () => void; onNew: () => void }) {
  const st = session.state
  const x01 = st.mode.kind === 'x01'
  const prompt = session.prompt
  const winner = st.winnerIndex !== null ? st.players[st.winnerIndex] : null

  const footer = (
    <div className="dock" style={{ position: 'sticky' }}>
      <button className="cta" onClick={onRematch}>Play again</button>
      <button className="cta quiet" onClick={onNew}>New game</button>
    </div>
  )

  if (prompt?.type === 'leagueFinal') {
    return (
      <main className="screen">
        <div className="scroll" style={{ paddingBottom: 24 }}>
          <div className="results-hero">
            <div className="kicker">League champion after {st.leagueGameCount} {st.leagueGameCount === 1 ? 'game' : 'games'}</div>
            <h1>{prompt.results[0]?.name}</h1>
          </div>
          {prompt.results.map((r) => (
            <article key={r.id} className={`result-card${r.rank === 1 ? ' first' : ''}`}>
              <header>
                <span className="rank num">{r.rank}</span>
                <span className="grow">{r.name}</span>
                <span className="pts num">{r.totalPoints} pts</span>
              </header>
              <StatGrid
                items={[
                  ['Average', fmt1(r.overallAverage)],
                  ['Best turn', r.bestTurn],
                  ['Busts', r.bustCount],
                  ['100+', r.count100Plus],
                  ['60+', r.count60Plus],
                  ['40+', r.count40Plus],
                ]}
              />
              {r.gameAverages.length > 0 && (
                <div className="per-game num">
                  {r.gameAverages.map((a, i) => (
                    <span key={i}>Game {i + 1} <b>{fmt1(a)}</b></span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
        {footer}
      </main>
    )
  }

  const others = st.players
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => i !== st.winnerIndex)
    .sort((a, b) => overallAverage(b.p) - overallAverage(a.p))
  const ordered = winner ? [{ p: winner, i: st.winnerIndex! }, ...others] : others
  const multi = st.setsToWin > 1 || st.legsToWinSet > 1
  const scoreline = (i: number) =>
    st.setsToWin > 1 ? `${st.playerSetsWon[i]} ${st.playerSetsWon[i] === 1 ? 'set' : 'sets'}` : `${st.playerLegsWon[i]} ${st.playerLegsWon[i] === 1 ? 'leg' : 'legs'}`

  return (
    <main className="screen">
      <div className="scroll" style={{ paddingBottom: 24 }}>
        <div className="results-hero">
          <div className="kicker">{x01 ? 'Game shot, and the match' : 'Around the Clock, all the way round'}</div>
          <h1>{winner?.name} wins</h1>
        </div>
        {ordered.map(({ p, i }) => (
          <article key={p.id} className={`result-card${i === st.winnerIndex ? ' first' : ''}`}>
            <header>
              <span className="grow">{p.name}</span>
              {multi && x01 && <span className="sub num" style={{ color: 'var(--cream-2)' }}>{scoreline(i)}</span>}
              {!x01 && <span className="sub num" style={{ color: 'var(--cream-2)' }}>{p.currentTarget > 20 ? 'Finished' : `On ${p.currentTarget}`}</span>}
            </header>
            {x01 && (
              <StatGrid
                items={[
                  ['Average', fmt1(overallAverage(p))],
                  ['Best turn', p.bestTurn],
                  ['Busts', p.bustCount],
                  ['100+', p.count100Plus],
                  ['60+', p.count60Plus],
                  ['40+', p.count40Plus],
                ]}
              />
            )}
          </article>
        ))}
      </div>
      {footer}
    </main>
  )
}
