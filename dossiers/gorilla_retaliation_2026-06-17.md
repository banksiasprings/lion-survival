# Dossier — the gorilla fights back (retaliation + day aggression)

**Date:** 2026-06-17
**Trigger:** play-test after the [merge](merge_2026-06-16.md) — *"the gorilla isn't fighting the
lions … the lions are just killing it, and it's not doing anything."*

## Root cause

The merged FSM only engaged lions on the **night** path (a perched gorilla dropping on a lion
inside `LION_DETECT`). The **day** path — where the first gorilla actually spawns (`FIRST_SPAWN_T = 22s`,
~early morning) — had **no lion-engagement at all**: a grounded day-roamer just wandered. Lions
enter `fight_gorilla` against any grounded gorilla within 18 m, press to ~1.8 m and bite it
(`LION_BITE_DPS = 7` each, applied in the gorilla's own "biters" loop). The gorilla took the damage
and never swung back → punching bag. Combat reciprocity (`SWIPE_DMG = 34` → `lion.health -=`) already
existed; the gorilla simply never *entered* `engaging` by day.

## Changes (all in `index.html`, FSM + `GOR` config)

1. **Retaliation (top-priority override).** New `G.lastDamagedBy` / `G.lastDamageTime`, stamped in the
   biters loop (nearest biting lion). A new check runs **before** the action-state handlers, so it
   overrides roam / perch / wander / wall-smash / tree-grab / player-pursuit: if the attacker is alive,
   in `lionMeshes`, the bite is fresh (`RETALIATE_WINDOW = 4s`) and within `RETALIATE_LEASH = 26m`, the
   gorilla switches to `engaging` that lion. Only fires while a bite is fresh — with no lions on it,
   player-hunting is untouched.

2. **Day proactive engagement.** The day roam branch now engages any lion within `LION_DETECT` (mirrors
   the night drop). The gorilla is territorial by day, not just reactive.

3. **`engaging` is now a commit loop.** Was: rush → one swing → return to perch/roam. Now: rush →
   hold-in-range facing the lion until `swipeCd` clears → swing → re-rush, **staying engaged until the
   lion dies or breaks the leash** (`LION_DETECT × 1.7 ≈ 22m`). Lets a 1v1 actually resolve and lets the
   gorilla keep pressure on a mob. The `swipeCd` gate moved off the *entry* (night + retaliation enter
   immediately) onto the rush→swing transition, so cadence is still paced by `SWIPE_CD`.

4. **Skip dead lions in the nearest-lion scan** (correctness). A just-killed lion lingers one frame
   before the lion loop splices it; without this guard the gorilla flickered `engaging`↔`roaming` on the
   corpse for a frame. Caught by the headless harness (Test 3).

New `GOR` knobs: `RETALIATE_WINDOW: 4`, `RETALIATE_LEASH: 26`.

## What was deliberately *not* changed
- `LION_BITE_DPS`, `SWIPE_DMG`, `SWIPE_CD`, spawn cadence, tree-grab, wall-smash, day/night moods.
- Prey are **not** hunted by the gorilla (the spec's "prey?" was optional) — kept it focused on lions +
  player to avoid a gorilla-chases-zebra oddity. Easy to add later if wanted.

## Verification

**Headless FSM harness** (`/tmp/gor_test.js` — runs the *real* extracted gorilla code, lines 2073–2569,
against mocked globals; not a re-implementation). `node --check` clean; **17/17 assertions pass:**

| # | Scenario | Result |
|---|---|---|
| 1 | Lion bites a player-pursuing gorilla → it switches to `engaging` the attacker, kills the lioness in 0.47 s, survives | ✅ |
| 2 | Lone gorilla vs lone lioness (day, no player) → proactively engages, lion down in 0.7 s, gorilla wins | ✅ |
| 3 | State stream contains `engaging`, then settles to `roaming` (HUD: ENGAGING → roaming) | ✅ |
| 4a | Wall-smash still fires + `wallMeshes`/`wallAABBs` stay in lockstep | ✅ |
| 4b | Tree-grab still pulls a treed player down (28 dmg, 1.3 s stun) | ✅ |

**Live game** (`python3 -m http.server 8911`, headless browser, real `updateLions` AI driving the lions):
- Boots menu → play with **zero console errors**; `GOR.RETALIATE_WINDOW` live = 4.
- **Day:** 2 real lionesses pushed onto the gorilla → `retaliated: true`, **2/2 killed**, gorilla 160→150,
  state stream `engaging → roaming`. Zero errors.
- **Night:** settles to `perched` with no lions near → a lion strays into `LION_DETECT` → **drops to
  `engaging`**, kills it, **returns to `perched`**. Day/night mood intact. Zero errors.

## Tuning knobs for Steven
The gorilla now reliably beats the default 3-lion pride by day (lioness 30 hp dies to one 34-dmg swipe).
If it feels *too* unkillable, dial any of: `GOR.SWIPE_DMG` ↓, `GOR.SWIPE_CD` ↑ (slower swings),
`GOR.LION_BITE_DPS` ↑ (pride hurts it more), `GOR.LION_DETECT` ↓ (engages from closer),
`GOR.RETALIATE_LEASH` ↓ (gives up the chase sooner). All live in the `GOR` block.

## Backup
`backups/index.PRE-RETALIATE.<ts>.html` — snapshot before this work (git-ignored; git history is the archive).
