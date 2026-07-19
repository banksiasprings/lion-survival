# Lion Survival — Night Log

Running log of changes, newest first. One line per change.

## 2026-07-19 — 🐕 wall fix + 🦅 sky vulture + 🐍 giant snake (three-in-one)
- **🐕 Wild dogs no longer walk through walls (bug fix).** Root cause = **tunnelling**, not a missing collide:
  `dogStep` already called `collideWalls`, but walls are only **0.3 thick** and a vendetta dog moves ~0.9
  u/frame (`SPEED_CHASE 18`), so it jumped across in one step and the nearest-face push shoved it out the
  *far* side. Fix: a **swept `segHitsWall` guard** cancels any step that crosses a wall (dog stops on the
  near side), then `collideWalls` **+ `collideStoneWalls`** resolve resting contact for **both** wood & stone.
  Repro'd (dog tunnelled to x=14 through a wall at x=10) → after fix stops at x=9.35 for wood AND stone.
- **🦅 Sky vulture (new creature).** Big raptor (`SKYV`/`skyVultureMeshes`/`makeSkyVulture`/`updateSkyVultures`),
  distinct from the small scavenger `vultures[]`. **Cruises at 2× tree height** (alt 12), fast (20 ≈ 1.3× a
  sprint), **80 HP**, **dives for 30** every 15 s. FSM `CRUISE / DIVE / CLIMB / DESCEND / LANDED / TAKEOFF /
  RETREAT` — all six verified to fire cleanly over a 30 s sim. **Attacks everything EXCEPT lion/gorilla/
  elephant** (hits player, dogs, rhinos, all prey incl. giraffe). **Ranged-only while high** (melee altitude-
  gated), **lands to rest/feed** (8–15 s), and **NEVER dies in the air** — below 30% HP it climbs off and
  heals to 70%; only a LANDED bird can be killed (both verified: a −50 airborne burst → survives at 1 HP,
  retreats, heals to 57; a landed bird at 0 HP dies). Wings flap (shoulder-pivot Groups rolled by sine), feet
  tuck/extend. Minimap: indigo / hot-pink diving.
- **🐍 Giant snake (new creature).** Elephant-length python (`SNAKE`/`snakeMeshes`/`makeSnake`/`updateSnakes`):
  head + 14 segments following via a **spatial delay-buffer** (`S.path`) with a **sine lateral undulation**
  (`layoutSnake`) → visible slither (head moved 23.6 u, body trails). **1000 HP** (tankiest by far),
  **50 dmg bite / 1 s**, **0.85× lion speed** (a sprint outruns it). Hunts prey + exposed player, **fights
  back** when hit, **blocked by walls** (same swept guard). **Collapse-by-segment death** verified (staggered
  sink+flop, fade to 0 over ~55 frames, freed). One container Group (segments in world space) so `killObj`
  frees it in one call; per-segment ranged hit (`projHitSnake`); HP bar rides the head. Sandy tan + carpet-
  python brown blotches. Minimap: green (bright when locked on you).
- **Verified:** fresh save spawns **2 vultures + 1 snake** at dawn (+ existing 3 lions/2 gorillas/2 rhinos/10
  dogs). No console errors; a full 400-frame `update*` run of the whole animate loop threw nothing. **Disposal
  clean** — spawned 20 of each, killed via real death paths → 0 orphaned nodes, HP-bar CanvasTextures freed
  exactly once, shared sprite geometry preserved, double-dispose shape **identical to the existing rhino**
  (shared per-creature materials — the established pattern). Visual: offline PIL render
  `dossiers/newcreatures_render.png` (`render_newcreatures.py`) — the WebGL pane wedged mid-session (heavy
  reset cycling), so the visual is the offline render + headless logic checks, per the project's verify note.
- **Docs:** `dossiers/bestiary.md` (both creatures + spawn line + combat web) and `CONTEXT.md` (full module
  writeup + balance flags) updated in the same commit.

