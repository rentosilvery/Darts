# Darts

A darts scorer for phones, built as an installable web app (PWA) with React and TypeScript.
It replaces the pen-and-paper scoreboard for a darts night: one phone is passed around, each
player enters their 3-dart turn total, and the app tracks remaining scores, checkouts,
averages and the winner. Saved players build up lifetime stats.

It is a port of the SwiftUI iOS app (spec preserved in [docs/ios/README.md](docs/ios/README.md)).
There is **no backend**: everything is stored on the device in `localStorage`, and it works offline.

---

## Install on a phone

1. Open the deployed URL (GitHub Pages: `https://rentosilvery.github.io/Darts/`).
2. **iPhone (Safari):** Share → *Add to Home Screen*. **Android (Chrome):** menu → *Install app*.
3. Launch it from the home-screen icon. It opens full-screen and works without a connection.

Each phone keeps its own players and stats. Use **Players → Save backup / Restore backup**
to move them to another phone.

---

## Game modes

### x01 (301 / 501)
Subtract each turn's total; first to land exactly on **0** wins the leg.

- **Bust:** a turn that would go below 0, or leave exactly 1 with *Double out* on, scores
  nothing; the score is restored and play passes to the next player.
- **Double in** (optional): scoring starts only once a player opens on a double. The app asks
  the player to confirm; until they open, turns count but score nothing.
- **Double out** (optional): on reaching 0 the app asks whether the last dart was a double;
  *No* is a bust.
- **Checkout hints** appear at 170 or less, as dart-by-dart routes (e.g. `T20 T20 Bull`).
- The keypad rejects totals that three darts can't make (163, 166, 169, 172, 173, 175, 176, 178, 179).

### Around the Clock
Race through targets **1 → 20**; each turn, enter how many darts hit the current target.
First past 20 wins. Casual mode: **not recorded** in lifetime stats.

## Match formats

- **Single leg:** one leg decides it.
- **Sets & legs:** win `legsToWinSet` legs to take a set, `setsToWin` sets to win the match.
  The leg winner is suggested to throw first in the next leg (the picker lets you change it).
- **League:** a fixed number of games (default 3). Everyone plays every game out; points by
  finishing place (N players: 1st gets N, last gets 1). The last unfinished player is
  auto-finished. A table shows after each game, and a final ranking with per-player stats at the end.

## Statistics

| Stat | Meaning |
|------|---------|
| Average | 3-dart turn average (total scored ÷ turns), not per dart |
| This game / overall | Current leg or game vs all legs/games in the match |
| 100+ / 60+ / 40+ | Cumulative thresholds: a 105 counts for all three |
| Busts | Turns that busted |
| Best turn | Highest single-turn score |

### Saved players and lifetime stats
- A saved player has a name and a colour (10-colour palette).
- In setup, each slot is a saved player or a guest (guests aren't recorded).
- Lifetime stats count **301 and 501 only**. A whole match or league = **one** game played;
  only the overall winner gets a win. **Ending a game early records nothing.**
- The **Leaderboard** ranks saved players by lifetime average with Games, Wins, Avg, Best,
  100+, 60+, 40+ and Busts. The name column stays put while the stats scroll sideways.

## Controls

Numpad + **Enter** for the turn total, **BUST**, **Undo** (full history), **Scores** (all
players), **End** (abandon, records nothing). On a computer the keyboard works too
(digits, Backspace, Enter). The screen stays awake during a game where the browser allows it.

---

## Data & persistence

All in `localStorage`; no server, no accounts.

| Key | Contents |
|-----|----------|
| `darts.profiles.v1` | Saved players and their lifetime totals |
| `darts.session.v1` | The game in progress, saved after every turn so closing the app never loses it |
| `darts.setup.v1` | Last-used setup (mode, rules, format, players) |

The app asks the browser for persistent storage so data isn't evicted. On iOS, data lives in
the home-screen app's own storage, separate from Safari tabs.

---

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine unit tests (Vitest)
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
```

Test on a phone on the same Wi-Fi with `npm run dev -- --host`, then open the printed
network URL.

### Deploying
`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`.
One-time setup: repository **Settings → Pages → Source: GitHub Actions**.

### Structure

```
src/
├─ main.tsx              Entry: fonts, service worker, render
├─ App.tsx               Setup ↔ game switch; persists the session; records lifetime stats
├─ styles.css            Design tokens and all styles
├─ engine/               Pure game rules, no React
│  ├─ types.ts           GameMode, Player, GameState, Prompt, Session
│  ├─ engine.ts          Scoring, bust, double in/out, legs/sets, league, undo
│  ├─ checkout.ts        Checkout routes and impossible-total check
│  └─ engine.test.ts     Rules tests
├─ store/
│  ├─ storage.ts         Safe localStorage helpers and keys
│  └─ profiles.ts        Saved players store, lifetime recording, backup import/export
├─ components/           Sheet, Dialog, Toast, controls, icons
└─ screens/
   ├─ Setup.tsx          Mode, rules, format, players
   ├─ Game.tsx           Live scoring: 3-column header, turns, keypad, prompts
   ├─ Results.tsx        Winner and league-final screens
   ├─ Players.tsx        Roster, editor, slot picker, backup
   └─ History.tsx        Leaderboard table
```
