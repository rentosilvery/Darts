import { Sheet, fmt1 } from '../components/ui'
import { lifetimeAverage, useProfiles, type PlayerProfile } from '../store/profiles'

const winRate = (p: PlayerProfile) => (p.gamesPlayed > 0 ? p.gamesWon / p.gamesPlayed : 0)

/** Players who have played rank above those who haven't; then win %, then average. */
const byRank = (a: PlayerProfile, b: PlayerProfile) =>
  Number(b.gamesPlayed > 0) - Number(a.gamesPlayed > 0) ||
  winRate(b) - winRate(a) ||
  lifetimeAverage(b) - lifetimeAverage(a)

/** Lifetime table of saved players. First column stays put while stats scroll. */
export function HistorySheet({ onClose }: { onClose: () => void }) {
  const profiles = useProfiles()
  const ranked = [...profiles].sort(byRank)

  return (
    <Sheet
      title="Leaderboard"
      subtitle="Lifetime 301 and 501 stats. Ranked by win percentage, then average."
      onClose={onClose}
      full
    >
      {ranked.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing here yet</h3>
          <p>Play a 301 or 501 game with saved players and their numbers will show up here.</p>
        </div>
      ) : (
        <div className="htable-wrap">
          <table className="htable num">
            <thead>
              <tr>
                <th className="sticky">Player</th>
                <th>Win %</th>
                <th>Avg</th>
                <th>Games</th>
                <th>Wins</th>
                <th>Best</th>
                <th>100+</th>
                <th>60+</th>
                <th>40+</th>
                <th>Busts</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p, i) => {
                const played = p.gamesPlayed > 0
                return (
                  <tr key={p.id}>
                    <td className="sticky">
                      <div className="who">
                        <span className="rk">{i + 1}</span>
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td className="avg">{played ? `${Math.round(winRate(p) * 100)}%` : '–'}</td>
                    <td>{played ? fmt1(lifetimeAverage(p)) : '–'}</td>
                    <td>{p.gamesPlayed}</td>
                    <td>{p.gamesWon}</td>
                    <td>{played ? p.bestTurn : '–'}</td>
                    <td>{p.count100Plus}</td>
                    <td>{p.count60Plus}</td>
                    <td>{p.count40Plus}</td>
                    <td>{p.bustCount}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Sheet>
  )
}
