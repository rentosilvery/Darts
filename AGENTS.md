# AGENTS.md: Darts (web)

Tool-agnostic instructions for AI coding agents. Companion to `README.md` (spec) and
`CLAUDE.md`.

## Project summary
React + TypeScript PWA darts scorer built with Vite. Manual numpad scoring. Modes: 301, 501,
Around the Clock. Formats: single leg, sets & legs, league. Saved players with lifetime
301/501 stats. No backend; everything is in `localStorage` and works offline.

## Where the code lives
- Web app: this folder. Git remote `origin` → `github.com/rentosilvery/Darts`, branch `main`.
- The SwiftUI iOS project lives separately in `~/Documents/XCODE/DartsCounter/`.

## Build / verify
```bash
npm install
npm test        # must pass
npm run build   # must pass (typecheck + bundle + service worker)
```
Report real results; on failure show the full error.

## Code conventions
- Game logic only in `src/engine/` as pure functions; screens in `src/screens/` render and
  dispatch.
- Score-changing actions push an undo snapshot (`begin()`), and use `recordTurn` /
  `recordBust`.
- Design tokens in `src/styles.css`; dark theme only; sentence-case copy.
- Mobile first: test at 390×844, respect safe-area insets, no horizontal page scroll.

## Domain rules to preserve
1. x01: reach exactly 0. Overshoot, or 1 left with double out = bust (0, play passes on).
2. Double in / double out are optional and confirmed by the player.
3. Checkout hints at 170 or less.
4. Around the Clock: targets 1→20, first past 20 wins, never recorded.
5. League: everyone plays each game out; N players → 1st = N … last = 1; default 3 games.
6. Sets & legs: `legsToWinSet` legs = a set, `setsToWin` sets = the match. The leg winner is
   the suggested starter.
7. 100+/60+/40+ cumulative; averages per 3-dart turn.
8. Lifetime stats: 301/501 only; one match/league = one game; only the overall winner wins;
   End Game records nothing.
9. End-of-game stats after every finished x01 game.

## Collaboration rules
- Don't commit or push unless explicitly asked.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- PR trailer: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- Keep the owner's email private.
- Confirm before destructive actions.
