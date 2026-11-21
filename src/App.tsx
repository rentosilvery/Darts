import { useCallback, useEffect, useState } from 'react'
import { createSession, matchRecords, rematch } from './engine/engine'
import type { Session } from './engine/types'
import { Game } from './screens/Game'
import { Setup } from './screens/Setup'
import { profileStore } from './store/profiles'
import { KEYS, readJSON, requestPersistentStorage, writeJSON } from './store/storage'

export default function App() {
  // The running game is saved after every turn, so closing the app or a phone call never loses it.
  const [session, setSession] = useState<Session | null>(() => readJSON<Session | null>(KEYS.session, null))

  useEffect(() => requestPersistentStorage(), [])
  useEffect(() => writeJSON(KEYS.session, session), [session])

  // When a 301/501 match or league finishes, merge it into saved players' lifetime stats once.
  useEffect(() => {
    if (session?.state.isGameOver && !session.recorded) {
      profileStore.recordMatch(matchRecords(session.state))
      setSession({ ...session, recorded: true })
    }
  }, [session])

  const update = useCallback((fn: (s: Session) => Session) => setSession((s) => (s ? fn(s) : s)), [])

  if (!session) {
    return <Setup onStart={(players, cfg) => setSession(createSession(players, cfg))} />
  }
  return (
    <Game
      session={session}
      update={update}
      onExit={() => setSession(null)}
      onRematch={() => setSession((s) => (s ? rematch(s) : s))}
    />
  )
}
