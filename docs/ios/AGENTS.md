# AGENTS.md — DartsCounter

Instructions for AI coding agents working on this project. Companion to `README.md`
(feature/rules spec) and `CLAUDE.md` (Claude Code specifics). The guidance below is
tool-agnostic.

## Project summary
SwiftUI iOS/iPad darts scoring app. Manual numpad scoring (no camera). Modes: x01
(301/501) and Around the Clock. Formats: single leg, sets & legs, league. Persistent
player profiles with lifetime x01 stats stored locally.

## Where the code lives
- **Authoritative project:** `/Users/renatopodvratnik/Documents/XCODE/DartsCounter/`
  (sources under `DartsCounter/`). Edit and build here.
- This docs folder may contain a **stale duplicate** of the sources (including an obsolete
  `Camera/` folder). Ignore it as a source of truth — the camera/auto-counter feature was
  removed; input is manual only.

## Build / verify
```bash
xcodebuild -project DartsCounter.xcodeproj -scheme DartsCounter -destination 'id=<SIM_UDID>' build
```
- Confirm a simulator UDID with `xcrun simctl list devices`.
- A change is not "done" until `xcodebuild ... build` succeeds. Report the real result; if a
  build fails, show the error.

## Code conventions
- SwiftUI, iOS 17+, `@Observable` / `@Bindable` (not `ObservableObject`).
- Xcode uses filesystem-synced groups: adding/removing `.swift` files on disk is enough; no
  `project.pbxproj` edits except for `Info.plist` keys.
- Theme everything through `Views/Theme.swift` tokens; no raw system colors. Dark mode only.
- All game logic lives in `ViewModels/GameViewModel.swift`. Views are presentation only.

## Domain rules an agent must preserve
1. **x01:** subtract turn totals to reach exactly 0. Overshoot (or landing on 1 with Double
   Out) = **bust**, scores nothing.
2. **Double In / Double Out** are optional and confirmed by the user via alerts (manual
   input can't detect doubles).
3. **Checkout hints** appear when remaining ≤ 170.
4. **Around the Clock:** advance targets 1→20; first past 20 wins; **not tracked** in stats.
5. **League:** every player plays each game out; points by finish position (N players → 1st
   = N, last = 1). Default `leagueGameCount` = 3. Final screen ranks by total points.
6. **Sets & legs:** win `legsToWinSet` legs → a set; win `setsToWin` sets → the match. Leg
   winner starts next leg.
7. **Stats:** 100+/60+/40+ are **cumulative** thresholds; averages are **3-dart turn**
   averages. "Overall" = all games this match, "Round" = current game.
8. **Profiles:** lifetime stats for **x01 only**. A full match/league = one `gamesPlayed`;
   only the overall winner gets a win; **End Game records nothing**.
9. **End-of-game stats** display after every finished x01 game, not just league.

Route every scoring path through `recordScoringTurn(...)` so stats stay consistent.

## Persistence
- `ProfileStore` → UserDefaults key `playerProfiles.v1` (Codable JSON). Profiles only;
  in-match state is in-memory.
- `ProfileStore` has no SwiftUI import — avoid SwiftUI-only collection helpers there.

## Collaboration rules
- **Do not commit or push unless explicitly asked.** Default branch `main`.
- Be honest about what's included in a commit; this repo had a prior untracked-sources /
  dead-duplicate mess.
- Commit message trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- PR description trailer: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Treat the owner's email address as private; never send it to external services without
  explicit approval.

## Safety
- Confirm before destructive or irreversible actions.
- Report outcomes faithfully — failing builds/tests get their full output, not a summary.
