import { useRef, useState } from 'react'
import { IconChevron, IconPlus } from '../components/Icons'
import { Dialog, Sheet, StatGrid, fmt1 } from '../components/ui'
import {
  blankProfile, lifetimeAverage, profileStore, useProfiles, type PlayerProfile,
} from '../store/profiles'

/** Roster of saved players. */
export function PlayersSheet({ onClose }: { onClose: () => void }) {
  const profiles = useProfiles()
  const [editing, setEditing] = useState<PlayerProfile | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const startNew = () => {
    setIsNew(true)
    setEditing(blankProfile(''))
  }

  const exportBackup = () => {
    const blob = new Blob([profileStore.exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `darts-players-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const importBackup = async (file?: File) => {
    if (!file) return
    try {
      const n = profileStore.importJSON(await file.text())
      setNotice(n === 1 ? 'Restored 1 player.' : `Restored ${n} players.`)
    } catch (e) {
      setNotice(e instanceof Error && e.message.includes('players') ? e.message : 'That file isn’t a Darts backup.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <Sheet
        title="Players"
        subtitle="Saved players keep lifetime 301 and 501 stats."
        onClose={onClose}
        full
        footer={
          <button className="cta" onClick={startNew}>
            Add player
          </button>
        }
      >
        {profiles.length === 0 ? (
          <div className="empty-state">
            <h3>No saved players yet</h3>
            <p>Add the people you play with, then pick them when you set up a game.</p>
          </div>
        ) : (
          <div className="panel">
            {profiles.map((p) => (
              <button key={p.id} className="row" onClick={() => { setIsNew(false); setEditing(p) }}>
                <span className="grow">
                  <span className="label">{p.name}</span>
                  <span className="sub" style={{ display: 'block' }}>
                    {p.gamesPlayed > 0
                      ? `${p.gamesPlayed} ${p.gamesPlayed === 1 ? 'game' : 'games'}, average ${fmt1(lifetimeAverage(p))}`
                      : 'No games yet'}
                  </span>
                </span>
                <IconChevron width={18} height={18} className="muted" />
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 28 }}>
          <p className="note">
            Everything is stored on this device only. Save a backup file now and then, and restore it on a new phone.
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            <button className="text-btn gold" onClick={exportBackup} disabled={profiles.length === 0}>
              Save backup
            </button>
            <button className="text-btn gold" onClick={() => fileRef.current?.click()}>
              Restore backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => importBackup(e.target.files?.[0])}
            />
          </div>
        </div>
      </Sheet>

      {editing && (
        <PlayerEditor
          profile={editing}
          isNew={isNew}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            if (isNew) profileStore.add(p)
            else profileStore.update(p)
            setEditing(null)
          }}
          onDelete={() => {
            profileStore.remove(editing.id)
            setEditing(null)
          }}
        />
      )}

      {notice && (
        <Dialog title="Backup" body={notice} onClose={() => setNotice(null)}>
          <button className="cta quiet" onClick={() => setNotice(null)}>OK</button>
        </Dialog>
      )}
    </>
  )
}

function PlayerEditor(props: {
  profile: PlayerProfile
  isNew: boolean
  onClose: () => void
  onSave: (p: PlayerProfile) => void
  onDelete: () => void
}) {
  const [p, setP] = useState(props.profile)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const name = p.name.trim()

  return (
    <>
      <Sheet
        title={props.isNew ? 'New player' : name || 'Player'}
        onClose={props.onClose}
        closeLabel="Cancel"
        full
        footer={
          <button className="cta" disabled={!name} onClick={() => props.onSave({ ...p, name })}>
            {props.isNew ? 'Add player' : 'Save changes'}
          </button>
        }
      >
        <div className="field">
          <input
            aria-label="Player name"
            placeholder="Name"
            value={p.name}
            autoFocus={props.isNew}
            autoCapitalize="words"
            autoComplete="off"
            maxLength={24}
            onChange={(e) => setP({ ...p, name: e.target.value })}
          />
        </div>

        {!props.isNew && (
          <div className="group">
            <h2>Lifetime, 301 and 501</h2>
            {p.gamesPlayed > 0 ? (
              <>
                <StatGrid
                  items={[
                    ['Games', p.gamesPlayed],
                    ['Wins', p.gamesWon],
                    ['Average', fmt1(lifetimeAverage(p))],
                    ['Best turn', p.bestTurn],
                    ['100+', p.count100Plus],
                    ['60+', p.count60Plus],
                    ['40+', p.count40Plus],
                    ['Busts', p.bustCount],
                    ['Turns', p.totalRounds],
                  ]}
                />
                {p.lastPlayed && (
                  <p className="note" style={{ marginTop: 10 }}>
                    Last played {new Date(p.lastPlayed).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </>
            ) : (
              <p className="note">Finish a 301 or 501 game with this player to start their record.</p>
            )}
            <button className="text-btn danger" style={{ marginTop: 18 }} onClick={() => setConfirmDelete(true)}>
              Delete player
            </button>
          </div>
        )}
      </Sheet>

      {confirmDelete && (
        <Dialog
          title={`Delete ${name || 'player'}?`}
          body="Their lifetime stats are removed from this phone. This can’t be undone."
          onClose={() => setConfirmDelete(false)}
        >
          <button className="cta" onClick={props.onDelete}>Delete player</button>
          <button className="cta quiet" onClick={() => setConfirmDelete(false)}>Keep</button>
        </Dialog>
      )}
    </>
  )
}

/** Pick a saved player or type a guest name for one slot in game setup. */
export function PlayerPicker(props: {
  slot: number
  currentProfileId?: string
  takenIds: string[]
  onPick: (name: string, profileId?: string) => void
  onClose: () => void
  onManage: () => void
}) {
  const profiles = useProfiles()
  const [guest, setGuest] = useState('')
  const g = guest.trim()

  return (
    <Sheet title={`Player ${props.slot + 1}`} onClose={props.onClose}>
      {profiles.length > 0 && (
        <div className="panel" style={{ marginBottom: 22 }}>
          {profiles.map((p) => {
            const taken = props.takenIds.includes(p.id) && p.id !== props.currentProfileId
            return (
              <button
                key={p.id}
                className="choice"
                disabled={taken}
                style={taken ? { opacity: 0.35 } : undefined}
                aria-pressed={p.id === props.currentProfileId}
                onClick={() => props.onPick(p.name, p.id)}
              >
                <span className="grow">{p.name}</span>
                {taken && <span className="sub">Already playing</span>}
              </button>
            )
          })}
        </div>
      )}

      <div className="group" style={{ marginTop: 0 }}>
        <h2>Guest, stats not saved</h2>
        <form
          className="field"
          onSubmit={(e) => {
            e.preventDefault()
            if (g) props.onPick(g)
          }}
        >
          <input
            aria-label="Guest name"
            placeholder="Guest name"
            value={guest}
            autoCapitalize="words"
            autoComplete="off"
            maxLength={24}
            onChange={(e) => setGuest(e.target.value)}
          />
          <button className="small-btn" disabled={!g}>Use</button>
        </form>
      </div>

      <button className="text-btn gold" style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 6 }} onClick={props.onManage}>
        <IconPlus width={16} height={16} /> Add a saved player
      </button>
    </Sheet>
  )
}
