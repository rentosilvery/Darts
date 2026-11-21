# CLAUDE.md — DartsCounter

Guidance for Claude Code when working in this repository. Read `README.md` for the full
feature and rules spec; this file covers how to work on the code.

## What this is
A SwiftUI iOS/iPad darts scoring app. Manual numpad input only (no camera). Persistent
player profiles with lifetime x01 stats, league play, and sets/legs matches.

## Project layout & source of truth
- The **authoritative Xcode project** lives at
  `/Users/renatopodvratnik/Documents/XCODE/DartsCounter/` (target source under
  `DartsCounter/`). Build and edit there.
- This folder (`Documents/Claude/DartsCounter/`) holds **docs and may contain an older
  duplicate** of the sources (including a stale `Camera/` folder from the removed
  auto-counter). Do **not** treat the duplicate as current — camera/auto-counting was
  removed; scoring is manual.

## Build & run
Build from the Xcode project directory:

```bash
xcodebuild -project DartsCounter.xcodeproj -scheme DartsCounter -destination 'id=<SIMULATOR_UDID>' build
```

- `id=281CD33B-BCD3-43C1-974A-5EBD376974E0` is a known iPhone 16 (iOS 18.4) simulator used
  previously. Confirm it still exists (`xcrun simctl list devices`) before relying on it.
- To let the user see it running, prefer the iOS Simulator tool: `attach` first (before
  building), then `build` → `launch`.
- Always verify a change compiles with `xcodebuild ... build` before reporting it done.

## Conventions
- **SwiftUI + `@Observable`** (iOS 17+), `@Bindable`, `@State`, `@Environment(\.dismiss)`.
  No Combine `ObservableObject` for new code.
- **Xcode folder sync** (`PBXFileSystemSynchronizedRootGroup`): files are auto-included by
  folder. Adding/removing a `.swift` file on disk updates the build automatically — no
  pbxproj edit needed. Only `Info.plist` keys require pbxproj changes.
- **Theme:** use tokens from `Views/Theme.swift` (`Theme.accent` gold, `Theme.red`,
  `Theme.green`, `Theme.background`, `Theme.ctaGradient`, `.themeCard()`). Do not hardcode
  `Color.orange` etc. — route through the theme. App is dark-mode only
  (`.preferredColorScheme(.dark)`).
- **Game rules belong in `GameViewModel`**, not in views. Scoring, bust, double in/out,
  legs/sets, league points, checkout hints, undo, and stat recording are all there.
- **Stat recording** goes through `recordScoringTurn(idx:scoreBefore:scored:)` — reuse it so
  profiles, averages, and threshold counts stay consistent across all scoring paths.

## Rules invariants (do not break)
- **100+/60+/40+ are cumulative** (a 105 counts for all three). Averages are **3-dart turn
  averages** (total ÷ turns), not per-dart.
- **Overall** = across all legs/games this match; **Round** = current game/leg only.
- **Around the Clock is excluded** from all profile/lifetime stats.
- A full sets/legs match or a full league = **one** `gamesPlayed` per profile; only the
  **overall winner** gets a win; **End Game records nothing**.
- End-of-game stats (`WinnerView`) show for **all x01 games**, not only league.

## Persistence
- Profiles persist via `ProfileStore` → UserDefaults key `playerProfiles.v1` (Codable JSON).
- `ProfileStore` imports only Foundation/Observation — SwiftUI-only helpers like
  `remove(atOffsets:)` are not available there; delete indices manually.

## Git
- Default branch is `main`; the user has committed directly to `main`.
- **Commit/push only when the user explicitly asks.** Branch first only if the user wants a
  PR.
- There was a messy history episode: real sources were untracked and dead root-level
  duplicates existed. Be explicit in commit messages about what is and isn't included.
- End commit messages with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- End PR descriptions with:
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

## Privacy
- The owner's email address is **private** — never include it in
  external requests without explicit approval.
