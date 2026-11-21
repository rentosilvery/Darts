# Darts

A darts scorer for phones, built as an installable web app (PWA) with React and TypeScript.
It replaces the pen-and-paper scoreboard for a darts night: one phone is passed around, each
player enters their 3-dart turn total, and the app tracks remaining scores, checkouts,
averages and the winner. Saved players build up lifetime stats.

It is a port of the earlier SwiftUI iOS app.
There is **no backend**: everything is stored on the device in `localStorage`, and it works offline.

**Live app: https://rentosilvery.github.io/Darts/**

---

## Install on a phone

- **iPhone:** open the link in **Safari** (Chrome on iOS can't install web apps), tap
  **Share** → **Add to Home Screen** → **Add**.
- **Android:** open the link in **Chrome**, menu **⋮** → **Install app** (or *Add to Home screen*).
- **Computer:** just open the link; Chrome and Edge also offer an install icon in the address bar.

Open it from the home-screen icon from then on: it runs full-screen and works with no connection.

Good to know:
- **Data is per device.** Players and stats live only on that phone. On iPhone the
  home-screen app and Safari tabs have **separate** storage, so always use the icon.
- **Moving to a new phone:** **Players → Save backup** on the old one, **Restore backup** on the new one.
- **Updates are automatic.** A push to `main` is live in about a minute; an installed app picks it up
  the next time it's fully closed and reopened.
- **Sharing:** send friends the same link; each person's data stays on their own phone.

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
- A saved player is just a name (no colours or avatars).
- In setup, each slot is a saved player or a guest (guests aren't recorded).
- Lifetime stats count **301 and 501 only**. A whole match or league = **one** game played;
  only the overall winner gets a win. **Ending a game early records nothing.**
- The **Leaderboard** ranks saved players by **win percentage** (wins ÷ games), then by lifetime
  average as the tie-break; players with no games yet go last. Columns: Win %, Avg, Games, Wins,
  Best, 100+, 60+, 40+, Busts. The name column stays put while the stats scroll sideways.

## Controls

Numpad + **Enter** for the turn total, **BUST**, **Undo** (the arrow beside Enter; full
history), **Scores** (all players), **End** (abandon, records nothing). Under the current
player, their turns this leg are listed (turn number, score, before → after). Two rows show at
a time, newest at the bottom; scroll up for earlier turns. It jumps back to the newest turn
whenever the next player is up. On a computer the keyboard works too
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

### Deploying (GitHub Pages)
The app is hosted free on GitHub Pages at https://rentosilvery.github.io/Darts/.

- `.github/workflows/deploy.yml` runs on **every push to `main`**: install → `npm test` →
  `npm run build` → publish `dist/`. **Pushing to `main` is a release**; it reaches everyone's
  phones.
- **Run it by hand:** GitHub → **Actions** → **Deploy to GitHub Pages** → **Run workflow** →
  branch `main` → **Run workflow**. A green tick on both *build* and *deploy* means it's live.
- **If a run fails:** open the failed step to read the error. "Pages not enabled" means
  **Settings → Pages → Source** must be **GitHub Actions** (already set). A billing or visibility
  error means the repo was made private on a free plan; Pages needs it public.
- **Base path:** Pages serves the app under `/Darts/`. The workflow sets `BASE_PATH=/Darts/`
  (from the repo name) and `vite.config.ts` uses it for `base`, the manifest `start_url` and
  `scope`. Locally it defaults to `/`. Reference anything in `public/` with a relative path or
  `import.meta.env.BASE_URL`, never a leading `/`.
- To check a production build locally with the same path:
  `BASE_PATH=/Darts/ npm run build && npm run preview`.

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
   ├─ Game.tsx           Live scoring: 3-column header, scrollable turns, keypad, prompts
   ├─ Results.tsx        Winner and league-final screens
   ├─ Players.tsx        Roster, editor, slot picker, backup
   └─ History.tsx        Leaderboard table
```
