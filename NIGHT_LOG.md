# Lion Survival — Night Log

Running log of changes, newest first. One line per change.

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
