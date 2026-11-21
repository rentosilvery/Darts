# CLAUDE.md: Darts (web)

Guidance for Claude Code in this repository. `README.md` is the feature and rules spec; this
file covers how to work on the code. See also `AGENTS.md`.

## What this is
A React + TypeScript PWA darts scorer (Vite, `vite-plugin-pwa`). Manual numpad input. No
backend: all data in `localStorage`. Port of the SwiftUI app.

## Layout
- This folder (`~/Documents/Claude/DartsCounter`) is the web app and its git repo
  (`origin` = `https://github.com/rentosilvery/Darts.git`, branch `main`).
- The SwiftUI Xcode project lives separately at `~/Documents/XCODE/DartsCounter/`.
- **Live at https://rentosilvery.github.io/Darts/** (GitHub Pages, deployed by
  `.github/workflows/deploy.yml`).

## Commands
```bash
npm run dev      # dev server on :5173
npm test         # Vitest engine tests
npm run build    # tsc -b && vite build
```
A change isn't done until `npm test` and `npm run build` both pass. Check UI changes in the
browser at phone size (390×844).

## Conventions
- **All game rules live in `src/engine/engine.ts`** as pure functions `Session → Session`.
  Screens never change game state directly; they call `update(fn)`.
- Every action that changes scores goes through `begin()` (pushes an undo snapshot). Use
  `recordTurn` / `recordBust` so averages and threshold counts stay consistent.
- Questions the game waits on (starting player, double in/out, league table, results) are a
  single `session.prompt`; short notices (bust, player finished) are `session.flash`.
- Lifetime stats are written once in `App.tsx` when `state.isGameOver && !recorded`.
- Styling: tokens in `src/styles.css` `:root` (`--ink*`, `--cream*`, `--gold`, `--red`,
  `--green`, `--display`, `--text`). No raw colours in components. Players have no colours, by design.
  Dark only. Display type is Big Shoulders Display; UI type is Instrument Sans (bundled via
  `@fontsource`, so offline works).
- Copy is sentence case, plain verbs, no all-caps labels (BUST key is the one exception).
- Wrap every storage access in try/catch (see `store/storage.ts`).

## Rules invariants (do not break)
- 100+/60+/40+ are cumulative; averages are 3-dart turn averages.
- Overshoot, or 1 left with double out = bust: scores nothing, play passes on.
- Around the Clock never touches lifetime stats.
- One match or league = one `gamesPlayed`; only the overall winner gets a win; End Game
  records nothing.
- League points: N players → 1st gets N … last gets 1; last unfinished player auto-finishes.
- The leg winner is the suggested starter for the next leg.

## Storage keys
`darts.profiles.v1`, `darts.session.v1`, `darts.setup.v1`. Real players' stats now live in
these keys on their phones, and there is no server copy. If a shape changes incompatibly,
bump the version suffix and **migrate the old data**; never drop or reset it. Old saved
sessions must not crash the app.

## Deployment
- Every push to `main` runs the workflow (test → build → publish) and goes live in about a
  minute. **Pushing to `main` is a release to everyone's phones**, so only push work that
  passes `npm test` and `npm run build` and was checked at phone size.
- Pages serves under `/Darts/`; the workflow sets `BASE_PATH`, and `vite.config.ts` uses it for
  `base`, `start_url` and `scope`. Never hard-code a leading `/` for assets; use relative
  paths or `import.meta.env.BASE_URL`. Check with
  `BASE_PATH=/Darts/ npm run build && npm run preview`.
- The service worker (`registerType: 'autoUpdate'`) precaches the build; installed apps update
  on their next full launch. New file types that must work offline need adding to
  `workbox.globPatterns`.
- After a push, verify the live site: `curl -sI https://rentosilvery.github.io/Darts/`
  should return 200, then open it at 390×844.

## Git
- Commit or push only when the user explicitly asks.
- End commit messages with: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- End PR descriptions with: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

## Privacy
The owner's email address is private; never include it in external requests.
