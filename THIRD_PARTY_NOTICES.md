# Third-party attribution

## Tower Building Game

- Project: [iamkun/tower_game](https://github.com/iamkun/tower_game)
- Audited revision: `c6fa84afe179b661fa71cf7cc8788d0c47ca2875`
- Copyright: Copyright (c) 2018 BMQB, Inc
- License supplied in the upstream root: MIT; verbatim copy in `vendor/tower-game/LICENSE`.
- The same revision's `package.json` says `ISC`, while its root LICENSE and README say MIT. This delivery preserves the actual root license instead of treating the package metadata as a replacement license.

### Adaptation boundary

`src/game/hook.ts` adapts the pendulum endpoint geometry from [`src/hook.js`](https://github.com/iamkun/tower_game/blob/c6fa84afe179b661fa71cf7cc8788d0c47ca2875/src/hook.js) and [`src/block.js`](https://github.com/iamkun/tower_game/blob/c6fa84afe179b661fa71cf7cc8788d0c47ca2875/src/block.js). The adapted function uses a sinusoidal angle and the sine/cosine endpoint projection. It returns offsets from the pivot and takes an explicit phase in radians, an amplitude in degrees, and a rope length.

The upstream engine, cooljs dependency, assets, audio, HTML, analytics, three-life failure logic, old scoring, collision classifications, tower motion, and time-dependent difficulty callbacks are **not** included or claimed to be reused. The game state machine, fixed-step vertical drop, center-distance landing rules, one-miss game over, 8-second deadline, continuous difficulty, KPI ledger, buffs, temptation choices, camera, renderer, UI, and poster are new project code based on `sky_high_kpi.md`. This is a narrow geometry adaptation with a new rules engine, not an unchanged upstream fork.

The latest supplied plan takes precedence over the older workspace adaptation document, which describes superseded sliding, bounce, and staged-year rules.

## Visual assets

The campus building sprite sheet is a user-supplied project asset from the shared workspace. It is not an asset from `iamkun/tower_game`. Keep its provenance in the delivery manifest; this notice does not assign or independently verify its copyright.

## Runtime packages

Third-party runtime packages retain their own licenses in their installed distributions and package metadata. The source delivery includes `package-lock.json` for the exact resolved dependency versions.
