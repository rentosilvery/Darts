import { useEffect, useState } from 'react'
import { IconChart, IconChevron, IconClose, IconPeople, IconPlus } from '../components/Icons'
import { Segmented, StepperRow, SwitchRow } from '../components/ui'
import type { GameConfig } from '../engine/types'
import { getProfile, useProfiles } from '../store/profiles'
import { KEYS, readJSON, writeJSON } from '../store/storage'
import { HistorySheet } from './History'
import { PlayerPicker, PlayersSheet } from './Players'

type ModeKey = '501' | '301' | 'atc'
interface Slot { name: string; profileId?: string }
interface SetupPrefs {
  mode: ModeKey
  doubleIn: boolean
  doubleOut: boolean
  format: 'match' | 'league'
  legs: number
  sets: number
  leagueGames: number
  slots: Slot[]
}

const DEFAULTS: SetupPrefs = {
  mode: '501',
  doubleIn: false,
  doubleOut: false,
  format: 'match',
  legs: 1,
  sets: 1,
  leagueGames: 3,
  slots: [{ name: '' }, { name: '' }],
}

const MAX_PLAYERS = 8

export function Setup({ onStart }: { onStart: (players: Slot[], cfg: GameConfig) => void }) {
  const [prefs, setPrefs] = useState<SetupPrefs>(() => ({ ...DEFAULTS, ...readJSON(KEYS.setup, {}) }))
  const [picking, setPicking] = useState<number | null>(null)
  const [sheet, setSheet] = useState<'players' | 'history' | null>(null)
  useProfiles() // re-render when profiles change (names, colours, deletions)

  useEffect(() => writeJSON(KEYS.setup, prefs), [prefs])

  const set = <K extends keyof SetupPrefs>(k: K, v: SetupPrefs[K]) => setPrefs((p) => ({ ...p, [k]: v }))
  const x01 = prefs.mode !== 'atc'

  // A slot pointing at a deleted profile becomes a guest with the same name.
  const slots = prefs.slots.map((s) => (s.profileId && !getProfile(s.profileId) ? { name: s.name } : s))
  const setSlot = (i: number, slot: Slot) => set('slots', slots.map((s, j) => (j === i ? slot : s)))

  const start = () => {
    const players = slots.map((s, i) => ({
      name: (s.profileId ? getProfile(s.profileId)?.name : s.name)?.trim() || `Player ${i + 1}`,
      profileId: s.profileId,
    }))
    onStart(players, {
      mode: prefs.mode === 'atc' ? { kind: 'atc' } : { kind: 'x01', start: prefs.mode === '501' ? 501 : 301 },
      doubleIn: x01 && prefs.doubleIn,
      doubleOut: x01 && prefs.doubleOut,
      leagueMode: x01 && prefs.format === 'league',
      legsToWinSet: x01 && prefs.format === 'match' ? prefs.legs : 1,
      setsToWin: x01 && prefs.format === 'match' ? prefs.sets : 1,
      leagueGameCount: prefs.leagueGames,
    })
  }

  return (
    <main className="screen">
      <header className="topbar">
        <h1 className="wordmark">Darts</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="icon-btn" aria-label="Leaderboard" onClick={() => setSheet('history')}>
            <IconChart />
          </button>
          <button className="icon-btn" aria-label="Players" onClick={() => setSheet('players')}>
            <IconPeople />
          </button>
        </div>
      </header>

      <div className="scroll">
        <section className="group" style={{ marginTop: 12 }}>
          <h2>Game</h2>
          <Segmented<ModeKey>
            label="Game"
            value={prefs.mode}
            onChange={(v) => set('mode', v)}
            options={[
              { value: '501', label: '501', big: true },
              { value: '301', label: '301', big: true },
              { value: 'atc', label: 'Around the Clock' },
            ]}
          />
        </section>

        {x01 && (
          <>
            <section className="group">
              <h2>Rules</h2>
              <div className="panel">
                <SwitchRow label="Double in" sub="Scoring starts on a double" checked={prefs.doubleIn} onChange={(v) => set('doubleIn', v)} />
                <SwitchRow label="Double out" sub="Finish on a double" checked={prefs.doubleOut} onChange={(v) => set('doubleOut', v)} />
              </div>
            </section>

            <section className="group">
              <h2>Format</h2>
              <Segmented
                label="Format"
                value={prefs.format}
                onChange={(v) => set('format', v)}
                options={[
                  { value: 'match', label: 'Match' },
                  { value: 'league', label: 'League' },
                ]}
              />
              <div className="panel" style={{ marginTop: 10 }}>
                {prefs.format === 'match' ? (
                  <>
                    <StepperRow label="Legs per set" value={prefs.legs} min={1} max={5} onChange={(v) => set('legs', v)} />
                    <StepperRow label="Sets to win" value={prefs.sets} min={1} max={5} onChange={(v) => set('sets', v)} />
                  </>
                ) : (
                  <StepperRow label="Games" value={prefs.leagueGames} min={1} max={20} onChange={(v) => set('leagueGames', v)} />
                )}
              </div>
              <p className="note" style={{ margin: '10px 2px 0' }}>
                {prefs.format === 'match'
                  ? prefs.legs === 1 && prefs.sets === 1
                    ? 'One leg decides it.'
                    : prefs.sets === 1
                      ? `First to ${prefs.legs} legs wins.`
                      : `First to ${prefs.legs} ${prefs.legs === 1 ? 'leg' : 'legs'} takes a set, first to ${prefs.sets} sets wins.`
                  : 'Everyone plays each game out. Points by finishing place: first gets one point per player, last gets one.'}
              </p>
            </section>
          </>
        )}

        <section className="group">
          <h2>Players</h2>
          <div className="panel">
            {slots.map((s, i) => {
              const name = s.profileId ? getProfile(s.profileId)?.name : s.name
              return (
                <div key={i} className="row" style={{ paddingRight: 8 }}>
                  <button
                    style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, minHeight: 44, textAlign: 'left' }}
                    onClick={() => setPicking(i)}
                  >
                    <span className="slot-index num">{i + 1}</span>
                    <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name ? (
                        <>
                          <span className="label">{name}</span>
                          {!s.profileId && <span className="sub"> guest</span>}
                        </>
                      ) : (
                        <span className="muted">Choose player</span>
                      )}
                    </span>
                    <IconChevron width={18} height={18} className="muted" />
                  </button>
                  {slots.length > 1 && (
                    <button
                      className="icon-btn"
                      style={{ width: 36, height: 36, background: 'transparent', border: 0, color: 'var(--cream-3)' }}
                      aria-label={`Remove player ${i + 1}`}
                      onClick={() => set('slots', slots.filter((_, j) => j !== i))}
                    >
                      <IconClose width={16} height={16} />
                    </button>
                  )}
                </div>
              )
            })}
            {slots.length < MAX_PLAYERS && (
              <button className="row" onClick={() => set('slots', [...slots, { name: '' }])}>
                <span className="slot-index" />
                <IconPlus width={18} height={18} style={{ color: 'var(--gold)' }} />
                <span className="grow" style={{ color: 'var(--gold)', fontWeight: 600 }}>Add player</span>
              </button>
            )}
          </div>
        </section>

        <p className="credit">Created by <b>Poda Tech</b></p>
      </div>

      <div className="dock">
        <button className="cta" onClick={start}>
          Start game
        </button>
      </div>

      {picking !== null && (
        <PlayerPicker
          slot={picking}
          currentProfileId={slots[picking]?.profileId}
          takenIds={slots.flatMap((s) => (s.profileId ? [s.profileId] : []))}
          onClose={() => setPicking(null)}
          onPick={(name, profileId) => {
            setSlot(picking, { name, profileId })
            setPicking(null)
          }}
          onManage={() => {
            setPicking(null)
            setSheet('players')
          }}
        />
      )}
      {sheet === 'players' && <PlayersSheet onClose={() => setSheet(null)} />}
      {sheet === 'history' && <HistorySheet onClose={() => setSheet(null)} />}
    </main>
  )
}
