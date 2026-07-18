# Lion Survival — Night Log

Running log of changes, newest first. One line per change.

## 2026-07-18 — Necklace-gated pounce, tusk boomerang & sky-hammer VFX (Steven's 4 asks)
- **🦷 Lion Tooth Necklace (accessory) now GATES pounce.** Fresh saves can't pounce until they've killed a
  lion, harvested its tooth, and crafted the necklace (Steven's "option b" harder start). Modelled as an
  **accessory** (passive enabler, takes an accessory slot) rather than an ability, because pounce stays on
  its own `[Q]` / pounce-button control — the necklace is a gate, not an activated tool. `pouncePrey()`
  early-returns with "🦷 Need the Lion Tooth Necklace to pounce" when `!hasNecklace()`; the desktop prompt
  and the mobile 🐆 pounce button both grey out / relabel until it's worn. **⚠ Applies to existing saves
  too** — Steven's live phone loadout persists but has no necklace, so his next run starts with pounce
  locked until he crafts one. That's the intended harder start, now retroactive.
- **🦷 lion teeth** drop from lions **YOU** kill (gated on `lastHitKind==='player'` so gorilla-vs-lion
  carnage across the map can't be farmed — teeth are the necklace's one-time cost). **🦴 elephant tusks**
  drop from any elephant death (a 300-HP bull that fights back is virtually never killed by anything but
  the player, so no gate needed). Both are **run-scoped** counters (reset in `resetGame` like wood/rock);
  the crafted item, once unlocked, persists across runs via the existing `localStorage` kit save.
- **First crafting sink.** `unlockItem` now honours a `craft:{tooth|tusk}` cost — refuses + names the
  shortfall if you can't afford it, consumes the materials on success. Necklace = 1 🦷, Boomerang = 1 🦴.
  Shop cards show **"Craft (1 🦷)"** (greyed via the existing `.sc-btn.locked` when unaffordable); the shop
  screen shows a **CRAFTING MATERIALS** readout (it's fullscreen, so the HUD counters aren't visible there).
  HUD `#topright` gains 🦷/🦴 counters that appear once you've picked one up.
- **🪃 Tusk Boomerang (ability).** New ranged weapon: **100 dmg**, arcs **out ~26 m and RETURNS** to your
  hand (parametric out-and-back curve + homing toward your *live* position so it comes back even if you
  moved), **20 s cooldown**. Hits each target **once per throw** (`hitSet`) → one-shots a lion, two throws
  down a gorilla (160), three down an elephant (300) — matches the brief. Rides `thrownRocks[]` (same
  disposal path as the spear); flies **terrain-following at body height** so it intersects hit cylinders
  instead of sailing over heads. Reuses each animal's wound + retaliation hooks (`boomerangStrike`).
- **🔨 Hammer "from the sky" VFX.** On a hammer swing, a **big procedural maul (~4.2×)** now spawns 11 units
  above the struck point and **crashes straight down in ~0.32 s** (ease-in gravity), then: **screen shake
  (~150 ms) + a bright additive ground-flash disc + a 5-puff dust burst**, then fades + disposes ~120 ms
  after impact. The **in-hand hammer is untouched** — this is a VFX layer on top of the swing; the swing's
  67 dmg still applies immediately (the sky-hammer is the showy follow-through, not the damage source, so
  the target can't step out of a delayed hit). Impact point = the wall/animal struck, or 4 m ahead on a whiff.
- **"fire → burned" kill verb:** already absent. `MELEE_TOOL` only ever held `axe`/`hammer`; spear/rock/
  pounce/gore name themselves inline — there was no fire verb to remove. Confirmed by grep; ask #4 was a no-op.
- **Disposal:** two new FX arrays (`skyHammers`, `_impactFlashes`) + the boomerang all thread through
  `killObj`. Verified in-engine (frozen-sim stepping): boomerang throw→arc(26 m)→return→hit-once(100)→
  despawn leaves scene children back at baseline (1035); sky-hammer spawn→land(frame 10)→shake+5 dust+1
  flash→dispose returns to baseline; `resetGame` mid-flight frees all three arrays + resets tooth/tusk; GL
  context stays alive. **Zero console errors** across the whole test pass.

## 2026-07-18 — Wall economy, tool reach & correct kill-message names (Steven's 6 asks)
- **Walls: zero cooldown** — `kit_wall`/`kit_stonewall` `cd` 8/10 → **0**. Placement is now gated by materials, not a timer (verified: 3 walls placed in a single tick, no cooldown-block).
- **Wood walls cost 2 wood; stone walls cost 5 rocks** (`WALL_COST`). `placeKitWall` checks the counter first (refuses + tells you what's short, no lockout on a failed place) then deducts on success. Rocks are dual-use (throw ammo *or* premium stone walls) → real build-vs-throw tension.
- **Starting stock** (fresh run, in `resetGame`): **wood 0 → 20** (a full 10-wall wood perimeter at 2 ea) and **rock 0 → 10** (2 stone walls, or throwing ammo). Rock cap left at 10 so stone stays scarce/premium — Steven's "rigged, walls forever" complaint. This is the tuned knob; dial in `resetGame`.
- **Hammer melee reach = pounce** (`PLAYER.pounceRange` 9; was 3.6). **Axe melee reach = 6** (mid-screen; was 3.4) — a middle ground: old < axe(6) < hammer(9). Wall-smash/tree-chop reaches unchanged (demolition/gather stay close).
- **Kill/hit messages name the RIGHT tool + verb** — the reported bug (hammer hit read "the axe…") is fixed. `dealKitMelee(hit,dmg,tool)` now takes a `MELEE_TOOL` descriptor: **hammer→crushed / axe→cleaved** on a kill (hit-verbs batters/chops), and **gorilla & rhino now have a kill line** (they only ever printed a stagger before). e.g. "🔨 The hammer crushed the gorilla!".
- **⚠ Balance note (HITL):** with hammer reach = pounce reach, hammer (67 dmg, no material cost, 1.4 s cd) now rivals the lion's signature pounce at the same distance. Pounce keeps a 7-unit lunge impulse + the ×3 hidden-ambush multiplier, but this wants Steven's eye before any pounce compensation. No pounce numbers were touched.
- Disposal: no new Three.js object types or paths — walls still ride `wallMeshes`/`wallAABBs`/`kitWalls`; message/cost changes are pure JS. Verified place-8-then-reset frees every wall geometry (0 positive leak, `kitWalls`=0), no console errors.

## 2026-07-18 — Mobile / touchscreen controls
- **Full touch control scheme**, auto-detected (`'ontouchstart'` / `maxTouchPoints`) with a `?touch=1` debug override to force it on desktop. Desktop keyboard/mouse path is byte-for-byte unchanged — none of the touch handlers are attached unless `IS_TOUCH`.
- **Left thumbstick** (analog): drag to move; push magnitude scales speed. Feeds a new `touchMove` vector that `updatePlayer` folds into the movement block.
- **Swipe-to-look**: dragging the right ~60% of the screen rotates the camera through the *same* `mouseDX/mouseDY` accumulators the mouse uses (left third reserved for the stick; drag-up looks up). Multi-touch via Pointer Events + `setPointerCapture` — move with one thumb while looking/firing with the other.
- **Big Attack button** (bottom-right) = `useActiveAbility()` (LMB/Z); its icon mirrors the active tool. **Action cluster**: 💨 sprint (toggle) · 🐾 crouch (toggle) · 🪝 grapple · ⤴️ jump/drop-from-tree · 🪨 rock · 🐆 pounce · 🍖 eat.
- **Tappable toolbar**: the existing ability bar becomes a top-centre strip — tap a slot to select (= number keys), tap the active slot again to use it. **☰ menu** top-left opens the loadout (Tab). Empty/accessory slot tap → loadout.
- **R-cycle** is replaced by direct slot taps (no cycle button needed). Minimap moved to top-right; stat bars slimmed; safe-area insets (`env(safe-area-inset-*)`) respect notches; `touch-action:none` + `preventDefault` kill page scroll/zoom; **viewport meta** added.
- **Portrait → rotate-to-landscape prompt** (pure CSS, touch-only) since it's a widescreen FPS. Overlay help text swaps keyboard ↔ touch instructions.
- All touch UI is **DOM only** — zero Three.js objects created, so no disposal path needed. Verified: desktop unchanged (kbd fwd/mouse-look/number keys), Pixel-5 + iPad emulation (joystick moves player, attack/buttons fire, toolbar selects, swipe rotates), no console errors on any path.

## 2026-07-18 — Stone walls, numbered toolbar, LMB fire, axe/hammer on walls
- **Stone Wall** (`kit_stonewall` 🧱): new permanent barrier that elephants & gorillas CANNOT smash — `wallBlockingPath` skips stone, and the gorilla (which has no normal wall collision) is now stopped by `collideStoneWalls`; the elephant is stopped by its existing `collideWalls`. 200 HP.
- **Walls now have HP** (`userData.hp`/`maxHp`): wood 120, stone 200 — so player tools fell them over several swings instead of one-shotting.
- **Axe fells wood walls**: swinging the Hand Axe at a wood wall deals 42/swing (3 to fell); it refuses stone ("use a Hammer"). Entity melee unchanged (42).
- **Hammer** (`kit_hammer` 🔨): new demolition tool — smashes stone (67/swing, 3 to fell) or wood (2 to fell), and lands a 67 melee blow on the animal in front. Procedural haft+head swing model. 1.4 s cooldown.
- **Numbered toolbar**: ability slots now show number badges **1–5** (active slot highlighted); number keys 1–5 jump to a slot AND R still cycles — both work.
- **LMB fires the equipped tool** (was already wired to `useActiveAbility`); Z kept as backup.
- Disposal verified: stone walls + hammer-swing Groups free exactly once; two wall abilities reconcile independently on unequip; no orphans.