## 2026-07-19 — 🐕 Wild dogs: body-shape pass (Steven: "looks kinda like a barrel")
- **Reshaped the `makeWildDog` torso only** — everything else (colours, coat mottle, teeth, face, ears,
  legs, spike crest, tail) untouched, and **zero behaviour change** (10/day, cap 15, relentless vendetta,
  speeds/HP/damage all identical). The old body was **three near-uniform circular cylinders** (r≈0.32–0.34) →
  read as a **barrel** from every angle. Now each of the three horizontal segments is squashed to a **deep
  oval** cross-section via `scale.set(sx,1,sd)` (after the `rotation.x=π/2`, local Z → world height, so
  `sd>1` = taller-than-wide) and re-radiused into a real taper: **deep chest** (rt0.20→rb0.36, `sd 1.40`,
  low brisket / high withers) → **sharply tucked waist** (`sx 0.80`, r0.23) → **loin tapering to the tail**
  (rb0.15). Reads as a lean greyhound/wolf silhouette, not a pig.
- **Stance pulled in** to ±0.22 (from ±0.24) so the legs still emerge cleanly from the leaner rump.
- Verified: **live mesh params match intent exactly** (read back from the running scene), **child count
  unchanged (30 → no orphans)**, **disposal clean** (each new segment geometry disposes exactly once via the
  real death path `health=0; updateWildDogs`), before/after confirmed via offline PIL profile render
  (`dossiers/render_wilddog_compare.py` → `wilddog_render.png`). (In-app WebGL compositor was wedged this
  session — `document.hidden` stuck true — so the visual is the offline render, which is a faithful proxy
  since its geometry params were checked against the live mesh.)

## 2026-07-18 — 🐕 Wild dogs: dire-wolf glow-up (Steven: "spikes and teeth")
- Menacing mesh pass on `makeWildDog` (19 → **29 parts**): **bared white teeth** (2 fangs + a 3-tooth front
  row jutting from the mouth), a **5-cone black spike crest down the spine** (hyena-punk mohawk, tallest at
  the shoulders → tapering to the rump), and the coat **darkened** (bright tan/cream → burnt-rust / near-black
  / dingy grey — dire-wolf, not cute doggo). Verified: 29 parts/dog, disposal still 0 orphans (new
  `bone`/`spike` materials free cleanly), 0 console errors, silhouette confirmed via offline PIL render.

## 2026-07-18 — 🐕 African wild dogs (new pack predator)
- **New animal: African wild dogs** — a fast pack predator (`DOG` config / `dogMeshes[]` / `makeWildDog` /
  `updateWildDogs`), self-contained like the rhino, riding every existing seam (hitbox, HP bar, killObj
  disposal, dawn wave, minimap). **Lion AI untouched** (only added the dog↔lion skirmish, computed inside
  `updateWildDogs`).
- **Spawn:** a **pack of 10 every dawn**, cap **15** (old: n/a — new animal). HP **25** each (squishy — a
  spear/bolt/boomerang one-shots, ~2 rocks), bite **11** @ 1.5 s.
