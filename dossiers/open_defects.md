# Survive the Savannah — open defects & flagged-not-fixed

Things a session found, measured, and deliberately did **not** change. Each entry says what
the fix would be and why it wasn't taken, so nobody re-litigates it from scratch or "fixes"
it without knowing what it costs. Close an entry by deleting it and recording the fix in
CONTEXT.md.

---

## 1. A 0.06 slit at the top of every elevated wall
*Found 2026-08-06 (multi-storey). Cosmetic. Deterministic.*

A wall top sits at `base + 2.2`; the roof placed from that same deck underhangs at
`base + 2.26`. So every storey has a ~6 cm bright line all the way round where the wall
meets the ceiling, just above eye level.

- **Fix:** `ROOF.CLEARANCE` 2.3 → 2.24. One line.
- **Why not taken:** that constant is load-bearing for the shipped roof-headroom test and
  for the db8d212 "I can't walk under my own roof" fix. Retuning it for 6 cm without
  Steven's call is a bad trade. **Needs his decision.**

## 2. The ground floor is 0.6 wider than every storey above it
*Found 2026-08-06 (multi-storey). Visual/design. Working as built.*

Ground walls land at the 2.5 aim distance; elevated walls snap to the roof's 2.2 rim. So a
tower steps inward once, at deck 0, then goes straight up.

- **Fix:** snap ground walls to a grid too, or place the first roof to match the ground
  ring's 2.5 footprint.
- **Why not taken:** changing ground placement would touch every existing save-less build
  and the free-form feel of the ground builder. The step is arguably correct — a plinth.
  **Needs his decision.**

## 3. Cap arithmetic runs out before the roof cap does
*Found 2026-08-06 (multi-storey). Balance.*

`KIT_WALL_MAX` 100 and `ROOF.MAX` 30. A 4-walls-per-storey tower exhausts walls at **25
storeys**, roofs at 30. Nothing warns before the existing generic cap message.

- **Fix:** raise `KIT_WALL_MAX`, or add a storey-aware hint.
- **Why not taken:** 25 storeys is far past anything asked for, and the wall cap has been
  raised twice already (10 → 50 → 100) with a measured perf curve behind it.

## 4. `bones: killing several species leaves several distinct named drops` is isolation-flaky
*Pre-existing, re-confirmed 2026-08-06. Test-only.*

Passes on a fresh `resetGame()`, fails when run twice without one, and fails standalone
without a reset. **Unrelated to any feature work** — re-confirmed independent of the
multi-storey change. The suite protocol is: call `resetGame()` before `runSavannahTests()`.

- **Fix:** give the test its own ecosystem setup/teardown rather than relying on run order.
