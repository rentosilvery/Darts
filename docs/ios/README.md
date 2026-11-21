# DartsCounter

A SwiftUI iOS/iPad app for scoring darts matches. Manual numpad input, persistent
player profiles with lifetime stats, league play, and sets/legs matches.

---

## Purpose

DartsCounter replaces the pen-and-paper scoreboard for a darts night. One device is
passed around the group; each player enters their 3-dart turn total on a numpad and
the app tracks remaining scores, checkouts, averages, and who won. Lifetime stats are
kept per named player across every game they play.

There is **no camera / automatic dart detection** — scoring is entirely manual.

---

## Game Modes

### x01 (301 / 501)
Each player starts at the chosen score (301 or 501) and subtracts each turn's total.
First to land exactly on **0** wins the leg.

- **Bust:** a turn that would take the score below 0 — or to exactly 1 when *Double Out*
  is on — scores nothing; the player's score is restored and play passes on.
- **Double In** (optional): a player's scoring doesn't start until they open on a double.
  Because input is manual, when Double In is on the app asks the player to confirm whether
  this turn opened on a double. Until they open, turns score nothing.
- **Double Out** (optional): the final dart to reach 0 must be a double. On reaching 0 the
  app asks the player to confirm the checkout was a double; if not, the turn busts.
- **Checkout hints:** when a player's remaining score is ≤ 170 the app shows a suggested
  finish combination (e.g. `100 → T20 D20`).

### Around the Clock
Players race through targets **1 → 20**. Each turn advances the player's current target by
the number of hits entered. First to clear past 20 wins. Around the Clock is a casual mode
and is **not recorded** in lifetime profile stats.

---

## Match Formats

### Single leg
One leg decides the game.

### Sets & Legs
- A **leg** is a single game to 0.
- Win `legsToWinSet` legs to take a **set**.
- Win `setsToWin` sets to win the **match**.
- The leg winner starts the next leg; the starting-player picker appears between legs.

### League
A round-robin-style points competition over a fixed number of games (`leagueGameCount`,
default 3).

- All players play each game to the finish (not just first-to-win).
- Players finish in order; **points are awarded by finish position**: with _N_ players, 1st
  gets _N_ points, 2nd gets _N−1_, down to the last.
- When only one player is left unfinished, they are auto-finished last.
- Running totals: during a league the app shows each player's **round average** (current
  game) and **overall average** (all games so far).
- After the final game, a **league final screen** ranks players by total points and shows,
  per player: total points, overall average, per-game averages, 100+/60+/40+ counts, bust
  count, and best turn.

---

## Scoring & Statistics

Per-turn (3 darts) a player's entered total is recorded. From these, the app tracks:

| Stat | Meaning |
|------|---------|
| **Round average** | Average turn score for the **current** game/leg |
| **Overall average** | Average turn score across **all** legs/games this match |
| **100+ / 60+ / 40+** | Count of turns scoring **≥ 100 / ≥ 60 / ≥ 40** (cumulative thresholds) |
| **Busts** | Count of turns that busted (scored 0) |
| **Best turn** | Highest single-turn (3-dart) score |

Stat definitions:
- Thresholds are **cumulative** — a turn of 105 counts toward 100+, 60+, and 40+.
- Averages are **3-dart turn averages** (total scored ÷ turns played), not per-dart.

End-of-game stats are shown after **every** finished game (all x01 modes), not only league.

---

## Player Profiles & History

Players can be defined once on a dedicated **Players** screen and reused in any game.

- A profile has a **name** and a **color** (10-color palette; no avatars).
- In game setup, each player slot can be a saved profile or a one-off guest name.
- **Lifetime stats are tracked for x01 (301 & 501) only.** Around the Clock is excluded.
- Lifetime aggregates per profile: games played, games won, total rounds, total scored,
  100+/60+/40+, busts, best turn, lifetime 3-dart average, and last-played date.
- Depth is **lifetime totals only** — no per-game log and no individual throw log.

### What counts as one recorded game
- A whole **sets/legs match** or a whole **league** counts as **one** `gamesPlayed`
  increment per profile, with all that match's turns merged into their lifetime totals.
- Only the **overall winner** of the match/league gets a win credited.
- If a game is abandoned via **End Game**, **nothing** is recorded.

### In-game header
The game screen shows three players: **previous on the left**, **current in the middle**
(prominent), **next on the right** — each with their color and score.

### History screen
A separate **History** table lists every profile ranked by **highest lifetime average**,
with columns: Games, Wins, Avg, Best, 100+, 60+, 40+, Busts. The table scrolls horizontally
with the rank+name column frozen; the stat columns slide.

---

## Controls

- **Numpad:** enter a 3-dart turn total, then Enter.
- **Bust:** marks the current turn as a bust.
- **Undo:** reverts the last action (full state history).
- **All Scores:** sheet listing every player's current score and averages.
- **Starting-player picker:** choose who throws first at the start of each leg.
- **End Game:** abandons the current game (records nothing) and returns to setup.

---

## Data & Persistence

- Profiles and their lifetime stats are stored locally via **UserDefaults** (JSON/Codable),
  under the key `playerProfiles.v1`, managed by `ProfileStore`.
- In-match state (current scores, round history, league points) lives in memory for the
  duration of the game only.

---

## Architecture

SwiftUI, iOS 17+ (`@Observable` / `@Bindable`), dark theme.

```
DartsCounter/
├─ DartsCounterApp.swift        App entry; dark theme + accent tint
├─ Models/
│  ├─ GameMode.swift            x01(Int) | aroundTheClock; startingScore
│  ├─ GameState.swift           Full match state (scores, legs, sets, league)
│  ├─ Player.swift              In-game player + RoundEntry + LeagueFinalStats
│  └─ PlayerProfile.swift       Persistent identity + lifetime aggregates + palette
├─ ViewModels/
│  └─ GameViewModel.swift       All game rules: scoring, bust, double in/out,
│                               legs/sets, league, checkout hints, undo, stat recording
├─ Storage/
│  └─ ProfileStore.swift        @Observable store; CRUD + recordCompletedGame; UserDefaults
└─ Views/
   ├─ Theme.swift               Design tokens (colors, gradients, card style)
   ├─ SetupView.swift           Mode/format/players setup; History & Players buttons
   ├─ ManualGameView.swift      Main game screen: 3-col header, history, numpad
   ├─ GameView.swift            Hosts ManualGameView + winner cover
   ├─ WinnerView.swift          Per-player end-of-game stat cards
   ├─ AllScoresView.swift       Live all-players score sheet
   ├─ PlayersView.swift         Profile roster + editor + slot picker
   └─ HistoryView.swift         Per-player lifetime stats table (frozen first column)
```

Key rules live in `GameViewModel` — see `applyX01Score`, `handleLegWon`,
`handleLeaguePlayerFinished`, `handleLeagueLegComplete`, and `recordScoringTurn`.
