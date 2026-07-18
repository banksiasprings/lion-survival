# Lion Survival — Night Log

Running log of changes, newest first. One line per change.

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