- **Super fast:** roam 5 · cautious hunt **14** (≈1.3× lion base — a sprint still outruns it) · **vendetta
  chase 18** (faster than a sprint (16) and any lion — can't be outrun).
- **PACK VENDETTA (the headline):** wound ANY dog → `wildDogsVendetta=true` → the **whole pack** hunts you
  relentlessly at chase speed and **never disengages** (unlike the lion pride, which calms in 12 s). Ends only
  when the pack is wiped or you die. Set inline at each player-damage site (thrown/boomerang/melee all got a
  `'dog'` branch). Escape = climb a tree or put a wall between you and them (dogs are wall-blocked and can't
  reach a treed player).
- **Baseline (unprovoked):** loose-pack roam, hunt nearby prey, hunt an EXPOSED player (crouch-in-grass hides
  you). **Rivals with lions:** trade small nips on contact (dog −8/lion −3), kept off the pride watchdog so a
  skirmish never becomes a pride war or blames the player. **Avoid** gorilla/rhino/elephant.
- **Mesh:** ~19-part procedural mottled canid (segmented body cylinder, tapered head, upright ears, 4 swinging
  cone legs, stump tail), ~⅔ a lion. Minimap dots (red on vendetta). No body-part drop (pure challenge).
- Verified in-engine: 10 spawn/day + cap 15; attack one → all 10 converge (84→30 m in 3 s) & vendetta stays on
  through 15 s; pack-wipe clears it; skirmish trades damage without mis-blaming the player; disposal 0 orphans
  (objs/geo/tex all return to baseline); zero console errors. Mesh silhouette confirmed via offline PIL render
  (browser-pane WebGL renders black — a known headless limitation).
- **⚠ Balance — flagged, NOT silently tuned (Steven asked):** 10 relentless super-fast dogs from day 1 can
  overwhelm a fresh run before you have tools. Kept as requested; mitigations already present (baseline 14 is
  out-runnable by sprint 16, spawn 55–95 m out, crouch-in-grass hides you, tree/wall is a hard escape → the
  danger is provoke-triggered). `SPEED_CHASE 18` is the interpretive call: "1.3× lion base" (~14) vs "outrun
  even sprinting" — went with the gameplay-defining latter for vendetta, the ~1.3× for baseline. See report.

## 2026-07-18 — G is scope-only (Steven follow-up)
- **[G] no longer does grapple at all.** Was context-sensitive (Crossbow→scope, else→grapple drop); now it's
  **scope-toggle only** — when the Crossbow is the active ability it toggles the ADS zoom, otherwise G does
  nothing. The `else` grapple branch (fire/release) is gone. Grapple is unchanged on its **kit slot** (select
  it, LMB/Z to fire) and still **drops via RMB/Space**. Verified in-engine: non-Crossbow active → G is a
  no-op (grapple not fired, scope unchanged); Crossbow active → G on/off. Help text + CONTEXT updated.

## 2026-07-18 — Crossbow ammo, rhino spawn rate, hold+toggle inputs (Steven's 3 tuning/UX asks)
- **🏹 Crossbow now costs 1 rhino horn PER SHOT** (was craft-once/unlimited — Steven tested it, "too good").
  New `CROSSBOW_COST={horn:1}`; `kitFireCrossbow` gates like the spear — refuses with **"🏹 Crossbow needs 1
  rhino horn (have 0)"**, returns false → **no cooldown penalty**, deducts 1 horn on a successful shot. Wired
  into `abilityCost`/`canAfford` so the **desktop toolbar slot** (`.ab-slot.poor`) and the **mobile attack
  button** grey out at 0 horns. The 1-horn craft cost to *unlock* the crossbow is kept, so a first shot needs
  2 horns total (1 to craft + 1 to fire). Verified in-engine: unlock 2→1, fire 1→0, refuse at 0 (msg, 0 bolt,
  cd stays 0), grey-out toggles.
- **Rhino dawn spawn 1 → 2 per day; cap `RHINO.MAX` 5 → 6.** `spawnDailyWave` now spawns 2 rhinos each dawn
  (and on day-1 reset). Verified: fresh start shows **2 rhinos** on the minimap, reset re-seeds 2.
- **Scope zoom + crouch: HOLD *and* TAP-TOGGLE (input redundancy — Steven's RMB is flaky).** No hold
  behaviour removed; a tap-toggle is *added* alongside.
  - **Scope:** RMB-hold still zooms (unchanged). New — **[G] taps to toggle** zoom on/off (when the Crossbow
    is active; else G keeps its grapple role). **Mobile 🔭 is now a tap-toggle** (was press-and-hold). State
    persists across shots; clears on weapon swap or death. Second state var `scopeToggle` ORs with `scopeHeld`
    in `scopeActive()`.
  - **Crouch:** C-hold still crouches while held (unchanged). New — a **brief C tap** (<250 ms) toggles crouch
    on/off via `crouchToggle` (`player.crouching = keys['KeyC'] || crouchToggle`). Mobile 🐾 was already a
    tap-toggle. Auto-repeat guarded (`!e.repeat`) so a real hold never registers as a tap.
  - Verified in-engine: G on→off (fov 75↔30, overlay on/off), toggle survives firing, weapon-swap + reset
    clear it; C tap toggles crouch with the key released, C-hold crouches-while-held then stands on release,
    mobile 🔭/🐾 toggles. Zero console errors.

## 2026-07-18 — Spear cost, Rhino Crossbow + scope zoom (Steven's 3 follow-ups)
- **Spear now costs 1 rock + 2 wood per throw** (`SPEAR_COST`), matching the wall economy. `kitThrowSpear`
  refuses cleanly (names the shortfall, returns false → no cooldown/sound) when you can't afford it, deducts
  on a successful throw. A new `canAfford(id)`/`abilityCost(id)` pair greys the toolbar slot (`.ab-slot.poor`)
  and the mobile attack button whenever a material-cost ability (spear or either wall) is unaffordable.
- **🏹 Rhino Crossbow (ability, craft: 1 rhino horn).** Fires a flat, long-range bolt: **50 dmg**,
  **~325 range** (`WORLD*0.65` — almost across the map), **2.5 s cooldown**, **unlimited bolts**. Rides
  `thrownRocks[]` with an `r.crossbow` flag (flatter gravity 1.0, `CROSSBOW_SPEED 110`, 🏹 "Bolt" labels,
  its own long despawn range). Rhinos now **drop a 🦏 horn on death** (any death — like the tusk, a rhino
  fights back + flees near death so non-player kills are rare). `unlockItem`/`canCraft`/`craftCostStr`/HUD/
  shop-materials all extended for horns.
- **Scope / ADS zoom** (`scopeHeld` + `scopeActive()` gated on the Crossbow being active). **Desktop:** hold
  **RMB** to zoom (else RMB keeps the grapple-drop), release to zoom out. **Mobile:** a dedicated **🔭 SCOPE**
  button (press-and-hold; auto-shown only while the Crossbow is the active tool). `updateScope` lerps
  `camera.fov` **75 → 30** (~2.5× — game base is 75, left untouched; Steven's "~30° zoomed") and toggles a
  `#scope` DOM overlay: radial optic vignette + a faint centred green reticle (z-8, below the HUD so
  health/stamina still read). Firing (LMB / Attack) works zoomed or not.
- **⚠ Ammo model — flagged for Steven:** he said "1 rhino horn per shot," which is unfarmable. I shipped the
  **craft-once / unlimited-bolts** model instead (1 horn crafts the crossbow, then bolts are free, gated only
  by the 2.5 s cooldown) — cleaner and matches the boomerang. Easy to switch to "1 horn = N bolts" if he
  prefers scarcity. **⚠ Balance-watch:** 50 dmg + ~325 range + 2.5 s + zoom is strong — deliberately gated
  behind killing a rhino (220 HP). Bolts fly along the aim ray (flat), so level shots sail over close animals'
  heads unless you put the reticle on them — the scope makes that precise. See report for the full note.
- Disposal: bolts ride `thrownRocks[]` (freed on hit/range/reset); scope is a stat + DOM overlay (no VRAM).
  Verified in-engine: spear deduct/refuse, horn drop, craft, 50-dmg bolt, 325 range, 2.5 s cd, FOV 75↔30 +
  overlay toggle + deactivate-on-tool-switch, `resetGame` frees bolts + restores FOV. Zero console errors.
  (Live in-pane screenshots were unavailable — the Browser pane's compositing wedged mid-session; scope DOM
  verified structurally instead, and the same pipeline captured cleanly earlier in the session.)

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
