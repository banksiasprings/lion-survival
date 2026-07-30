# Lion Survival — Project Context

> **📖 Animals & rules quick reference → [`dossiers/bestiary.md`](dossiers/bestiary.md)** — plain-English
> summary of every animal, hiding/stealth, spawns, and who-fights-whom. Read that first for gameplay.

Single self-contained `index.html`. Three.js **r128** from CDN. **Zero image assets** — all
geometry and textures are procedural (CanvasTexture / shaders). No build step, no npm.

Run locally: `python3 -m http.server 8911` (see `.claude/launch.json`) → open `index.html`.

## Architecture (preserve these invariants)
- **Memory discipline:** every Three object added to the scene must be freed with `killObj()` /
  `disposeObject3D()` when removed. `scene.remove()` alone leaks VRAM and eventually blacks out the
  canvas. Shared materials carry `userData.keep = true` so they're never disposed — **and as of
  2026-07-17 shared _geometries_ honour the same flag**, because three r128 hands every `Sprite` the
  *same* geometry instance, so disposing one HP bar would yank the buffer out from under every other
  sprite. Attaching a per-animal object as a **child of the animal's group** is the cheapest way to
  stay disposal-safe: `killObj(X.mesh)` traverses and frees it on every existing removal path.
- **WebGL context-loss safety net** in `initScene()` — don't remove it.
- **Day/night hooks:** `scene.userData.sun` (DirectionalLight) and `scene.userData.ambient`
  (AmbientLight) are lerped each frame in `updateDayNight()`. New sky/lighting must hook here.
- **Game loop:** `animate()` calls the `update*(dt)` functions in order, then renders. `dt` is
  clamped to 0.05.
- **World:** `WORLD = 500`, `HALF = 250` (5× the original 100×100 — expanded 2026-06-28). Ground height
  = `terrainY(x,z)`. Place scatter within `±MAPR` (`HALF-6`); player is contained by the boundary bounce
  at `HALF-1`. Camera far `1300`, skydome r900, hills r520, fog ×`FOG_SCALE` (0.3) so it reads to the
  horizon. Content scaled with the map (trees ×16, grass 45k + 200 hide-clumps, rocks 60+75, 3× herds);
  lion/gorilla/rhino spawns are **player-relative** (r 55–95) so they're encounterable anywhere; the
  minimap is a fixed local radar (~±75 m) rather than the whole world.

## Day/night clock
`CYCLE = 240s` (4 min). `dn.time` 0..240, 0 = dawn. In-game hour = `gameHour()` maps the cycle to a
24h clock with t=0 ≈ 05:00. Used by lion activity (Phase 2) and sky gradient.

---

# Phase 0 — Lion behaviour research (baked into the AI)

Concrete, sourced-from-field-ethology facts that drive the design. These are *design constraints*,
not flavour.

### Activity pattern (drives Phase 2 §1 + Phase 3 detection)
- Lions are **crepuscular/nocturnal**. They rest/sleep **18–20 h per day**, mostly through the heat
  of midday in shade.
- **Peak activity dawn (~05:00–07:00) and dusk (~17:00–20:00)**; **hunting peaks at night**. Low-light
  hunting exploits their reflective *tapetum lucidum* (excellent night vision) against prey that see
  poorly in the dark.
- **Midday (10:00–16:00):** near-inert, low alertness, seek shade. → in-game: lions move slowly,
  short detection range, drift toward shade/trees/watering hole.

### Hunting (drives Phase 2 §2)
- **Lionesses do the majority of hunting** (commonly cited ~85–90% of pride hunts), usually in
  **coordinated groups of 2–6**. Males hunt more rarely and solo, relying on ambush of larger prey.
- **Cooperative tactics:** *fan out / encircle*, *flanking ("wing" lionesses drive prey)* toward
  *"centre" ambushers* lying in wait. They use cover and stalk to within ~30 m before the final rush.
- **Final sprint** is fast but short: ~50–60 km/h for only a few seconds — they must get close first
  (stalk) because they tire quickly. Overall hunt **success rate is low, ~25–30%**, higher at night
  and in groups.
- → in-game: one lion stays *visible/luring*, others flank *unseen*; a "spotted" broadcast makes
  nearby pride converge; chase is a fast but committed burst.

### Senses (drives Phase 3 stealth — mutual detection)
- **Long range = smell + sound.** Lions detect prey scent on the wind and sound at distance; their
  hearing and smell carry far. **Wind direction matters** — downwind prey is detected far sooner.
- **Close range = sight-dominant**, especially excellent in low light.
- → in-game: a lion has a *visual* detection radius (slashed by grass/crouch/stillness, boosted at
  night) **and** a separate, larger *audio* radius (driven by how loud the player is — running is
  loud). Wind blowing player→lion extends detection (scent).

### Pride dynamics (drives Phase 2 §3)
- Prides typically **3–15** (occasionally up to ~30). **Lionesses are related & cooperative; 1–4
  resident males** hold the territory.
- **Males are larger/heavier and slower** in sustained movement; they **defend territory** more than
  they hunt. **Lionesses are lighter, faster, the primary hunters.**
- **Cubs play-hunt** (stalking practice). Hunger drives aggression: a fed pride is lazy; a hungry
  pride ranges wider and commits harder.
- → in-game: lioness vs male split (lioness = faster, hunts; male = larger, slower, more HP, territorial).
  A **hunger value** scales aggression and detection range.

---

## Phase status
- [x] Phase 0 — research baked into this doc + AI comments
- [x] Phase 1 — savanna graphics (instanced grass + wind shader, gradient sky dome,
      procedural ground texture, 6 tree types + 3 bushes w/ LOD, 5 rock types, hills, dust)
- [x] Phase 2 — realistic lion AI (crepuscular/nocturnal activity curve `lionActivity()`,
      pride coordination via `prideAlert` broadcast + flank roles, lioness/male split,
      hunger→aggression cycle w/ feeding, midday shade-resting, honest signals HUD)
- [x] Phase 3 — mutual stealth detection (`updateStealth` visual×audio model: grass hides you **only
      while crouching** (standing/walking in it leaves you visible), crouch + stillness further slash
      visibility, running is loud; lions hidden in grass sink + drop off radar;
      wind scent extends downwind detection; HIDDEN/EXPOSED + spotted-growl + rustle cues)
- [x] Phase 4 — grappling hook to trees (aim-cone target on climbable acacia/baobab/marula →
      reel up to a branch perch; safe from lions + foliage concealment; staying perched costs no
      stamina (and regens) so you can wait out any threat; Space/RMB drop (G is scope-only as of
      2026-07-18e — no longer bound to grapple); drop-attack deals
      damage+stun. Note: target via aim cone,
      NOT geometry raycast — LOD trees don't recurse in raycast.)
- [x] Phase 5 — atmosphere picks (3): **watering hole** (focal landmark, grass-cleared, lions
      gravitate there to drink/ambush, shown on minimap); **distant night roars** (atmospheric +
      directional pride-bearing warning); **storm system** (rain Points + sky darkening + thunder
      flash/boom; `weather.detMul` cuts everyone's detection — a shared stealth window).
      Sound-based audio detection (suggested in Phase 5) already shipped in Phase 3; day counter
      pre-existed.
- [x] Phase 6 — prey + food chain (scope addition). **6a** six procedural species
      (zebra/wildebeest/gazelle/impala/warthog/kudu) w/ herds, flee-from-predator, jukes/hops/
      stampede-dust, edible carcasses + circling vultures. **6b** player hunger meter (drains,
      starves at 0); hunting via pounce `[Q]` (×3 from a hidden grass ambush) + rocks wound prey;
      eat carcasses `[E]`. **6c** lions hunt prey when hungry (group→big payoff, solo→easy prey),
      feed → 'fed' lull, scavenge/steal kills, guard kills (approach a fresh kill → pride turns
      on you). Closes predator↔prey↔player loop; watering hole is the convergence point.
- [x] Phase 7 — apex gorilla (`GOR` config / `gorillaMeshes[]`, single explicit FSM:
      `sleeping/perched/roaming/engaging/smashing/treegrab`). Inverts the lions' rhythm —
      **roams the ground by day, perches in a tree by night**, and **engages any lion in range
      either way** (day proactive + night drop) — `engaging` is a commit loop that stays on the
      lion until it dies or breaks the leash. **Retaliates**: a lion that draws blood
      (`GOR.LION_BITE_DPS`) is hunted down via a top-priority override (`lastDamagedBy`/
      `RETALIATE_WINDOW`/`RETALIATE_LEASH`) that beats roam/perch/smash/grab/player-pursuit. Its
      swipe deals `GOR.SWIPE_DMG`. The one animal that can **see a treed player**: it pursues,
      **smashes walls in its path** (`wallBlockingPath`→`removeWallAt`, shared with the axe so
      `wallMeshes`/`wallAABBs` stay in lockstep) and **tree-grabs** a sheltered player back to the
      ground (`player.stunTimer` daze + knockback). Tanky (160 hp): rocks chip it and a *large*
      committed pride can still wear a *grounded* one down, but it now fights back hard. First
      spawns ~22 s in, then every 2 days (`dn.firstGorilla`/`nextGorillaDay`). Raw-Signals 🦍 row
      shows state + day-roamer/night-perched mood. NOTE: this is the *advanced* gorilla — merged
      2026-06-17 from a divergent fork that had grown the AI without the animals
      (`dossiers/merge_2026-06-16.md`); retaliation + day aggression added same day
      (`dossiers/gorilla_retaliation_2026-06-17.md`). It replaced an earlier basic gorilla
      (`GORILLA`/`gorillas[]`), now gone. **Render** (2026-06-17): `makeGorilla` rebuilt to a
      28-box bold-silverback silhouette (broad shoulder yoke + narrow hips V-taper, tall crest,
      heavy brow, two-tone coat, bright silver saddle + sheen, battle scar, knuckle-walk arms);
      `animateGorilla` is a per-state pose controller (arms/legs are shoulder/hip pivot Groups;
      swipe/smash/treegrab poses run off `actionTimer`) **and** drives **emissive glowing eyes + an
      additive glow halo** (`gorGlowTexture`) — amber at rest, red-hot in combat, cranked at night
      so a perched gorilla is two burning eyes in the canopy. Eyes/halos are `userData.noFlash`;
      the hit-flash moved to `.traverse` and skips `noFlash` so the body flashes white while the
      eyes keep burning. Scale 1.36 (`dossiers/gorilla_render_2026-06-17.md`).

## Tweaks (2026-06-28) — `dossiers/tweaks_2026-06-28.md`
- **Spear** — *(2026-07-16: the old wood+rock crafted spear tool `throwSpear` was removed with the bottom
  hotbar; the spear is now the material-free `kit_spear` ability using the same `buildSpearMesh` + projectile.)*
  Damage is **sized per target** so kill-counts are predictable: gorilla `maxHealth/10` (**10 spears**),
  lion `maxHealth/5` (**5**), prey one-shot (**1**) except the big-horned **kudu** `maxHealth/2` (**2**).
  Rocks keep the old `mult` model (chip + stun).
- **Pounce** (`Q`) buffed: `pounceRange 3.6 → 9` (long lunge), `pounceDamage 18 → 54` (3×); a hidden
  grass ambush still adds ×3 on top (≈162 — one-shots anything). Lets you leap on prey that hold still
  because grass hides you.
- **Rhino** — big tanky PREY that FIGHTS (`RHINO` config / `rhinoMeshes[]` / `makeRhino`/`updateRhinos`,
  2 spawn at reset; richer two-tone mesh w/ rounded back, belly, skin-fold plates, brow, neck, hoofed
  legs, big horns). In the food web: **lions mob it** (`fight_rhino` state mirrors `fight_gorilla`) and
  the **gorilla engages it** (its foe-scan now includes grounded rhinos); the rhino **fights back** —
  it locks onto its current attacker (`target`/`targetKind` = player|lion|gorilla) and **keeps charging**
  it (homing, `SPEED_CHARGE`), **turning to face before it gores** (`FACE_DOT` — never hits from behind).
  Player melee `SMACK_DMG 35`+knockback; gore vs lion/gorilla `GORE_DMG 22`+stun. Lions adjacent deal
  `LION_DPS` to it; the gorilla's swipe damages + flips the rhino's target to the gorilla. Poor senses of
  the player (`SENSE_RANGE 8 × stealth.visMul` → grass hides you), **stunned** by rocks/spears, **blocked
  by walls** (`collideWalls`; gives up after `BLOCK_GIVEUP` pinned). 220 hp (~14 spears) → edible carcass.
  After it gores the player it's **winded** (`SPEED_SLOW` for `SLOW_AFTER_HIT`) so you can break away; it
  **won't hit through a wall or while you grapple/climb/are up high** (`playerOffGround`/`segHitsWall`);
  and below `FLEE_HP` it **breaks off and runs**. Shown on the minimap (grey dot, red when charging you).
  Arrives via the daily dawn wave (see below), `RHINO.MAX 6`.
- **All animals reheal at each day↔night turn** (`healAllAnimals` in `updateDayNight`).
- **Every animal flees when about to die** (< ~25 % HP, runs from the nearest threat): prey (`flee`),
  rhino (drops target & bolts), lion (`flee_hurt` state), gorilla (`fleeing` state).
- **Spawn cadence — a daily wave** (`spawnDailyWave`, fired at each dawn `dn.day++` and once at reset for
  day 1): **3 lions, 2 gorillas, 2 rhinos** (rhinos 1→2 on 2026-07-18e), each up to its cap (lions 14,
  `GOR.MAX 5`, `RHINO.MAX 6`), spawned player-relative (r 55–95). The old per-flip / per-N-day cadences
  are gone. Lions, the gorilla and rhinos all show on the minimap.
- **Gorilla is a brute now** (batch 2): a grounded one **SMACKS** the player for **half the health bar**
  (`GOR.SMACK_DMG 50`) on a `SMACK_CD` cooldown with knockback + a brief daze — one big blow, not the old
  continuous `MAUL_DPS` grind. **`PURSUE_RANGE 26 → 40`** so it notices/hunts from far off. Counterplay:
  **rocks/spears now STUN it** (`GOR.ROCK_STUN`/`SPEAR_STUN`, new `G.stunTimer`) — a dazed gorilla freezes
  (no smack/swipe/grab/chase) so you can flee, climb, or pile on.
- **Rock cap 5 → 10** (`doCollect`).
- **Perching costs no stamina** (`perchDrain: 0`, drop-on-empty removed) and stamina now regens while
  perched — a tree is a safe place to wait/rest.
- **Grass/crouch now hide a GROUNDED player from the gorilla** (`noticesPlayer` scaled by
  `stealth.visMul`) **and from prey** (herd flee-check scaled by `stealth.visMul`) — the same stealth
  signal the lions already used. A treed player is still the gorilla's exception (it always sees that).
- **Calmer prey roam more**: graze walk speed `0.16× → 0.42×`, looser cohesion, ~30% head-down pauses,
  so an unthreatened herd drifts across the map instead of standing still.
- Removed the gorilla's protruding nostril box (read as a "cigarette"). 28 → 27 meshes.

## Food chain (Phase 6) — quick reference
prey graze in herds → flee any predator within species flee-dist → lions hunt the weak/slow
(fast gazelle/impala usually escape — realistic) → kill spawns a carcass + 3 vultures → player
can **hunt ahead of the pride** (sneak+pounce, the stealthy play) or **scavenge lion kills**
(faster but the guarding pride attacks). Player hunger must be topped up by eating; lions
**cannot** be eaten. Per-species params live in the `SPECIES` table. **8 species** now — the 6 base ones
plus two custom-mesh giants (`custom:` flag → dedicated builder + `makeHerbivore` is skipped; both get
**hip-pivot legs that SWING** via the `s.custom` branch in `updatePrey`'s leg animation):
- **giraffe** (`makeGiraffe`, reticulated `giraffeTex()` coat, mane, withers/rump slope, ossicones): hp 40
  ≈ a lion, speed 18 so it **outruns even a sprinting player** (16), **3 spears** to down.
- **elephant** — a **towering bull** (`makeElephant`, `g.scale 1.55`, ~6u tall; textured `elephantTex()`
  hide, tall domed forehead+brow, **huge** two-tone floppy ears, thick 6-seg curling trunk, **long
  curved tusks** (base + upturned tip), toenails): hp **300** (tankiest by far), **15 spears** to down, big
  carcass (food 150). It lives in `preyMeshes` but **FIGHTS BACK like the rhino** rather than fleeing —
  `fights:true` routes it to a dedicated combat branch in `updatePrey` (tuned by `ELE`): charges &
  **tramples** the nearest threat (player 40 + knockback / lions·gorilla·rhino 26 + stun), homes on its
  target, **SMASHES walls** in its path (`wallBlockingPath`/`removeWallAt`), is **stunned** by
  rocks/spears, **enrages** for `ELE.RAGE_TIME` when hit (chases you even if you hide), and only **flees
  below `ELE.FLEE_HP`**. Player counts as a target only when close & exposed (`stealth.visMul`) or while
  it's enraged.

Spear kill-counts (`updateThrownRocks` prey branch): kudu 2, giraffe 3, elephant 15, other prey 1.

## Combat web & hitboxes (2026-06-28)
- **Whole-body hitboxes.** Thrown rocks/spears used a tiny sphere at each animal's *feet*, so tall/big
  animals were nearly unhittable. Now `setHitbox()` (called per spawn) measures each mesh's bounding
  **cylinder** (`hitR` reach + `hitTop` height) and `projHit()` tests the whole body.
- **Everything retaliates.** When the **elephant** tramples a **rhino** it charges back (`targetKind
  'prey'` added to the rhino), a trampled **gorilla** engages it (its foe-scan + engage-validity now
  include elephant-prey), and a trampled **lion** triggers the pride vendetta. The gorilla's swipe and
  the rhino's gore also alert the pride when they hit a lion.
- **Lion pride.** `prideThreat` — wounding **any** lion makes the **whole pride mob the attacker**
  (player→chase, gorilla→fight_gorilla, rhino→fight_rhino, elephant→new `mob` state that bites it).
  Lions also have **cohesion** now (drift toward the pride centroid in `wander`) so they stay a pack.

## Lions — retaliation guarantee, gorilla balance & new mesh (2026-07-17)
- **Retaliation is now a structural guarantee, not per-site.** Previously each attack path had to
  remember to call `alertPrideThreat`. Now every lion carries `lastHitBy`/`lastHitKind`, damage sites
  just *tag* those (thrown weapon, axe → `player`; gorilla swipe → `gorilla`; rhino gore → `rhino`;
  elephant trample → `elephant`), and a single **HP-drop watchdog** at the top of the `updateLions`
  per-lion loop raises the vendetta whenever `L.health < L._prevHealth` (lions never starve, so any
  drop = an attacker). `alertPrideThreat` is now called from exactly one place. No attack path — present
  or future — can silently skip retaliation. **Tree-safety preserved:** the vendetta gate still refuses
  a `player` threat while `player.inTree`, so a treed player can poke lions without being chased (and the
  line-1400 `if(!player.inTree)` melee gate still means a treed player takes no lion damage).
- **Lion buff so a pride can fight down a gorilla.** Lion HP **46/30 → 85/58** (male/lioness) so they
  survive 2–3 gorilla swipes; `GOR.SWIPE_DMG 34→30`, `GOR.SWIPE_CD 2.4→2.6`, `GOR.LION_BITE_DPS 7→9`.
  Net: a pride of 3–4 can now grind a *grounded* gorilla to its 25%-HP flee threshold (120 dmg) with
  losses instead of getting wiped — a slow, either-side-can-win fight. Lion→player damage (`32/22`) is
  unchanged (the gorilla fight is governed by `LION_BITE_DPS`, not `L.damage`); spears still down a lion
  in 5 (`maxHealth/5`), so player balance holds.
- **Mesh redesign (`makeLion`).** Replaced the box-body/sphere-mane lion with a feline build: deep
  chest + muscular haunches + raised shoulder line + lighter underbelly, a low-carried neck & head,
  a proud lighter muzzle with a dark nose/eyes and rounded ears, tapered legs, and a two-segment
  S-curve tail with the black tuft. **Male** = a shaggy multi-sphere mane ring that frames the face
  (the muzzle pokes out in front of it); **female** = maneless & sleeker — a strong sex silhouette.
  Kept the **flat hierarchy** (the hit-flash swaps materials on `group.children`) and **per-lion
  materials** (freed by `disposeObject3D`/`killObj` — verified 0 orphans on spawn-then-reset). The
  gait now bobs each leg around `userData.baseY` (baked with the sex scale `s`, fixing the old
  unscaled `0.3`). ~29 parts (male) / ~21 (female).

## Floating HP bars (2026-07-17)
Every animal — **lion, prey (all 8 species), gorilla, rhino** — carries a billboarded HP bar above its
head: red track, green fill, `"34/85"` text. `THREE.Sprite` + per-animal `CanvasTexture`, procedural
(no assets), 256×44 px.
- **Attached as a CHILD of the animal's group** (`attachHealthBar`, called at each of the four spawn
  sites right after `setHitbox` — after, because the bar must not be inside the mesh when `setHitbox`
  measures the body's bounding box). Disposal therefore rides the **existing** `killObj()`/
  `disposeObject3D()` path — death, carcass, reset and any future removal path all free the material +
  CanvasTexture with no separate teardown to remember. The **shared sprite geometry** opts out via
  `userData.keep` (see the memory-discipline invariant above).
- **Hit-flash safe:** a Sprite is `!isMesh`, and every flash loop swaps materials on `isMesh` children
  only, so the bars are skipped structurally (they also carry `noFlash` as belt & braces).
- **Scale-compensated:** bars live inside scaled groups (gorilla 1.36, elephant 1.55, rhino 1.15), so
  `attachHealthBar` divides the group scale back out — every bar sits exactly **1.0 m clear of `hitTop`**
  and is sized off `hitR` (gazelle 1.15 → elephant 2.2 world units), well under the animal's own width.
- **Visibility** (`updateHealthBars`, called from `animate` after every animal has moved): hidden at full
  HP; shown instantly on damage; holds `HB_HOLD` 4.5 s after the last hit, fading out over the final
  `HB_FADE` 1 s; re-damage re-shows at full opacity. `healAllAnimals` at each day/night turn puts
  animals back to full → bars hide again. The player's **aim target** (`nearestAnimalInFront(26, 0.97)`)
  always shows, *including at full HP* — there is only ever one, so it costs no clutter. Flip that by
  dropping the `isTarget ||` in the `show` expression.
- **`depthTest: true` on purpose** — a bar must not draw through terrain/foliage, which would leak the
  position of a lion sunk in grass and undermine the whole stealth model.
- **Redraw discipline:** the canvas is redrawn (and the texture re-uploaded) **only when the displayed
  HP integer changes**, never per frame.

## Shop & Kit (2026-07-16) — abilities + accessories
The player's **whole toolset**. It began as a meta-layer over the old 6-slot bottom tool hotbar, but that
hotbar (grapple/wall/campfire/torch/axe/spear tools + the `#inventory` UI, `activeSlot`/`setSlot`/
`onLeftClick`, the `torchState` torch tool, and keys 1–6/`T`) was **removed 2026-07-16** — the side kit
replaced it. LMB now calls `useActiveAbility`. The bottom bar (`#bottombar`) shows only health/stamina/
hunger; wood & rocks moved to `#topright` (`updateWoodHUD`/`updateRockHUD` are now no-ops). Wood is still
collectible (Hand Axe / `[E]`) but has no consumer now (candidate future crafting sink). Catalogue lives in
`SHOP_ITEMS` (+`SHOP_BY_ID`); runtime
state in `progress` (`{unlocked:Set, abilities[5], accessories[2], activeAbility}`), persisted to
`localStorage['lionSurvivalKit']` via `loadProgress`/`saveProgress`. Fresh saves seed the **starter kit**
(`starter:true` → Fire Torch, Healing Herb, Camo Cloak) unlocked + equipped. Unlocking is **free** (no
currency this cut).
- **UI:** 🛒 SHOP button on the menu overlay (`#shop-btn`); the `#shop` screen is the shared **loadout
  manager** (also opened in-game with **Tab**, which sets `uiPaused` → `animate()` freezes the sim but
  keeps rendering). `#loadout-row` = 7 slots (5 ability + 2 accessory); clicking one opens the
  quick-equip **`#picker`**. `#shop-grid` = catalogue cards (icon/name/desc + Unlock/Equip/Unequip).
  In-game `#abilitybar` (bottom-left) mirrors the loadout; `renderAbilityBar` rebuilds it, `tickAbilityBar`
  does the per-frame active-ring/cooldown refresh.
- **Slots are optional & nullable.** `abilities`/`accessories` are fixed-length arrays that hold `null` for
  empty; equip 0–5 abilities / 0–2 accessories, freely, any time (incl. mid-run via Tab). Empty slots render
  as a tap-to-equip `+`. `equipFromCard` refuses (via `flashShopMsg`) rather than clobbering when full;
  `unlockItem` auto-equips only into a genuinely free slot. `reconcileFireTorch()` (called from
  `equipToSlot`/`unequipItem`) extinguishes + disposes the Fire Torch FX the moment it's unequipped.
- **Basic-tool abilities (2026-07-16b):** five granted, cooldown-gated tools — `kit_spear`,
  `kit_wall` (Palisade Wall), `kit_grapple`, `kit_axe` (Hand Axe: chop tree / heavy melee via
  `nearestAnimalInFront`+`dealKitMelee`, reusing each animal's wound+retaliation hooks), `kit_fire`
  (bigger/longer campfire). Most are material-free; **the two walls now cost materials instead of a
  cooldown** (see the wall-economy note under the 2026-07-18 section). Each **reuses an existing mesh + its disposal path** so nothing new leaks:
  spear→`thrownRocks[]`, campfire→`campfires[]`, wall→`wallMeshes`/`wallAABBs`, grapple→the grapple line.
  The only genuinely new FX is the transient axe-swing mesh (`kitSwings[]`, self-disposes ~0.18 s).
- **Palisade Wall is PERMANENT (2026-07-16c):** placed walls persist for the whole run (no decay) — capped at
  `KIT_WALL_MAX` (10) active. Tracked in `kitWalls[]` (`{mesh}`, no timer); `updateAbilities` prunes entries
  an enemy smashed (`removeWallAt`) so the cap stays honest. Disposal: `clearKitWalls()`+`reconcileKitWalls()`
  (called from `equipToSlot`/`unequipItem`, mirroring the Fire Torch) tear down all placed walls the moment
  the Wall ability is **unequipped**; `resetGame`'s world teardown frees them on restart; `clearKitFX()`
  (from `resetGame`+`triggerGameOver`) disposes axe swings and drops kit-wall refs. Verified: walls persist
  60 s+; cap enforced at 10; enemy-smash prunes + keeps `wallMeshes`/`wallAABBs` lockstep; unequip disposes
  all placed walls (0 orphans); place-then-reset → 0 orphans.
- **Controls:** `[LMB]`/`[Z]` `useActiveAbility`, `[1]`–`[5]` `setActiveAbility(n-1)` (jump to slot),
  `[R]` `cycleActiveAbility` (cycle), `[Tab]` open loadout. The keydown/mousedown handlers early-return
  while `uiPaused` (only Tab/Esc close). All wired in `registerControls`. The in-game ability bar shows a
  numbered badge (1–5, active-highlighted) on each ability slot; accessories are unnumbered.

## Wall economy, tool reach & kill-message tool names (2026-07-18b)
- **Walls cost materials, no cooldown.** Both wall abilities have `cd:0`; spamming is gated by stock, not
  time. `WALL_COST = {wood:2, rock:5}` — wood wall = 2 wood, stone wall = 5 rocks. `placeKitWall(stone)`
  checks the counter first (refuses + names the shortfall, no lockout on a failed place — `did:false`
  skips the zero cooldown + sound) then deducts on success. Rocks are dual-use (throw ammo *or* stone
  walls), a deliberate build-vs-throw tension; rock cap stays 10 so stone walls remain scarce/premium.
- **Starting stock** (`resetGame`): **wood 20** (a full 10-wall wood perimeter at 2 ea from spawn) and
  **rock 10** (2 stone walls, or throwing ammo). This is the tuned balance knob — dial it in `resetGame`.
- **Melee reach.** Hammer melee = `PLAYER.pounceRange` (9, was 3.6); axe melee = **6** (was 3.4) — a
  middle ground (old 3.4 < axe 6 < hammer 9). Wall-smash + tree-chop reaches are unchanged (close-range).
  ⚠ Balance-watch: hammer melee now matches the lion's signature pounce reach — pounce keeps its lunge
  impulse + ×3 hidden-ambush multiplier as compensation, but no pounce numbers were changed (HITL).
- **Correct tool name/verb in kill+hit messages.** `dealKitMelee(hit, dmg, tool)` takes a `MELEE_TOOL`
  descriptor `{icon,name,kill,hit}` (hammer→crushed/batters, axe→cleaved/chops) so a hammer blow no
  longer mislabels itself "the axe". **Gorilla & rhino gained a kill line** (they previously only ever
  printed a stagger/wheels-on-you, even on a killing blow). Spear/rock (`updateThrownRocks`) and pounce
  already named themselves correctly and were left alone.

## Craft materials, necklace-gated pounce, tusk boomerang & sky-hammer VFX (2026-07-18c)
The game's **first crafting economy**: two animal drops that unlock two new kit items.
- **Craft counters** `toothCount` / `tuskCount` (near `woodCount`/`rockCount`) — **run-scoped** (reset in
  `resetGame`, like wood/rock); the crafted *item* persists across runs via the existing kit `localStorage`.
  HUD `#topright` shows 🦷/🦴 counters once you hold one; the fullscreen Shop shows a **CRAFTING MATERIALS**
  readout in `renderShop` (the HUD isn't visible behind the shop overlay).
- **Drops.** 🦷 lion teeth drop from lions **you** kill (gated on `L.lastHitKind==='player'` in the
  `updateLions` dead-lion loop, so gorilla/rhino kills across the map can't be farmed for the one-time
  necklace cost). 🦴 elephant tusks drop from **any** elephant death (the prey dead-loop, `species==='elephant'`)
  — a 300-HP bull that fights back is virtually never killed by a non-player, so no gate needed.
- **Crafting sink.** `unlockItem` honours a `craft:{tooth|tusk}` field on a `SHOP_ITEMS` entry: refuse +
  `flashShopMsg` the shortfall if unaffordable (`canCraft`), else consume the materials. `craftCostStr`
  renders "Craft (1 🦷)" on the card (greyed via the pre-existing `.sc-btn.locked` when you can't afford it).
  All other kit stays free (`craft` absent).
- **🦷 Lion Tooth Necklace** = an **accessory** (`craft:{tooth:1}`). Modelled as an accessory, NOT an
  ability, because it's a *passive gate*, not an activated tool — pounce keeps its own `[Q]`/pounce-button
  control. `hasNecklace()` = `progress.accessories.includes('lion_necklace')`. `pouncePrey()` early-returns
  (before arming its cooldown) with a "need necklace" killfeed when it's not worn; the desktop pounce prompt
  and the mobile 🐆 button (`_tcPounceBtn`, toggles `.tc-btn.disabled`) reflect the locked state. **Fresh
  saves have no necklace → the first lion must be killed without pouncing (axe/hammer/spear/rock)** — Steven's
  accepted "option b" harder start. Note: pounce only ever targeted *prey*, so the gate means "no prey
  pouncing until you've earned a lion". Existing saves are affected retroactively (loadout persists, necklace
  isn't in it).
- **🪃 Tusk Boomerang** = an **ability** (`craft:{tusk:1}`, `cd:20`). 100 dmg, arcs **out ~26 m and RETURNS**
  (`BOOM={life:1.8,reach:26,spread:8}`). `kitThrowBoomerang` pushes a `{boomerang:true,…,origin,fwd,side,
  hitSet}` entry onto `thrownRocks[]`; `updateThrownRocks` routes `r.boomerang` to `updateBoomerang` (its own
  parametric path: `along=sin(pπ)·reach`, `lat=sin(2pπ)·spread`, homing-lerp toward the live player pos past
  p=0.55; **terrain-follows at body height** `terrainY+1.0` so it hits cylinders, not thin air). Hits each
  target **once per throw** (`hitSet`) via `boomerangStrike`, which reuses each animal's wound + stun +
  retaliation hooks. One-shots a lion; 2 throws down a gorilla, 3 an elephant. Freed on catch (`r.t≥life`)
  or `resetGame`.
- **🔨 Sky-hammer VFX.** `kitHammer` computes the impact point (struck wall/animal, or 4 m ahead on a whiff),
  applies its 67 dmg **immediately as before**, then calls `spawnSkyHammer(impact)` — a big procedural maul
  (`s=4.2`: wide flat head + collar + long haft) spawned `SKY_HEIGHT=11` up that falls in `SKY_FALL=0.32 s`
  (ease-in). `updateSkyHammers` (called from `updateAbilities`) lands it → `onSkyHammerImpact`: `shakeTime`
  bump (~150 ms) + `spawnImpactFlash` (additive `CircleGeometry` disc, `_impactFlashes`, expands+fades) +
  5× `spawnDustPuff`, then fades the maul ~120 ms and `killObj`s it. The **in-hand swing (`spawnHammerSwing`)
  is unchanged** — the sky-hammer is cosmetic, so the damage never waits on a 0.32 s fall (target can't dodge
  it). New arrays `skyHammers` + `_impactFlashes` are torn down in `clearKitFX` (→ reset + game-over) and
  self-dispose per-frame otherwise.
- **⚠ Balance (report, not silently tuned):** no starting-stock or existing-damage numbers changed. The
  necklace gate is the intended difficulty add; the boomerang is deliberately strong (100 dmg) but gated
  behind killing an elephant (the hardest thing in the game). Autonomous impl choices flagged: necklace =
  accessory (costs an accessory slot), tooth drop player-gated / tusk not, boomerang flies at body height.
- **"fire → burned" verb:** never existed in code (`MELEE_TOOL` only had axe/hammer). Nothing to remove.

## Spear cost, Rhino Crossbow + scope zoom (2026-07-18d)
- **Spear costs materials now.** `SPEAR_COST={rock:1,wood:2}` per throw. `kitThrowSpear` mirrors the wall
  gate: refuse + name the shortfall (`return false` → `useActiveAbility` skips cooldown/sound), deduct on
  success. `abilityCost(id)`/`canAfford(id)` centralise the held-material cost of the three material-cost
  abilities (spear + both walls + **crossbow**, added 2026-07-18e); `tickAbilityBar` greys an unaffordable
  slot (`.ab-slot.poor`) and `updateTouchUI` greys the mobile attack button the same way.
- **🦏 rhino horn** drops from **any** rhino death (`updateRhinos` dead-loop; not player-gated — like the
  tusk, a rhino fights back + flees near death so a non-player kill is rare). `hornCount` is the third
  run-scoped craft counter (reset in `resetGame`); `canCraft`/`craftCostStr`/`unlockItem`/HUD/shop-materials
  readout all handle `craft:{horn}`.
- **🏹 Rhino Crossbow** = ability, `craft:{horn:1}` to unlock, **`CROSSBOW_COST={horn:1}` PER SHOT**
  (2026-07-18e — Steven found unlimited bolts too strong; ammo now via the `abilityCost`/`canAfford` path,
  refuse+message "🏹 Crossbow needs 1 rhino horn (have 0)" on a failed shot → no cooldown, deduct on
  success — exactly the spear economy). `cd:2.5`. `kitFireCrossbow` pushes an
  `{crossbow:true}` projectile onto `thrownRocks[]`; `updateThrownRocks` branches on `r.crossbow` for **flat
  50 dmg** to every animal type (reusing the existing stun/retaliation per-branch), **flatter gravity (1.0
  vs 5)**, `CROSSBOW_SPEED=110`, `CROSSBOW_RANGE=WORLD*0.65≈325` despawn, and 🏹 "Bolt" labels. Bolt flies
  along the aim ray (mostly flat) → aim the reticle *at* a target; a level shot sails over close animals'
  hitboxes (same eye-height geometry as the spear, but the scope makes precise aim easy). Freed on
  hit/range/`resetGame`.
- **Scope / ADS — HOLD *and* TAP-TOGGLE (input redundancy, 2026-07-18e).** Two input states OR together:
  `scopeHeld` (momentary hold) and `scopeToggle` (persistent). `scopeActive()` = `(scopeHeld||scopeToggle)
  AND Crossbow is the active ability`. `updateScope` (called from `updateAbilities`) lerps `camera.fov`
  between `BASE_FOV=75` (game default — untouched) and `SCOPE_FOV=30`, and toggles the `#scope` DOM overlay
  (radial optic vignette + centred green reticle, z-8 below the HUD). **Desktop:** RMB-**hold** zooms while
  the Crossbow is active (`mouseup` releases; else RMB keeps its grapple-drop role) **and [G] tap-toggles**
  (`!e.repeat`-guarded so auto-repeat can't flutter it). **[G] is scope-only** — as of 2026-07-18e it is no
  longer bound to grapple at all: when the Crossbow isn't the active ability, G does nothing (grapple lives
  on its own kit slot via LMB/Z, dropped by RMB/Space). RMB keeps its dual scope/grapple-drop role.
  **Mobile:** the `[data-touch="scope"]` 🔭 button is a
  **tap-toggle** now (routed through the delegated tap handler → `doTouchAction('scope')` flips
  `scopeToggle`; the old press-and-hold listeners are gone). `updateTouchUI` shows it only while the
  Crossbow is active and clears **both** `scopeHeld` + `scopeToggle` when hidden. The toggle persists across
  shots and clears on **weapon swap** (`setActiveAbility`/`cycleActiveAbility`) or **death/restart**
  (`resetGame` clears both flags, restores `camera.fov=BASE_FOV`, hides the overlay).
- **Crouch — HOLD *and* TAP-TOGGLE (input redundancy, 2026-07-18e).** `player.crouching = !!keys['KeyC'] ||
  crouchToggle`. Desktop **C-hold** still crouches while held (unchanged); a **brief C tap** (< `CROUCH_TAP_MS`
  250 ms, timed via `_crouchDownT`=`performance.now()` on the `!e.repeat` keydown, checked on keyup) flips
  the persistent `crouchToggle`. Long holds fall through untouched, so hold-to-crouch is byte-for-byte
  intact. Mobile 🐾 was already a tap-toggle (`keys['KeyC'] = !keys['KeyC']`) — unchanged, ORs in the same
  way. `resetGame` clears `crouchToggle` (stand up on restart).
- **⚠ Balance (report, not silently tuned):** Crossbow damage/range/cooldown/FOV all unchanged — the only
  change is **1 rhino horn per shot** (was craft-once/unlimited). Rhino dawn spawn **1→2/day**, `RHINO.MAX
  5→6`. Base FOV stays 75 so the zoom still reads ~2.5×. Scope+crouch gain a tap-toggle alongside the
  hold — no hold behaviour removed.

## African wild dogs — fast pack predator (2026-07-18f)
A whole new animal (`DOG` config / `dogMeshes[]` / `makeWildDog`/`spawnWildDog`/`updateWildDogs`), built as a
self-contained module right after the rhino — mirrors the rhino's shape (config → mesh → spawn → per-frame
FSM → dead-loop) so it rides every existing seam (`setHitbox`/`attachHealthBar`, `killObj` disposal, the
floating HP bar, the daily dawn wave, the minimap). **Lion AI untouched.**
- **Fast squishy pack.** `HEALTH 25` (a spear/bolt/boomerang one-shots; ~2 rocks), bite `11`, `BITE_CD 1.5`.
  Three speeds: `SPEED_ROAM 5` (loose amble), `SPEED_HUNT 14` (≈1.3× lion base ~10.5 — a **sprint (16) still
  outruns it**), `SPEED_CHASE 18` (**vendetta only** — faster than a sprint & any lion, can't be outrun).
- **`wildDogsVendetta` (global flag) is the headline mechanic.** Any player hit on any dog sets it **inline at
  the damage site** (thrown rock/spear/bolt in `updateThrownRocks`, `boomerangStrike`, `dealKitMelee` — all
  gained a `'dog'` branch; `nearestAnimalInFront` + the boomerang strike-list + `updateHealthBars` +
  `updatePrey`'s flee scan all gained `dogMeshes`). While set, **every** dog paths straight to the player at
  `SPEED_CHASE`, ignoring hunger/prey/lions/day-night/leash, and **never disengages** (unlike the lion pride's
  12 s `prideThreat` timer). Ends ONLY when the pack is fully wiped (`dogMeshes.length===0` in the dead-loop)
  or the player dies (`resetGame` clears it). Set inline (not via an HP-drop watchdog) because
  `updateThrownRocks` runs *after* `updateWildDogs` in `animate`, so a watchdog could miss a one-shot kill.
- **Baseline (no vendetta):** roam in a loose pack (drift toward the pack centroid), hunt the nearest prey
  within `HUNT_PREY_RANGE 26`, and cautiously hunt an **exposed** player (`DETECT 24 × stealth.visMul` →
  crouch-in-grass shrinks it, `playerOffGround` excludes a treed/walled player). A hurt non-vendetta dog
  flees; a vendetta dog never does.
- **Lion skirmish (rivals, not to the death).** Computed *inside* `updateWildDogs` so lion AI stays untouched:
  a dog adjacent to a lion (`SKIRMISH_RANGE 3.4`, incidental — dogs don't seek lions) trades a small mutual
  nip (`DOG_NIP 3` to the lion, `LION_NIP 8` back). The nip to the lion is **hidden from the pride-retaliation
  watchdog** (`lion._prevHealth -= DOG_NIP`) so a skirmish never spins up a pride war or mis-blames the
  player — verified: after a skirmish the lion's `lastHitKind` stays null and `prideThreat.ent` never points
  at the player.
- **Escape = tree or wall.** `dogStep` runs `collideWalls` (any wall stops the pack); `dogBite` refuses through
  `playerOffGround()`/`segHitsWall` — a treed or walled-off player is safe.
- **Mesh:** ~29-part procedural **dire-wolf** canid (2026-07-18f "make them look cool" pass): a **dark
  menacing** rust/near-black mottled **deep-chested tapered torso** — three horizontal cylinder segments,
  each squashed to a deep oval cross-section (`scale.set(sx,1,sd)`, `sd>1` → taller-than-wide): a **deep
  chest** (low brisket) pinches into a **tucked waist**, then a fuller loin **tapers back toward the tail**
  (2026-07-19 body-shape pass — no longer a uniform barrel) — tapered head + muzzle + nose, two upright ear cones, four
  hip-pivot cone legs that swing via `animateDog`, stump tail — **plus a row of bared white teeth cones
  (2 fangs + 3 front teeth) jutting from the mouth and a 5-cone black spike crest down the spine** (tallest at
  the shoulders, tapering to the rump). `scale 0.92` (~⅔ a lion), per-dog materials/geometries (incl. the new
  `bone`/`spike` mats) → freed by `killObj`. Verified 0 orphans (objs/geo/tex all return to baseline on a
  spawn→dispose cycle). **No body-part drop** (pure challenge).
- **Minimap:** small orange dots, **red when on a vendetta**. Reheal at each day/night turn (`healAllAnimals`).
- **⚠ Balance (report, not silently tuned):** Steven flagged this himself — **10 relentless super-fast dogs
  from day 1, before the player has tools, can overwhelm a fresh run.** Kept as asked (the vendetta is the
  point). Mitigations already in: baseline hunt (14) is out-runnable by a sprint (16), dogs spawn 55–95 m
  away, crouch-in-grass hides you, and a tree/wall is a hard escape — so the danger is provoke-triggered, not
  unavoidable. `SPEED_CHASE 18` is the one interpretive call: Steven said both "~1.3× lion base" (→~14) *and*
  "outrun even sprinting" — the latter is gameplay-defining, so vendetta chase = 18 (>sprint 16) and baseline
  hunt = 14 (the ~1.3×). Skirmish tuning (dogs lose 8/nip, lions 3/nip) makes dogs give ground so lions win
  skirmishes without it becoming a war. All flagged; nothing else rebalanced.

## Stone walls, Hammer & axe/hammer-on-walls (2026-07-18)
Two new kit abilities + wall HP, all riding the existing wall/`kitSwings` disposal paths.
- **Stone Wall (`kit_stonewall` 🧱)** — a second wall material. Placement shares `placeKitWall(stone)`
  (wood = `kitPlaceWall`, stone = `kitPlaceStoneWall`); both push to `wallMeshes`/`wallAABBs`/`kitWalls`
  under the same `KIT_WALL_MAX`=10 cap. Each `kitWalls` entry now carries its `ability` so
  `reconcileKitWalls`/`clearKitWalls(ability)` tear down each material independently on unequip.
  **Unsmashable by gorilla/elephant:** `wallBlockingPath` skips `userData.stone` (so neither enters a
  smash), and the gorilla — which has *no* normal wall collision — is stopped by the new
  `collideStoneWalls(pos,r)` in `gorillaMoveToward`; the elephant is already stopped by its existing
  all-walls `collideWalls`. Only the Hammer brings stone down.
- **Wall HP** on the mesh (`userData.hp`/`maxHp`): wood 120, stone 200 (`WALL_HP`). `damageWall(idx,dmg,icon)`
  subtracts and, at ≤0, fells via the shared `removeWallAt` (kept lockstep; `kitWalls` pruned next frame).
- **Axe (`kitAxe`)** now fells **wood** walls (42/swing, `wallInFront`+`damageWall`) as a 3rd priority
  (after tree-chop, animal-melee); refuses stone. **Hammer (`kit_hammer` 🔨, `kitHammer`)** smashes **any**
  wall (67/swing) first, else 67 melee via `dealKitMelee`. Its swing model `spawnHammerSwing` is a
  Group (wood haft + steel head); the `kitSwings` fade loop now traverses materials (was single-mesh) so
  Groups fade+dispose correctly.
- **Effects via small hooks** (grep `EQUIP`): `updateAbilities(dt)` (called first in `animate`) decays
  cooldowns/buffs and recomputes `EQUIP` {speedMul, visMul, healthRegenMul, hungerDrainMul} from
  accessories + timed buffs. Read in `updatePlayer` (speed), `updateStealth` (visMul), `updateHealth`
  (regen), `updateHunger` (drain). Timed ability buffs: `buffs.{adrenaline,smoke,eagleEye}`. Eagle Eye
  zooms/reveals the minimap. Fire Torch = the lion-detection **beacon** via `fireBeacon()` (replaced the
  two inline `torchState.on?8:0` reads).
- **⚠ Disposal discipline:** kit elements that create Three.js objects each ride a proven disposal path —
  Fire Torch (`abilityFX.fireTorch`, `Group{PointLight+flame}`, freed in `clearFireTorch()` on toggle-off/
  reset/game-over/unequip); Palisade Wall (`wallMeshes`/`wallAABBs`, freed by `removeWallAt`/reset/unequip);
  Campfire (`campfires[]`, freed on burnout/reset); Spear (`thrownRocks[]`, freed on hit/expire/reset); axe
  swing (`kitSwings[]`, self-disposes). Accessories + the buff abilities (Healing Herb/Adrenaline/Smoke/Eagle
  Eye) are pure stat/flag — no VRAM footprint. **Next iteration ideas:** give wood a consumer (crafting sink)
  or remove it; currency/XP so unlocks cost something; more abilities (war-cry to scatter a pride, decoy);
  accessory rarity tiers; a "loadout preset" quick-swap; mobile/touch tap-to-use for the ability bar.

## Wild-dog wall fix + sky vulture + giant snake (2026-07-19)
Three additions, all in one commit. Two new self-contained creature modules were added right after the wild
dog module (`config → mesh → spawn → FSM → dead-loop`, mirroring rhino/dog) so they ride every existing seam
(`setHitbox`/`attachHealthBar`, `killObj` disposal, the floating HP bar, the daily dawn wave, the minimap,
the thrown-weapon/boomerang/melee hit paths). **Lion AI untouched.** Offline mesh render:
`dossiers/newcreatures_render.png` (`render_newcreatures.py`) — the WebGL pane wedged this session (heavy
reset cycling), so the logic was verified headless via `update*(dt)` and the meshes rendered offline.
- **🐕 Wild dogs no longer tunnel through walls (bug fix).** `dogStep` already called `collideWalls`, but
  walls are only **0.3 thick** and a vendetta dog moves ~0.9 units/frame (`SPEED_CHASE 18`), so it jumped
  clean across a wall in one step and `collideWalls`' nearest-face push shoved it out the *far* side —
  straight through your cover. Fix: a **swept anti-tunnel guard** (`segHitsWall` over the step cancels any
  move that CROSSES a wall → dog stops on the near side), then `collideWalls` **+ `collideStoneWalls`**
  resolve resting contact for **both** wood and stone. Verified: repro'd a dog tunnelling to x=14 through a
  wall at x=10; after the fix it stops at x=9.35 (near side) for wood AND stone. (The same swept guard is
  baked into `snakeStep`.)
- **🦅 Sky vulture (`SKYV` / `skyVultureMeshes[]` / `makeSkyVulture`/`updateSkyVultures`).** A big raptor,
  **distinct from the small carcass-circling scavengers** (`vultures[]`/`makeVulture`, unchanged). Explicit
  FSM: `CRUISE → {DIVE→CLIMB | DESCEND→LANDED→TAKEOFF} → CRUISE`, with `RETREAT` overriding all. Flies at
  `SKYV.ALT = TREE_H*2` (12), cruise `20` (~1.3× a sprint). `HEALTH 80`, `DIVE_DMG 30`, `DIVE_CD 15`.
  **Targets everything except lion/gorilla/elephant** (`vulturePickTarget` scans player [stealth-gated] +
  prey [skips `elephant`] + rhinos + dogs; `vultureStrike` deals 30 + flees up). **Ranged reaches it at any
  altitude** (its `updateThrownRocks`/boomerang branches use the normal `projHit` on its 3D `pos`); **melee
  is altitude-gated** (`nearestAnimalInFront` skips it when `pos.y-ground > SKYV.MELEE_CEIL 3.0` → only
  reachable LANDED/low-dive). **Never dies airborne:** below 30% HP it enters `RETREAT` (climbs to
  `ALT_HIGH 18`, heals `HEAL_RATE 11`/s back to 70%); the dead-loop only frees a vulture whose `state==='LANDED'`
  — an airborne one that hits ≤0 is clamped to 1 HP and forced to retreat. Wings = two shoulder-pivot Groups
  rolled (`rotation.z`) sinusoidally to flap; feet = belly-pivot Groups tucked flying / extended landed
  (`animateVulture`). Minimap: indigo dot, hot-pink while diving.
- **🐍 Giant snake (`SNAKE` / `snakeMeshes[]` / `makeSnake`/`updateSnakes`).** *(Split into two variants
  2026-07-21 — see the serpent section below; the body/disposal model described here is unchanged.)*
  Elephant-length: a head + 14
  segments (`SNAKE.SEGS`) that follow the head through a **spatial delay-buffer** (`S.path`, unshifted only
  when the head moves >0.12 u, trimmed to body arc-length) with a **sine lateral undulation** (`layoutSnake`
  places each segment at its arc-length lag + `sin(slither + i·0.5)·AMP` perpendicular offset, oriented along
  the local tangent). **The whole snake is one container Group** (segments live in WORLD space, container at
  identity origin) so `killObj(container)` frees it in one call; **`o.pos` is the HEAD** (drives aim/minimap/
  hitbox — set manually, since the sprawling body would give `setHitbox` a bogus radius), the **HP bar rides
  the head** (temp-swap `S.mesh=head` during `attachHealthBar`), and **ranged uses a per-segment test
  (`projHitSnake`)** so any body part can be struck. `HEALTH 1000` (tankiest by far), `BITE_DMG 50`,
  `BITE_CD 1.0`, speed `0.85×` lion (`SPEED_HUNT 9`; a sprint outruns it). Hunts prey + exposed player,
  **locks onto + fights back** any attacker (`aggroTimer`). **Collapse death:** `S.dying` → segments sink +
  flop staggered (`deathT - i·0.09`), then the per-snake materials (`transparent`) fade to 0 → dead-loop
  frees it. Sandy `tan`/`tan2` alternating segments + darker dorsal `blot` boxes fake the carpet-python
  pattern. Minimap: green dot (bright when locked onto you).
- **Integration touch-points (both creatures):** `spawnDailyWave` (vulture 2/day cap 4, snake 1/day cap 2 —
  *snake cadence superseded 2026-07-21: 1 per 5 days, see the serpent-split section below*),
  `healAllAnimals` (snake skipped while `dying`), `updateHealthBars`, `nearestAnimalInFront`, `dealKitMelee`,
  `boomerangStrike`+`updateBoomerang`, `updateThrownRocks`, `updatePrey` flee scan (snake only — a diving
  vulture triggers flee via its strike), `drawMinimap`, `resetGame` teardown, and the `animate` update order.
- **⚠ Balance (report, not silently tuned):** the vulture's **never-dies-airborne** rule makes it very
  survivable — pure ranged-while-it-cruises can *never* kill one (it always retreats+heals at 30%), so the
  only kill window is catching it LANDED and bursting >70% before it takes off (a full-HP landed vulture is
  one-shot by a boomerang [100] or a spear+bolt combo). The snake's **1000 HP** is deliberately brutal
  (~13 spears). Autonomous interpretive calls: vulture cruise = 1.3× *sprint* (20), flight altitude = 2×
  a nominal `TREE_H=6` (=12), player-detection stealth-gated for both (consistency with other predators),
  snake speed = 0.85× lion *base* (~9), snake spear damage 80, per-segment ranged hit, boomerang allowed to
  clip a high vulture (brief lists it as a ranged weapon that reaches the air). Nothing else rebalanced.

## Serpent split: sand python + pink worm, wrap, tree-grab, siesta & growth (2026-07-21)
> *Superseded in part by the 2026-07-27 section below: a third variant (black cobra) was added, the
> 50/50 variant pick and the 1-per-5-days cadence were replaced by per-variant rolls on day 1 and day 5,
> and bite damage now scales with grown length.*
The single 🐍 giant snake became **two variants off one module** (`SNAKE` shared config + `SNAKE_VARIANTS`
table; `S.v` is the per-snake variant record). Everything else in the module — the delay-buffer body, the
container-Group/`killObj` disposal, `projHitSnake`, the HP-bar-on-the-head trick, the collapse death — is
unchanged and now shared by both. **Lion AI untouched.**
- **🐍 Sand python** — the old carpet-python look. `HEALTH 1000`, `BITE_DMG 50` / `BITE_CD 1.0`.
  `SPEED_HUNT 16` = **exactly `PLAYER.sprintSpeed`** (verified 16.00 u/s measured) — a sprint no longer
  outruns it. `SPEED_ROAM 5`.
- **🪱 Pink worm** — new procedural mesh: fatter, barely-tapered cylinders (`snakeSegRadius` branches on
  variant), **MeshPhongMaterial** fleshy pink at `opacity 0.9` + `shininess 70` (translucent/shiny), no
  dorsal blotches, a blunt sphere head with a puckered mouth ring + two beady eyes, no tongue, no teeth.
  `HEALTH 500`, `BITE_DMG 40`, `SPEED_HUNT 32` (**2× the python — fastest ground creature in the game**),
  `SPEED_ROAM 9`. New per-snake pink materials ride the same `S.mats` disposal path (verified 0 orphans).
- **WRAP attack (python only).** Adjacent to an **elephant / gorilla / rhino** (`WRAP_RANGE 4.2`) it enters
  `state='WRAP'`: **both** parties immobilised (the victim via a continuously-refreshed `stunTimer`, which
  all three already honour and which was the cheapest hook that needed **zero** changes to their FSMs), and
  `WRAP_DPS 100`/s crush damage. Breaks on **victim death / the python taking any damage / `WRAP_MAX 8` s**,
  then `WRAP_CD 5`. **Never the player** (`snakeWrapCandidate` scans only those three lists) — you get bitten.
  Measured: rhino 220 hp dead in 2.22 s (99.1 dps), gorilla 160 hp in 1.63 s.
- **TREE-GRAB (python only).** Mirrors the gorilla: sees a treed player at `TREE_DETECT 26`, closes, then
  `state='TREEGRAB'` for `GRAB_WINDUP 0.9` (the head rears up the trunk via `S._climb` → a lift term in
  `layoutSnake`), then yanks — `GRAB_DMG 50`, `GRAB_STUN 1.3`, `GRAB_KB 13`, `GRAB_CD 8`.
  ⚠ **The python calls `dropFromTree()`** to break the perch. Setting `player.pos.y` alone is NOT enough:
  while `player.inTree` is set, `updatePlayer` re-pins the player to `grapple.perch` every frame. **The
  gorilla's tree-grab (line ~3380) still does only the `pos.y` move and so does not actually pull the
  player down — pre-existing bug, left untouched, flagged for a separate fix.**
- **MIDDAY SIESTA (both).** New states `SIESTA_TRAVEL` / `SIESTA_SLEEP` on the new `S.state` field
  (`CRUISE | WRAP | TREEGRAB | SIESTA_TRAVEL | SIESTA_SLEEP`). Fires once per `dn.day` while the **DAY** is
  45–55% elapsed (`dn.time/HALF_CYCLE`, ≈11:00 in-game — note this is the day half, not the 240 s cycle).
  `pickSiestaSpot` anchors on the watering hole and scores `tallGrassClumps` in a **ring on the bank**
  (`skin = wateringHole.r`, so it never beds down in the water), rejecting steep ground (`snakeSlope`),
  wall-blocked spots (`segHitsWall`) and occupied ones (`snakeSpotOccupied`); falls back to the nearest
  clump. Sleeping = a tight breathing coil for `SIESTA_SLEEP 60` s. **Wakes instantly + hostile** if the
  player is within `SIESTA_WAKE_R 8` or on any damage.
- **GROWTH on kills (both).** `snakeCredit(S, victim)` tags every entity the serpent damages with
  `(_snakeCred, _snakeCredT)`; `snakeGrowCheck` (per frame) grows the serpent **+1 segment** when a tagged
  victim is dead within `GROW_WINDOW 2 s`. Growth goes through the **same `addSnakeSegment` used to build
  the body**, so a grown link is identical in material/gauge/spacing and disposes with the container.
  **Soft cap `SEG_MAX 50`** (console-logs the credited kill, no growth). Two supporting fixes so the body
  scales: `trimSnakePath` sizes the delay-buffer off `S.segs.length` (not the constant `SNAKE.SEGS`), and
  `layoutSnake`'s undulation phase is now per **arc-length** (`sin(slither + arc*0.7)`) not per index, so
  the wave keeps a constant physical wavelength however long the body gets. Verified at 50 segments:
  gaps stay 0.72–0.77 (= `SEG_SPACING`), no NaN.
- **Coil layout** (`layoutSnakeCoil`) drives both the wrap and the sleep. Angular step is derived from
  **arc length** (`SEG_SPACING / radius`) so loops stay contiguous at any coil radius or body length —
  a fixed segments-per-loop left visible bead-chain gaps around a rhino.
- **HP-drop watchdog** at the top of the per-snake loop (mirrors the lions'): any damage from any source
  breaks a wrap and wakes a siesta, so no damage site — present or future — has to remember.
- **Spawn cadence: one seeded on day 1, then `SPAWN_EVERY 5` days** (was 1/day), **50/50 variant** on every
  spawn, cap 2. The 5-day cadence is driven by `dn.nextSnakeDay` (seeded in `resetGame`); the **day-1 seed
  deliberately does NOT advance `nextSnakeDay`**, so the schedule still lands on day 5/10/15 — the seed is
  an extra serpent, not a shifted timetable. Verified across three fresh saves: day 1 has exactly one
  randomly-picked serpent (worm/worm/python), days 2–4 add none, day 5 brings the second → **at cap 2 from
  day 5** (previously day 10). *(Day-1 seed added 2026-07-21b at Steven's request — a run should never open
  without a serpent somewhere on the map.)*
- **Integration:** minimap colour is per-variant (`S.v.mm`/`mmHot` — python green, worm pink); every
  killfeed line now names the variant (`S.v.icon`/`S.v.label`) across `snakeBite`, `updateThrownRocks`,
  `boomerangStrike` and `dealKitMelee`. Damage numbers, `SPEAR_DMG 80`, `ROCK_STUN`, `AGGRO_TIME`,
  `projHitSnake` and the daily reheal are unchanged and shared.
- **⚠ Balance (report, not silently tuned):** (a) the python at sprint speed + tree-grab means there is no
  longer a *passive* escape from it — you break line of sight, wall up, or fight; (b) the pink worm at 32
  is **unoutrunnable, period** — a tree or a wall is the only answer; (c) in a 20-minute soak a worm
  hunting a prey-rich map hit the **50-segment cap** (+36 kills) by day 6, so the cap is load-bearing, not
  theoretical; (d) the wrap's 100 dps trivialises the big three — a rhino dies in 2.2 s — which is
  deliberate (Steven's spec) but does mean a python can strip the map of gorillas/rhinos on its own;
  (e) interpretive call: "day cycle progress 45–55%" was read as **45–55% through the daylight half**
  (≈11:00 in-game = actual midday), not 45–55% of the full 240 s cycle (which would be dusk).

## Black cobra + venom, length-scaled bites & universal counter-attack (2026-07-27)
Four changes, one commit. The serpent module went from two variants to three; the combat web went from
"everything attacks the player" to "everything attacks whatever attacks it". **Pink worm untouched** —
its mesh fingerprint (every geometry type + parameter + material colour/opacity/shininess, 20 parts)
hashes identically to the pre-change build, verified by A/B in the same browser.
- **Bite damage scales with grown length.** `snakeBiteDmg(S) = S.v.BITE_DMG + S.growth` — one helper, used
  by every bite the serpent lands (player, prey, and the new creature bites). +1 damage per segment grown
  past the starting 14; measured 40→45 at +5 segments, 40→76 at the 50-segment cap (python 50→86, cobra
  5→41). **`WRAP_DPS` (100) and `GRAB_DMG` (50) deliberately do NOT scale** — they're separate tuned
  mechanics with their own pacing, not bites.
- **☠️ Black cobra (`SNAKE_VARIANTS.cobra`).** Near-black `MeshPhongMaterial` body over a **blue belly**
  strip boxed under every segment (the cobra branch in `addSnakeSegment`, replacing the python's dorsal
  blotch), yellow eyes/tongue, and a **HOOD**: an upright fan of five thin plates hinged at the nape on a
  `THREE.Group`, each rotated about Z so they radiate up and out, every plate carrying a blue skin on its
  forward (+Z) face. `tickSnakeHood` eases one Group scale — `(0.30+h*0.82, 0.45+h*0.70, 1)` — so it snaps
  open in ~0.22 s as it commits and folds slowly after. *(First cut laid the ribs flat and the flare read
  as a plank; caught by the offline render, rebuilt as the vertical fan. `dossiers/render_cobra.py` →
  `dossiers/cobra_render.png`.)* HP 300, `BITE_DMG 5`, `SPEED_HUNT 14` — a sprint leaves it behind, which
  is the point: it doesn't chase.
- **TREE DROP-AMBUSH** (`AMBUSH_TRAVEL` / `AMBUSH_COIL`, cobra only). `pickAmbushTree` scores climbable
  trees by canopy size, closeness to the player and closeness to the serpent, skipping the player's own
  shelter tree; the cobra travels there, and `layoutSnakeCoil` (the same helper the wrap and the siesta
  use) winds it round the canopy at `terrainY + perchY`. `S.pos` — the head, which drives aim/minimap/
  hitbox — sits at perch height, so ranged must be aimed *up* at it. Player walks inside
  `canopyR + AMBUSH_DROP_R` → it drops onto them, uncoils and bites on landing, hood snapping wide.
  22 s cooldown. Minimap draws a treed cobra as a **hollow ring** rather than a dot.
- **☠️ VENOM (`VENOM` / `applyVenom` / `cureVenom`, ticked in `updateHealth`).** `player.poisonT` seconds.
  Drains `VENOM_DPS` (`(maxHealth-1)/60` ≈ 1.65 HP/s) to a hard floor of **1 HP** in 60 s, then holds
  there for the rest of `venomDuration()` = one full in-game day (`CYCLE`, 240 s). Regen blocked
  throughout. A re-bite refreshes the clock, never stacks the dps. **Cure: wade into the watering hole**
  (thematic and dangerous — it's where the pride drinks and serpents bed down) or burn a **Healing Herb**.
  HUD: the health bar goes pulsing venom-green + `☠️ POISONED Xs` in `#topright`.
  ⚠ **The floor is guarded on `player.health > FLOOR` before the `Math.max`.** A bare `Math.max(1, …)`
  *resurrects* a player already knocked below 1 by something else — caught in test, fixed; venom alone
  now never kills, but a dog bite on a poisoned player does (verified `gameState → 'over'`).
  ⚠ `venomDuration()` is a **function**, not `DUR: CYCLE` baked into the literal: `CYCLE` is declared ~1900
  lines further down with the day/night clock, so a direct reference is a **TDZ ReferenceError at load**
  that silently kills the whole bootstrap. (It did. That's why it's a function.)
- **Universal counter-attack.** The pattern already used by the lions (tag `lastHitBy`/`lastHitKind` at the
  damage site, raise the grudge from ONE HP-drop watchdog) is now applied to every fighter, so no attack
  path present or future can skip retaliation:
  - **Serpents** gained `lastHitBy`/`lastHitKind` + a watchdog that turns the tag into a target. New
    `snakeFoeValid` leashes creature grudges (34 m). `snakeBite` gained a single `else` branch covering
    lion/gorilla/rhino/dog that wounds, staggers, and tags the victim's own retaliation hook.
  - **Wild dogs** gained `dogPackThreat` (`alertDogPack`/`dogThreatValid`) — the creature-facing sibling of
    `wildDogsVendetta`. Any HP a dog loses to a tagged creature turns the whole pack on it for 14 s. They
    also now proactively mob a serpent within `HUNT_SNAKE_RANGE` 18 (shorter than the 26 prey hunt, so it
    reads as "we ran into it"). **The lion skirmish stays a skirmish**: its self-damage is hidden from the
    new pack watchdog by `D._prevHealth -= DOG.LION_NIP`, mirroring the existing lion-side hide.
  - **Lions** gained `fight_snake` (mirrors `fight_rhino` exactly — the FSM only closes to contact,
    `updateSnakes` applies `SNAKE.LION_DPS` 9/lion) + `'snake'` as a `prideThreat` kind. A serpent up an
    ambush tree is excluded everywhere via `nearestSnake`/the vendetta gate.
  - **Gorilla** foe-scan + engage-validity + swipe branch now include serpents and dogs, and its
    `RETALIATE` override is no longer gated to `lionMeshes` — anything that draws blood gets hunted.
  - **Rhino** gained `'snake'`/`'dog'` target kinds; `rhinoSmack` tags every victim kind.
  - **Elephant** gained a real grudge: `_foe`/`_foeKind`/`_foeT` (`ELE.GRUDGE` 12 s, `GRUDGE_LEASH` 45)
    set by an HP-drop watchdog and **overriding the nearest-threat pick**. Dogs and serpents are
    retaliation-only targets — the bull answers them, it doesn't go looking for them. Verified: it ignores
    a lion 2 m away and charges 20 m at the dog that actually bit it.
- **Spawn scheme.** `SNAKE.MAX 2 → 6`, `SPAWN_EVERY` replaced by `SPAWN_CHANCE 0.30`. `rollSnakeSpawns`
  runs **one independent roll per variant** (not "pick one of three") and fires on **day 1 and day 5
  only** — the old 5-day cadence and `dn.nextSnakeDay` are gone. Measured over 20 000 rolls: 0 snakes
  34.9% / 1 → 44.0% / 2 → 18.6% / 3 → 2.5%, **mean 0.887**; each variant lands 29.5%. Eight real fresh
  runs gave `[python,cobra] [] [] [worm] [cobra] [cobra] [] [python,cobra]`. Days 2,3,4,6,7,8,9 add none.
- **Disposal:** the hood, the belly strips and every grown segment are children of the one container
  Group, so `killObj(S.mesh)` still frees the lot. Verified 0 orphan objects/geometries/textures over
  repeated spawn→dispose cycles, through both `killObj` and the real death-collapse path, with the HP
  bars forced visible so their CanvasTextures were actually uploaded. (Cycle 1 shows a one-off delta —
  that's the shared `userData.keep` sprite geometry uploading, not a leak; cycles 2 and 3 are 0/0/0.)
- **⚠ Balance (report, not silently tuned):** (a) a serpent that feeds all run is a different animal —
  a worm hit the 50-segment cap by day 6 in an earlier soak, which now means a 76-damage bite; (b) wild
  dogs mobbing serpents is a slaughter in the serpent's favour (a python one-shots a 25-HP dog) — kept,
  because it's what the ethology implies and the pack grudge is the point; (c) the elephant's grudge makes
  it markedly more dangerous to poke; (d) the cobra's venom is the first status effect in the game and the
  first thing that can make an *unrelated* animal lethal. **A/B soak (480 s, passive player at the map
  centre) shows lion attrition is IDENTICAL with and without serpents** (6 → 0–2 either way) — the pride
  being ground down by the gorilla/rhino/dog ecosystem is pre-existing, not caused by these changes.
  Interpretive calls: cobra killfeed icon is ☠️ (no cobra emoji exists); venom cure = water + herb;
  drop-ambush chosen over strike-from-branch; `SNAKE.MAX` raised to 6 so "all three at once, twice" fits.

## Cobra visual pass — scale skin, spade head, membrane hood, rear-up (2026-07-27b)
Pure aesthetics on the black cobra: **no mechanic, tuning or spawn number changed**. Verified by
mesh fingerprint (geometry types + params + material colour/opacity/shininess/emissive/specular/map/side
+ local transforms, world positions excluded because the spawn heading is random) that the **pink worm
(19 parts) and sand python (25 parts) hash IDENTICALLY** to the pre-change build, A/B'd against
`git show HEAD:index.html` served side by side in a second tab. Cobra went 45 → 60 meshes.
- **⚠ Colour convention — read this before touching any hex here.** `renderer.outputEncoding` is
  `sRGBEncoding` while colours and textures go in un-decoded, so the framebuffer is gamma-lifted on
  output and **everything renders ~2× lighter than its literal**. A `0x1c1e2b` body came out steel-grey;
  the shipped skin bottoms out at `#000000`. This is the convention the whole file is already authored
  against — judge colours on screen, never on the hex. `dossiers/render_cobra.py` reproduces the same
  gamma so the offline sheet doesn't lie.
- **Scale skin (`cobraScaleTex`).** Per-snake 64² CanvasTexture: offset rows of keeled scales, graphite
  at the root fading to black at the tip, each with a cool blue rim; `repeat(4,2)`. `matA`/`matB` are the
  same map at two brightnesses, so the segment banding finally shows (the old `0x121218`/`0x08080d` were
  three units apart — invisible). **Deliberately NOT cached at module scope** like `giraffeTex()`/
  `elephantTex()`: serpent materials are per-snake so the death collapse can fade them, and
  `disposeObject3D` frees every texture hanging off a material — a shared instance would be pulled out
  from under the second cobra on the map.
- **Head.** Box+cone → scaled spheres: a flattened wedge skull with **venom-gland cheeks**, a blunt
  snout, **brow ridges**, small amber eyes with dark pupils (the old ones were 0.065 golf balls in the
  tongue's material), a **hinged jaw**, two **fangs**, and a **forked flicking tongue** (was a fixed
  yellow plank). New per-snake `eyeM`/`spotM`/`fangM`, all in `S.mats` so the collapse fades them.
- **Hood.** Third attempt at this shape: five flat plates read as a plank (prior session), seven
  overlapping ones read as a sawtooth — the silhouette gives it away and rectangles can't make a curve.
  Now **one `ShapeGeometry` off a bezier outline**, wider than tall, blue on the front, with the
  spreading ribs kept only as **keels on the dorsal side**. The dark backing takes **two** plates, not
  one flipped plate: `matA` is FrontSide, so a single back-facing sheet leaves the enlarged margin
  invisible from the front — a see-through notch round the hood.
- **Ventral scutes.** The belly is now an **arc of the body cylinder** wrapping the underside
  (`thetaStart -0.65, thetaLength 1.30`; `rotateX(PI/2)` maps theta 0 to -Y) instead of a flat box that
  hung off the tube like a bolted-on plank. `matBlot` is `DoubleSide` for the cobra.
- **One pose function.** `setSnakeHood(S,h)` is the only place the threat pose is set — flare, jaw
  rotation, fang drop and the **flattened neck** (first 5 segments scaled wide+flat; safe because no
  layout path ever touches segment *scale*). `tickSnakeHood` calls it, and so does the drop-ambush
  landing, which used to poke `hoodGrp.scale` directly with hand-copied numbers.
- **Motion.** A hooded cobra now **rears** — `layoutSnake` lifts the head + forward third by `_hood*0.95`,
  tips the head down and adds a slow weave. Purely visual: `S.pos` (hitbox/aim/minimap anchor) stays on
  the deck and the rise is well inside `hitTop` 1.7. **Hood ease rates untouched** (4.5 open / 1.8 close
  = 0.22 s time constant, ~0.65 s to full spread, ~1.6 s to fold).
- **Verified:** 60 s live sim with all three variants — 0 errors, 0 NaN, hood cycles 0↔1; venom bite
  still sets 240 s, bleeds to exactly 1 HP and holds without killing; drop-ambush still fires and pins
  the hood/jaw/fangs wide; `snakeBiteDmg` still scales (5 → 10 at +5 growth); `rollSnakeSpawns` untouched.
  **Disposal: 0 orphan objects/geometries/textures** over 4 spawn→dispose cycles, through the real
  death-collapse path, and across `resetGame` — with HP bars forced visible so their CanvasTextures
  actually uploaded. The shared `memGeo` and skin texture are each referenced by several meshes;
  `dispose()` is idempotent in three r128, so the repeated frees are no-ops.
- **⚠ Tooling note:** the Browser pane composites blank/black for this page even while
  `renderer.info.render` reports ~1350 draw calls, and render-to-texture readback returns all zeros
  (`INVALID_OPERATION` on `render()` into an FBO) — so **neither pane screenshots nor `readRenderTargetPixels`
  are a usable feedback loop here**. Everything visual was iterated through `dossiers/render_cobra.py`;
  everything behavioural through in-page `javascript_exec`, which works fine.

## Cobra night hunter — bite 20, growth-scaled, day-ambush ↔ night-hunt (2026-07-28)
Steven's note: *"the cobra is boring because it just sits in a tree."* It now runs on the **clock** —
canopy drop-ambush by day, an active ground hunter after dark. **No new Three.js object, geometry,
material or texture is created for any of this**; the night states reuse `layoutSnakeCoil`,
`layoutSnake`, `snakeStep` and `snakeUncoil`, so the disposal story is unchanged. **Pink worm and sand
python are untouched** — `makeSnake`'s only diff is added *state fields*, no mesh code was touched, and a
600 s / 2.5-cycle full-loop soak shows both only ever in `CRUISE`/`SIESTA_TRAVEL`/`SIESTA_SLEEP`, never in
a night state.
- **Bite 5 → 20, and it still injects venom.** Full HP → 80 on the bite, venom then bleeds to 1 HP. The
  combination is lethal in two: verified 100 → 80 → (58 s) 1 → bite → −19 → `gameState 'over'`.
  **The venom mechanic itself is byte-for-byte unchanged** and re-verified end to end: 1.65 HP/s to a hard
  floor of exactly 1 HP, held for the full `CYCLE` 240 s, regen blocked, both cures working (watering hole
  240→0, Healing Herb 240→0 + heal).
- **Growth already applied to the cobra** — `snakeBiteDmg(S) = S.v.BITE_DMG + S.growth` has been universal
  since 2026-07-27, so item 1 of the brief needed no code. Re-verified through the real
  `snakeBite → snakeCredit → snakeGrowCheck → addSnakeSegment` path: 5 kills → 19 segments → **25 dmg**.
  Damage table: base **20** · +1 **21** · +3 **23** · +5 **25** · +10 **30** · at the `SEG_MAX` 50 cap (+36) **56**.
  `WRAP_DPS` and `GRAB_DMG` still deliberately do NOT scale (and the cobra has neither anyway).
- **`NIGHT_DESCEND` → `NIGHT_HUNT` → (dawn) `AMBUSH_TRAVEL` → `AMBUSH_COIL`.** New cobra-only states,
  gated on the variant's new `night:true` flag. The day↔night switch is driven **per-serpent inside
  `updateSnakes`** (not from `updateDayNight`) so each cobra flips on its own terms and no other creature's
  clock has to know serpents exist — the same reasoning the midday siesta already used.
  - **Descent** (`NIGHT_DESCEND_T` 1.1 s): the canopy coil unwinds *down the trunk*, widening and
    quickening, via `layoutSnakeCoil` with a lerped centre/radius/spin. `S.pos` (aim/minimap/hitbox) comes
    down with it. Announced in the killfeed **only within 45 m** — a global message would hand the player
    the position of every cobra on the map at dusk.
  - **Patrol** `NIGHT_ROAM_R` **40 m** around `S.nightAnchor` (the base of the tree it came down from), at
    `SPEED_ROAM` 6. `pickNightPatrolSpot` rejects steep ground and wall-blocked spots, repicks every
    `NIGHT_PATROL_T` 9 s. A chase that drags it past `NIGHT_REANCHOR` 1.6× the radius **moves the anchor**
    rather than rubber-banding it back to one tree.
  - **Detection**: player at the module's existing `DETECT` 22 × `stealth.visMul` (so crouch-in-grass still
    hides you — measured `visMul` 0.595 → 13 m); creatures at `NIGHT_HUNT_R` **26** (the wild dog's
    `HUNT_PREY_RANGE`). `snakeNightTarget` scans lion / dog / gorilla (skipping `perched`) / rhino / prey,
    nearest wins, player first.
  - **Strike**: closes at `SPEED_HUNT` 14, **commits inside `NIGHT_STRIKE_R` 6** (`_commitT`), bites at the
    shared `MELEE_R` 3.0 on the variant's 1.6 s cooldown. No drop-from-canopy in this state.
  - **Dawn**: `retreatToTreeAtDawn` reuses `pickAmbushTree` (big canopy, near the player's side, near us).
    No tree in reach → `CRUISE` + `ambushCd 6` so the existing CRUISE gate retries.
  - **Mid-strike at dawn completes first.** The retreat is gated on `_commitT<=0`, so a cobra inside strike
    range when the sun comes up finishes the strike, then leaves. `NIGHT_DAWN_GRACE` 8 s is the hard
    backstop. Verified: dawn at frame 39 → killing bite at frame 41 → `AMBUSH_TRAVEL` at frame 42.
- **⚠ Give-up rule (an interpretive addition, not in the brief — flagged).** First cut, a night cobra
  locked onto the nearest prey and chased it forever: at speed 14 it cannot run down an impala, so it never
  patrolled, never bit anything, and the hood sat pinned open the whole time. Fixed with
  `NIGHT_GIVEUP` **4 s** — a target the gap hasn't *closed* on is dropped and skipped for `NIGHT_SKIP` 10 s,
  and it goes back to working the ground. Slow things (lion, rhino, gorilla, cornered dog) are unaffected
  because the gap does close, resetting the timer. Without this the feature does not read as a hunt.
- **The night look is the folded hood.** On a night hunt `tickSnakeHood`'s `want` is tied to `_commitT`,
  **not** to the day rule's mere proximity (`HOOD_R` 7) — so it travels through the dark hood-down and only
  spreads in the last few metres. Switching target clears the commitment, so a flare can't ride over from
  something it was about to bite a moment ago. Since `layoutSnake` already rears the head off `_hood`, a
  committing night cobra rears as it flares — free, and the only warning you get. Growth shows in the
  slither for nothing (the delay-buffer body already scales).
- **Everyone-fights-everyone needed no new wiring.** The nine `state!=='AMBUSH_COIL'` guards that make a
  treed serpent unreachable (`nearestSnake`, the lion/gorilla/rhino/elephant foe-scans, `nearestAnimalInFront`,
  the vendetta gate) all pass for `NIGHT_HUNT`, so a grounded cobra is automatically a legal target for
  everything and its bites already tag each victim's own retaliation hook. Verified live: a night cobra
  hunted a wild dog 14→2.8 m, bit twice (20 then 21 after growth), killed it, and the dog's
  `lastHitKind==='snake'` / `lastHitBy===cobra` fired the pack grudge.
- **Minimap** unchanged and correct by construction: the hollow-ring branch is gated on `AMBUSH_COIL`, so a
  treed cobra is still a ring and a night hunter is a solid violet dot (verified — exactly 1 stroke call
  with one cobra in each state).
- **Disposal: 0 orphan objects / 0 geometries / 0 textures**, over **7** full spawn → grow-to-34/42-segments
  → night-hunt → descend → tree → real death-collapse cycles, with the HP bars forced visible so their
  CanvasTextures actually uploaded. (An earlier audit showed a positive *object* delta; that was the harness
  — crossing dawn fires `spawnDailyWave`, and prey killed without `updatePrey` running are never reaped.
  Isolated, it is 0/0/0 every cycle.) A 600 s full-game-loop soak: **0 errors, 0 NaN**.
- **⚠ Balance (report, not silently tuned):** (a) **the cobra is now a top-tier threat** — 20 + venom means
  two bites kill from full, and after dark it comes to find you instead of waiting; the counterplay is that
  a tree or a wall still stops it (no tree-grab), so height is the night answer. (b) **A cobra on the ground
  at night is itself exposed** — in the soak one of the two cobras was killed by the ecosystem before dawn,
  which never happened while they only sat in canopies. Night-hunting cuts both ways, and cobra population
  will run lower than it did. (c) The give-up rule (4 s / 10 s skip) is my call, made to stop the feature
  degenerating into an endless antelope chase. (d) `pickAmbushTree` is reused for the dawn retreat rather
  than a strict "nearest tree" as the brief worded it — it already scores by closeness *and* canopy size and
  keeps one code path; a cobra that re-trees somewhere useless is just scenery again. (e) Detection ranges
  were matched to the wild dog (22/26) rather than invented.

## Three birds: martial eagle (sky hunter) + secretary bird (ground snake-hunter) (2026-07-29)
Two new self-contained creature modules dropped in **right after the sky vulture** (`config → mesh → spawn
→ FSM → dead-loop`, the same shape as rhino/dog/vulture/serpent), so they ride every existing seam:
`setHitbox`/`attachHealthBar`, `killObj` disposal, the floating HP bar, `healAllAnimals`, the minimap, and
the thrown-weapon / boomerang / melee hit paths. **The sky vulture is byte-for-byte untouched** — its whole
module hashes identically to `HEAD` (15 663 chars either side), as do `makeVulture`/`updateVultures`/
`removeVultures`/`spawnVultures` (the small carcass scavengers). A whole-file line diff is **871 lines added,
4 lines changed**, and all four changed lines are named below.
- **🦅 Martial eagle (`EAGLE` / `eagleMeshes[]` / `makeMartialEagle` / `updateMartialEagles`).** The
  vulture's deliberate opposite. FSM `SOAR → BANK → STOOP → LAND → REBOUND → SOAR`. Soars at
  `ALT = TREE_H*3.6` (**21.6**, vs the vulture's 12) in **long straight transects with the wings held dead
  level** (`animateEagle`'s flap is 0 in SOAR — the wings only breathe at ±0.035; the vulture flaps 0.55 at
  11 Hz and wanders). Stoop = `SOAR_SPD × DIVE_MUL` = **15 × 3.5 = 52.5**, wings swept back via a
  `rotation.y` yaw on the shoulder Groups and talons thrown forward. `STRIKE_DMG` **25**. A landed strike
  arms `rand(CD_MIN 90, CD_MAX 120)`; a **miss** only costs `MISS_CD` 14 and it re-soars.
  **Never scavenges** — `eaglePickTarget` scans *only* the player (stealth-gated, `playerOffGround`
  excluded), `EAGLE.SMALL_BUCK` (`gazelle`/`impala`/`warthog`) and wild dogs; it never touches `carcasses`,
  lions, gorillas, rhinos, elephants, giraffe, zebra, kudu, wildebeest or serpents. Verified species-by-species.
  110 hp; **it CAN die airborne** (unlike the vulture) — `E.dying` drops it out of the sky at `FALL_SPD` 14,
  tumbling, and the dead-loop frees it on contact with the ground. **No new object is created for the fall.**
- **🦩 Secretary bird (`SECR` / `secretaryMeshes[]` / `makeSecretaryBird` / `updateSecretaryBirds`).**
  Walks. FSM `ROAM → STALK → CIRCLE → STRIKE`, plus `FLY/LANDING`. Solo — no pack centroid, deliberately,
  so it never reads as a wild dog. `HUNT_SNAKE_R` **70**: it will cross most of the map for a serpent
  (`AMBUSH_COIL` excluded — a treed cobra is unreachable, which is exactly why the **night** cobra is the
  interesting fight). The **hesitation is the signature**: `CIRCLE` orbits the coil at `CIRCLE_R` 4.0 for
  1.1–2.6 s before it commits, then `STRIKE` bristles the crest (`animateSecretary`'s `bristle` drives the
  six quill cones on their nape Group) through a 0.45 s windup and lands the stomp. **It drops the kill and
  returns to ROAM — it does not eat.** Player damage **15**, only if you're inside `KICK_R` 3.2.
  **Flight is a last resort** (`secretaryInDanger`: <45% HP, or a lion/gorilla/rhino inside 7 m) and
  `FLY_CD` 18 stops a hurt bird flapping up the instant it lands — it gives ground on foot and regens
  `REGEN` 1.5/s while clear instead. (A first cut had no cooldown and the bird thrashed take-off/land
  forever, spamming the killfeed.)
- **⚠ The stomp's damage is an interpretive call — read this before retuning it.** The brief said
  "60 damage — one-shots young, high-growth snakes need multiple hits". **60 flat one-shots nothing**:
  serpents carry 300 (cobra) / 500 (worm) / 1000 (python) and never scale HP with growth. So the kick is
  `SECR.SNAKE_DMG` 60 **plus a spine-break term worth the serpent's whole health bar at zero growth,
  fading linearly to nothing by `SECR.SPINE_SEGS` 6 segments of growth** — which makes both halves of the
  brief literally true and puts the difficulty on the axis Steven named. Measured:
  worm growth 0 → **1** kick · 3 → **2** · 8 → **9**; python 0 → **1**; cobra 3 → **2**, 6+ → **5**.
  Killfeed says "snaps its spine" while the term is live, "stomps to death" once it isn't.
- **Everyone-fights-everyone.** The whole integration turns on one predicate, `eagleGrounded(E)` /
  `secretaryGrounded(B)` (and the shared `nearestGroundBird` / `groundBirdValid` helpers next to
  `nearestSnake`): **a bird in the air is not a legal target for anything with legs.**
  - **Lions** gained `fight_bird`, mirroring `fight_snake` exactly — 4 one-line touches in the lion code
    (the `ptOk` guard, the `prideThreat` dispatch, the proactive 13 m scan, the movement branch, the speed
    list). The lion FSM only closes to contact; **the maul damage is applied inside each bird's own module**
    (`EAGLE.LION_DPS` 16 / `SECR.LION_DPS` 14), the same seam the rhino and the serpent already use, so lion
    AI stays a movement decision. Verified: 3 lions on a mantling eagle → `fight_bird`, 64 hp off in 10 s,
    bird tagged `lastHitKind:'lion'`; the same eagle **soaring → no lion ever enters `fight_bird`, 0 damage**.
  - **Gorilla** foe-scan + engage-validity + swipe branch all gained both birds, grounded-only. Verified:
    `engaging` → "🦍 Gorilla swiped at the secretary bird", bird tagged `'gorilla'`.
  - **Serpents** gained `'secretary'`/`'eagle'` in `snakeFoeValid` and `snakeNightTarget`, and a
    `snakeBite` branch that wounds + tags. Verified both directions: a night cobra locks onto the bird
    (`targetKind:'secretary'`) while the bird works it (`B.snake === cobra`); ungrown cobra loses in 3 s,
    grown cobra (bite 28) kills the bird instead.
    ⚠ The bite branch deliberately **does NOT reset the bird's state** — a first cut knocked it back into its
    hesitation circle on every bite, and a serpent striking on a 1.6 s cooldown could then hold it off forever
    so it never landed the one kick it exists to land.
  - **Wild dogs**: `dogThreatValid` accepts both kinds via `groundBirdValid` (so a raked pack chases the
    eagle only once it's on the deck — mirroring the existing `skyvulture`/`LANDED` rule), and `dogBite`
    gained tagging branches. Verified: raked dog → `dogPackThreat.kind === 'eagle'` **only while the eagle is
    grounded**; grudge is dropped the instant it climbs.
  - New `SNAKE_VICTIM_NOUN` map so the serpent's creature-kill line reads "killed the secretary bird", not
    "killed a secretary".
- **Spawn cadence** (`rollBirdSpawns`, called from `spawnDailyWave` — they are NOT part of the dawn wave):
  **1 of each guaranteed on day 1**, then the eagle rolls `BIRD_SPAWN_CHANCE` 0.5 on **day 4 and day 8** and
  the secretary bird on **day 6**. Nothing on any other day. Measured over 400 trials × 10 days:
  day 1 = 100%/100%, day 4 = 49.5% eagle, day 6 = 48.5% secretary, day 8 = 49% eagle, **every other day 0%**.
  Caps `EAGLE.MAX` 3 / `SECR.MAX` 2 hold through `rollBirdSpawns`.
- **Silhouette test** (measured from the live meshes, heading zeroed): vulture span **5.31** / 22 parts /
  alt 12 / 80 hp · eagle span **8.57** / 47 parts / alt **21.6** / 110 hp · secretary span 4.75 but
  **3.81 tall** (the tallest) / 41 parts / ground / 90 hp. Offline sheet:
  `dossiers/birds_render.png` (`dossiers/render_birds.py`, gamma-matched — see the sRGB note above).
  ⚠ **The Browser pane's compositor wedged again** (black screenshot while `renderer.info.render.calls`
  reported 2953) — as the tooling note predicts, everything visual went through the offline projector and
  everything behavioural through in-page `javascript_exec`, which works fine.
- **Disposal: 0 orphan objects / 0 geometries / 0 textures**, over spawn → damage → attack → **real** death
  path (eagle: fall-then-free; secretary: dead-loop) → despawn, with HP bars forced visible so their
  CanvasTextures actually uploaded, re-run after the mesh polish pass. The strong check also passes: every
  geometry fires `dispose` **exactly once** (258/258 through `resetGame`, 0 missed, 0 left in the scene).
  Materials fire more than once because one material is shared across many meshes in a bird and
  `disposeObject3D` traverses per-mesh — `dispose()` is idempotent in three r128, same as the cobra.
  Soaks: 600 s full-`animate()`-order ecosystem loop → **0 errors, 0 NaN**, all three birds alive the whole
  run; a second 400 s soak with serpents seeded → 0 errors, and **the secretary bird cleared both serpents
  off the map** (STALK 292 / CIRCLE 503 / STRIKE 120 ticks).
- **⚠ Balance (report, not silently tuned):** (a) the **eagle is a light touch by design** — 25 damage on a
  90–120 s cooldown means ~3–4 strikes per 10 minutes, so it's atmosphere plus a nasty surprise, not a
  threat you have to answer; if Steven wants it to bite, `CD_MIN/CD_MAX` is the one knob. (b) The
  **secretary bird measurably changes serpent population** — in the 400 s soak it wiped both serpents. That
  is the "real predator-prey with snakes" the brief asked for, but it does mean serpents will run rarer on
  maps where a bird survives. Counter-pressure exists (a grown cobra beats it; lions and the gorilla mob it
  on the ground). (c) The **spine-break formula** is mine, forced by the brief being internally inconsistent
  with serpent HP — flagged above with the full kick-count table. (d) The eagle's `hitR` comes out **4.57**
  (the largest in the game) because `setHitbox` measures the bounding cylinder and this bird has an 8.6 m
  wingspan; ranged still can't cheat it, because `projHit` also gates on `y < pos.y + hitTop` (1.8), so a
  ground-level throw can't clip a bird 21 m up. (e) `EAGLE.MISS_CD` 14 (a whiff costing far less than a hit)
  is an interpretive addition — the brief said "miss → rebound without damage, re-soar" but gave no number,
  and without one it would re-dive on the same frame. (f) Neither bird drops a body part, matching the wild
  dog's "pure challenge" precedent.

## Stun policy, cobra strike rate, creature venom & serpent predator-hunting (2026-07-29)
Six changes in one commit, all combat tuning — **no new Three.js object, geometry, material or texture is
created anywhere in this batch**, so the disposal story is untouched. Merged on top of the birds session
(`7349f39`), which landed first. **Serpent meshes are byte-identical**: pink worm (19 parts), sand python
(25) and black cobra (60) all hash the same as the pre-change build, A/B'd in two tabs against
`git show HEAD:index.html`. *(Fingerprint caveat worth keeping: the cobra's hood is a `ShapeGeometry`, and
three r128 embeds the Shape's **random uuid** inside `geometry.parameters` — so a naive param hash differs
between two cobras in the **same** build. Strip `"uuid":"…"` before comparing or the check lies.)*
- **⚠ Stun is now governed in ONE place** — `stunnable()` / `stagger()` / `rockStun()`, declared just above
  `setHitbox`. Two rules:
  1. **Creature-on-creature stagger only lands on the two TANKS** (elephant, rhino). Every other animal takes
     its damage and keeps executing its AI. Steven: predators were "stagger-locked into paralysis", which
     broke the fight loop. Routed through `stagger()`: elephant trample, gorilla swipe, rhino gore, dog bite,
     eagle strike, secretary kick, `snakeBite`'s creature branch.
  2. **Of the player's weapons only the thrown ROCK stuns — and it stuns anything it hits, tank or not.**
     Axe, hammer, spear, crossbow bolt and boomerang are pure damage. `updateThrownRocks` gates on a new
     `isRock = !r.spear && !r.crossbow`; `dealKitMelee` and `boomerangStrike` had every `stunTimer` /
     `state='stunned'` write deleted. **Fleeing is not stun** — `state='flee'`/`alertTimer` writes stay,
     because that is prey AI, not paralysis.
  - **Two deliberate exemptions, both commented in place:** the sand python's **WRAP** (a continuously
    refreshed `stunTimer` that *is* the mechanic — routing it through `stagger()` would stop it holding a
    gorilla; verified the wrap still kills a gorilla in ~1.6 s), and **`player.stunTimer`**, which is a
    separate system and is untouched everywhere.
  - Verified matrix: rock → elephant 2.5 s / dog 0.9 / lion 5 / rhino 1.2 / gorilla 1.5; spear, bolt,
    boomerang, axe, hammer → **0 s on every target**; `stagger()` applies only to elephant + rhino.
- **☠️ Cobra bite cooldown `1.6 → 0.5`** (`SNAKE_VARIANTS.cobra.BITE_CD`). **2 bites/second = 40 dmg/s** at
  base 20, rising to 112 dmg/s at the `SEG_MAX` 50 cap (bite 56). Measured against a live grounded player:
  **5 bites, 2.25 s, 44.4 effective dps** (bite 40 + the venom co-ticking) full health → `gameState 'over'`.
  Fast enough that the venom is no longer the thing that gets you — the strike rate is.
  *(Harness note: `snakeBite('player')` early-returns on `playerOffGround()`, and a freshly `resetGame`d
  player sits at y=2 until `updatePlayer` settles them onto the terrain — run a few `updatePlayer` frames
  first or the bite silently no-ops and the test reads as "0 damage".)*
- **☠️ Venom now applies to ANIMALS** (`applyCreatureVenom` / `updateCreatureVenom`, ticked from `animate()`
  between `updateSnakes` and `updateHealthBars`). Same shape as the player's, but **`venomDps` is scaled off
  the victim's own `maxHealth`** — `(maxHealth-1)/60` — so "1 HP at 60 s" holds at any size (verified: 25-HP
  dog, 58-HP lion and 500-HP worm all sit on exactly 1 HP at t=60 s). Applied in `snakeBite`'s prey **and**
  creature branches when `S.v.venom`.
  - ⚠ **It floors at 1 HP and never kills**, exactly like the player's — that is the explicit "(1 HP over
    60 s, held 240 s)" spec. Same `health > FLOOR` guard *before* the `Math.max`, so it can't resurrect
    something already killed by another source. One line (`Math.max(VENOM.FLOOR, …)` → `0`) makes it lethal
    if that's wanted instead.
  - ⚠ **`healAllAnimals` now skips a poisoned animal.** The day/night reheal fires every 120 s but venom runs
    240 s, so without this the poison was erased halfway through every time — it is the animal analogue of
    the player's "regen blocked". They heal at the first turn *after* `poisonT` expires (verified both ways).
  - **No cure path for animals** (water + herb stay player-only) and no HUD indicator; the HP bar staying up
    while they bleed is the tell, and it falls out of the existing damage-detection in `updateHealthBars`.
- **🪱 Worm + 🐍 python now hunt PREDATORS, not just prey** — new `snakeCruiseTarget(S)`, used by the CRUISE
  branch in place of the old prey-only scan. In: lion, wild dog, gorilla (not perched), grounded
  secretary/eagle, prey, and serpents of a **different variant**. Out: **its own variant**, and the two
  **tanks** (elephant, rhino — "those can still stomp it"), which stay retaliation-only targets. Serpent-vs-
  serpent needed a `'snake'` arm in `snakeFoeValid` and in `snakeBite`'s creature branch (plus a variant-label
  kill line). **Kept separate from `snakeNightTarget`** rather than merged with it — that one is the cobra's
  night behaviour from `cb7f991` and is deliberately untouched.
- **Verified**: 600 s / 3-day soak × 3 reps per build, **0 errors, 0 NaN**; cobra still cycles
  `AMBUSH_COIL → NIGHT_DESCEND → NIGHT_HUNT → AMBUSH_TRAVEL` and worm/python never enter a night state;
  player venom unchanged (240 s, 1.65 dps, 1 HP at 60 s, held, both cures); **disposal 0 objects / 0
  geometries / 0 textures** over 4 grow-to-34-segment → poison → real-death-collapse cycles with HP bars
  forced to upload. *(A looser audit showed +1 texture/cycle — that was **other** animals' HP-bar
  CanvasTextures uploading as venom damaged them, not a leak; strip the world to serpents only and it's
  0/0/0 from cycle 1.)*
- **⚠ Balance (report, not silently tuned) — A/B, 3 reps × 600 s each, serpents seeded 1 of each:**
  | | pre-change | post-change |
  |---|---|---|
  | lions left | 0.7 | 1.7 |
  | wild dogs left | 0 | 0 |
  | gorillas left | 3.0 | **1.7** |
  | rhinos left | 5.0 | 5.0 |
  | **prey left** | **35.7** | **76.3** |
  | serpents left | 2.3 | 1.7 |
  (a) The real, robust delta is **prey survivors more than doubling** — the serpents moved their predation
  off the herds and onto the predators. (b) **Gorillas take the hit** (3.0 → 1.7): they're now actively
  hunted by cruising serpents. (c) **Rhinos are flat at 5.0**, confirming the tank exclusion works. (d) Lion
  and dog attrition is *not* meaningfully worse — dogs already went to 0 in both builds, which matches the
  pre-existing note in the 2026-07-27 section. (e) Serpents themselves die slightly more often now that they
  fight each other and nothing is stagger-locked while fighting back.
- **⚠ Two spec conflicts in the brief, resolved and flagged:** (i) rule 1 said "stun only elephant + rhino"
  but the test matrix said "rocks stun everything they hit, per (2)" *and* "elephant + axe → no stun". Only
  one reading satisfies all four stated tests: **the weapon rule governs player weapons (rock-only), the
  animal rule governs creature-on-creature (tanks-only)** — which is what shipped, and it leaves both rules
  doing real work. (ii) "dead in a minute" vs "(1 HP over 60 s, held 240 s)" for creature venom — shipped the
  explicit math (floors at 1), since a 1-HP animal is functionally dead and a killing venom would have to
  route a new "died with no killer" path through eight separate dead-loops.


## Cobra 700 HP, canopy venom SPIT + the low-HP TREE TURRET, and faster lions (2026-07-30)
Steven's batch: *"the cobra… I have seven hundred health because I wanted to have seven hundred. I have
decided."* · *"when it's hiding in a tree, I want it to shoot venom"* · *"if it's below, let's say, a hundred,
it stays in the tree and just shoots venom… because right now it'll run out and I can just punch it, one-shot
it"* · *"can you make the lions a little bit faster?"*

- **☠️ Cobra HP 300 → 700** (`SNAKE_VARIANTS.cobra.HEALTH`). Now **9 spears** (`SNAKE.SPEAR_DMG` 80) instead
  of 4, and second only to the python's 1000. It was dying before the day/night cycle it is built around ever
  got to run. Bite damage, `BITE_CD` and growth-on-kill are untouched.
- **🟢 Venom SPIT from the canopy — genuinely new; it did NOT exist before.** Grep confirmed: no `spit` code
  or config anywhere in the build, so the "shoots venom from the tree" Steven half-remembered had never
  shipped. A cobra in `AMBUSH_COIL` now rears and sprays: `SPIT_R 24`, `SPIT_CD 2.2`, `SPIT_DMG 8` flat,
  `SPIT_SPEED 30`, `SPIT_HIT_R 1.5`, `SPIT_LEAD 0.35`. Impact calls the **existing** `applyVenom()` /
  `applyCreatureVenom()` — no new poison rules, just a ranged delivery for the ones that were already there.
  - **Target priority:** player (skipped when `playerOffGround()` or `segHitsWall` — the same rule
    `snakeBite` uses, so *height stays the answer to a serpent*), else the nearest creature in range
    (`pickSpitTarget` — lion / dog / grounded gorilla / rhino / grounded birds / prey / other-variant
    serpents). Steven asked for "venom at everything" and creature venom already existed from 2026-07-29.
  - **Dodgeable on purpose.** It leads the target's velocity rather than homing: measured **5/5 hits on a
    stationary player at 3.8 m, 0/4 on one sprinting laterally at 18 m.** Standing still in the open is a
    guaranteed hit; moving breaks the line. A homing spit would have made a turret an unavoidable damage tick.
  - **The hood is the tell.** The AMBUSH_COIL branch of the hood controller used to force `want=0` (so the
    drop stays a surprise); it now flares for `SPIT_FLARE 0.7 s` after each spray via `S._spitFlare`. Flash
    out of a canopy = you are in range.
  - **Its own FX array, not `thrownRocks[]`.** That list is the *player's* projectile system (it resolves
    player damage, tool names, craft drops); a creature attack has no business in it. `venomSpits[]` mirrors
    `_dustPuffs` instead — per-blob geometry+material, `killObj` on impact/expiry, `clearVenomSpits()` from
    `resetGame`, `SPIT_MAX 24` cap. **Verified 0 objects / 0 geometries / 0 textures** over ~20 s of
    continuous spitting, and `resetGame` freed 6 in-flight blobs to 0.
  - **`updateVenomSpits(dt)` sits immediately after `updateSnakes(dt)`** in `animate` so a blob a
    now-dead cobra had already launched still lands.
- **🎯 The TREE TURRET — the actual fix for the exploit.** Below `RETREAT_HP 100` a cobra abandons whatever it
  was doing, runs at `RETREAT_SPEED 14` (not the strolling `AMBUSH_SPEED 8`) to the **nearest** climbable tree
  (`pickNearestClimbableTree` — unbounded search, 240 climbable trees on the map, so it always has an answer),
  climbs, and `S.turret` makes that a **ONE-WAY DOOR**.
  - **Deliberately NOT a new state.** It is `AMBUSH_TRAVEL`/`AMBUSH_COIL` with `turret` set, so all ~15
    existing `state!=='AMBUSH_COIL'` unreachability guards (melee aim via `nearestAnimalInFront`, the lion /
    gorilla / dog / rhino foe scans, the pride-vendetta `ptOk` gate, the minimap ring) apply to it for free.
    A new state would have needed all fifteen edited.
  - **Four exits gated off `!S.turret`:** the dusk `startNightDescent`, the `hurt` → struck-out-of-the-canopy
    drop, the walk-under drop-attack, and `AMBUSH_TRAVEL`'s hurt-abort + bite-detour. Its tree being felled is
    the only thing that moves it, and then it just climbs the next nearest one.
  - **It does NOT reheal** (`healAllAnimals` skips a turret). A turret can never be reached in melee, so a
    700-HP top-up every 120 s would have made it an immortal venom sprinkler. Staying wounded is what keeps
    the counter-play honest.
  - **Counter-play is ranged**, which already worked: `projHitSnake` has no `AMBUSH_COIL` guard, verified
    live — spear 80 (kills a sub-80 turret outright), bolt 50, rock 15 + 0.6 s stun, boomerang 100.
  - **Bonus fix found on the way:** the stun early-return called `layoutSnake(S)`, which lays the body along
    `S.path` — the **stale ground trail from before it climbed** — so a rock-stunned coiled cobra snapped its
    whole body out of the canopy for the length of the stun. It now holds `layoutSnakeCoil` at the perch
    (verified head y 3.06 / seg y 3.12 over ground 0.48).
  - **Retaliation attribution.** A spit sets `lastHitBy = the cobra` / `lastHitKind = 'snake'` on the victim,
    or **clears both** if the firing cobra died mid-flight. This is load-bearing: without it a stale
    `lastHitBy = player` on a spit-damaged lion made the **pride blame the player** for the cobra's venom via
    the HP-drop watchdog. Verified — a lion carrying a stale player tag came out of a spit tagged to the
    cobra. It does *not* set the rhino's `target`/`targetKind` or the gorilla's `lastDamagedBy`: those are
    bite-level provocations, and a canopy sprayer they cannot reach shouldn't start that fight.
- **🦁 Lion pursuit speeds +~30%.** `sprintMax` **13.5/16.5 → 17.5/19.5** (male/lioness), chase floor
  **10.5 → 13.5**, hunt_prey floor **9.5 → 12.5**, converge **9/11 → 11.5/14**. Measured live: lioness chase
  peaks **18.7–19.1**, male **17.0–17.2**, tired floor **13.5**, converge **14.00 / 11.50** exactly.
  - **The rush now beats a sprinting player (16) outright**, but the burst still drains at 0.26/s to a 13.5
    floor that is *under* sprint speed — so the dynamic changed from "outrun it" to "survive the rush, then
    run". Much tighter, not unescapable.
  - **Left below the wild dogs' `SPEED_CHASE 18`-forever vendetta on purpose**: the pack stays the one thing
    you genuinely cannot outrun. A lioness now out-peaks it (19.5) but only for a few seconds.
  - **`wander`/`rest` deliberately UNCHANGED** — those are the Phase 0 crepuscular ethology curve
    (near-inert through midday). Verified still 4.41/3.67 at activity 0.91. `fight_*`, `scavenge` and
    `flee_hurt` also untouched.
- **Verified live** (headless: rAF doesn't fire and screenshots can't composite, so the sim was driven through
  `animate()` with a patched `clock.getDelta`): **255 s / crossing a full day→night→dawn boundary, 84 spits,
  0 errors, 0 NaN, 0 console errors.** A cobra wounded to 95 HP mid-`NIGHT_HUNT` was coiled in a tree within
  2.5 s and held `AMBUSH_COIL`+turret across dusk, all night and through dawn without rehealing, while its two
  healthy siblings ran the normal `NIGHT_HUNT → AMBUSH_TRAVEL` dawn retreat and were topped back to 700.
- **⚠ Balance / interpretive calls (report, not silently tuned):**
  (a) **A turret is permanent for the cobra's whole life**, not just until it heals — that is the literal
  reading of "it stays in the tree" and the strongest anti-cheese guarantee, but it does mean a wounded cobra
  is a fixture on that patch of map until you shoot it down.
  (b) **Spit damage is flat 8, not `snakeBiteDmg`-scaled** — growth adds +1 to *bites*, and Steven's brief
  said the growth mechanics are dialled, so the spray was left out of it.
  (c) **A treed/walled player can't be spat at**, by the same `playerOffGround` rule as the bite. Slightly odd
  (the cobra is *itself* in a tree), but it preserves the tree-safety contract the whole game leans on.
  (d) **`RETREAT_HP` is an absolute 100, not a fraction of max HP** — Steven named the number.
  (e) Nothing else was rebalanced: cobra bite/`BITE_CD`/growth, other predators' HP and behaviour, bird
  species and the `killObj` disposal invariants were all left alone.


## Cobra sleeps in TREES, and the canopy melee ceiling (2026-07-30b)
Steven: *"Is that the cobra still sleeps in grass? What is this? Grass. Grass. I want it to sleep in trees."*

- **The midday siesta is now habitat-split by variant.** `pickSiestaSpot(S)` gained an early branch: a
  tree-dwelling serpent (`S.v.ambush` — the cobra, and only the cobra) returns
  `{x, z, tree: pickNearestClimbableTree(S)}` and **never looks at a grass clump**; python and worm fall
  through to the unchanged watering-hole grass search. **Reuses the retreat state's own tree finder**, so
  there is exactly one piece of "find me a tree" logic in the serpent module. Grass is off the cobra's
  habitat entirely now — it ambushes from trees, hunts from trees, retreats to a tree at low HP, sleeps in one.
- **Both siesta handlers became tree-aware**, keyed off `siestaSpot.tree` (no new state — `SIESTA_TRAVEL` /
  `SIESTA_SLEEP` still do the work):
  - `SIESTA_TRAVEL` uses a **1.6** arrival radius for a tree (a trunk is wider than a grass patch; matches
    the ambush climb) vs the ground siesta's unchanged 1.4, and on arrival snaps the head to
    `terrainY + perchY`. A bed tree felled en route → re-pick the nearest; none left → plain hostile CRUISE.
  - `SIESTA_SLEEP` coils at the perch instead of `terrainY+0.3`, with a **tighter gauge (1.15 → 0.7)** because
    it's wound round a branch rather than sprawled on flat dirt — same gauge the canopy ambush uses.
  - **Third wake condition added:** its tree being felled (`treeObjects.indexOf(sTree)<0`) joins damage and
    the player inside `SIESTA_WAKE_R` 8. All three route through the existing `snakeUncoil(S)`, which puts it
    on the ground at the trunk — so a disturbed tree sleeper **comes down angry** rather than fighting from
    the branches.
- **⚠ `SNAKE.MELEE_CEIL = 2.0` — a fix beyond the literal ask, and a CORRECTION to the 2026-07-30 report
  above.** That section claimed a turret "cannot be reached in melee". **That was wrong.** Unlike the ~15
  creature-AI scans, `nearestAnimalInFront` has **no `AMBUSH_COIL` guard** for snakes and measures **2-D
  distance only** — so a player at the trunk could hammer a cobra 3.68 m up in the canopy (verified live:
  `MELEE_REACHES_TREED_COBRA: true`). The earlier test that "passed" was invalid — it called `camera.lookAt`
  without moving `camera.position`, so the aim vector was garbage. This was **pre-existing** (it applied to
  the ordinary day ambush long before any of these changes) but it defeated the turret's whole purpose and
  made the new tree siesta nonsense, so it is fixed now with the codebase's own idiom: one altitude skip in
  the snake scan, mirroring `SKYV.MELEE_CEIL` / `EAGLE.MELEE_CEIL` / `SECR.GROUND_CEIL`. A grounded serpent's
  head is at `terrainY+0.5` and a perch at `terrainY+3`+, so 2.0 separates them with room to spare.
  - **Creature-vs-serpent reach needed no change:** those checks use a **3-D** `distanceTo` against
    `FIGHT_R 3.4`, so a lion standing on the deck already can't quite touch a canopy perch. Only the
    player's melee used flat 2-D distance.
  - **Regression checked:** a grounded cobra (height 0.50) is still melee-able; only the canopy is exempt.
    `NIGHT_DESCEND` passes through the ceiling on its way down, which is correct — it becomes reachable as it
    nears the ground.
- **Verified live** (fresh load, service worker + caches cleared, `?v=` bumped):
  - `pickSiestaSpot` → cobra gets the **nearest** climbable tree (`isNearestTree: true`, 23.2 m);
    python + worm still get grass clumps.
  - It travels 23 m and is asleep in the canopy in **3.15 s** (`SIESTA_SPEED 7` ✓), head at **exactly** the
    computed perch (3.76 = `expectedPerch`), and the **whole body is up there** (seg[0] 3.77, tail 3.93) —
    the coil renders in the branches, nothing trailing on the ground.
  - **The natural midday gate fires unaided:** at the centre of the window, cobra ran
    `SIESTA_TRAVEL → SIESTA_SLEEP` at height **2.92 in a tree** while the python ran the same states at
    height **0.50 on grass**, side by side in the same run.
  - Wake paths: player within 5 m → wakes hostile (aggro 6) and drops to ground level; damage → same;
    tree felled mid-sleep → wakes and comes down, **doesn't float**.
  - Interactions: **dusk while tree-sleeping → `NIGHT_HUNT`** (comes down); **dropping below `RETREAT_HP`
    while tree-sleeping → turret in the SAME tree it was sleeping in** (`sameTreeItSleptIn: true`), which is
    the "converts in place" behaviour, since `pickNearestClimbableTree` returns the tree it's already at.
  - Melee: tree sleeper **not** reachable; turret **not** reachable (2.92 m); ground cobra **still** reachable.
  - **Soak 180 s / full day→night→dawn into day 2** with 2 cobras + python + worm: **0 errors, 0 NaN, 0
    console errors**, and a dedicated `GEOMETRY_BUG_FRAMES` counter (tree sleeper on the deck, or grass
    sleeper in the air) held at **0** across **2 583 sleep-frames**. The full cobra lifecycle appeared
    unprompted in one run: `SIESTA_TRAVEL → SIESTA_SLEEP(tree) → CRUISE → AMBUSH_TRAVEL → AMBUSH_COIL →
    NIGHT_DESCEND → NIGHT_HUNT`, plus a second cobra ending as a 1-HP turret that held. `python:WRAP` also
    fired, so the rest of the ecosystem is unaffected.
  - Disposal: **0 scene / 0 geometries / 0 textures** across 3 full tree-sleep→wake cycles; the 1-HP turret
    still refuses to reheal.
- **⚠ Interpretive calls (report, not silently tuned):** (a) gated on the existing **`S.v.ambush`** flag
  rather than a new `treeSleep` one — for now it is exactly "the serpent that lives in trees", and a 4th
  variant that wants one but not the other can split them then. (b) A woken tree sleeper **comes down to the
  ground** instead of striking from the branches — reuses `snakeUncoil` and keeps the sleeping cobra a real
  opportunity rather than an untouchable one. (c) `SIESTA_SLEEP` is **not** added to the ~15
  `state!=='AMBUSH_COIL'` creature-AI unreachability guards: the 3-D `FIGHT_R` distance already protects it,
  and a **secretary bird** — the cobra's dedicated predator — finding it asleep is a fight worth having.


## Serpent civil war — all three variants fight each other (2026-07-30c)
Steven: *"if there's one of all of them — so worm, python, and cobra — I want them to be able to battle each
other. If there's multiple in the game."*

- **Diagnosis first: it was half-wired, and the missing half was the cobra.** `snakeCruiseTarget` already
  scanned rival serpents (added 2026-07-29), so the **python and worm were already fighting each other**.
  But **`snakeNightTarget` — the cobra's night-hunt picker — had no snake scan at all.** It listed lion, dog,
  gorilla, rhino, secretary, eagle and prey, and stopped. So the one time all three are on the ground together
  (after dark) the cobra was the only one not joining in, which is exactly why "they don't fight each other"
  read as true. **That missing scan is the headline fix.**
- **Functions extended** (no new state, no new combat path — everything rides `snakeBite`'s existing
  `kind==='snake'` branch, which already wounds, staggers, tags `lastHitBy`, applies venom and calls
  `snakeCredit`):
  - **`snakeNightTarget`** — gained `scan(snakeMeshes, 'snake', O=>snakeRivalSkip(S,O))`. **The fix.**
  - **`snakeCruiseTarget`** — its hand-rolled skip replaced with the shared `snakeRivalSkip`.
  - **`snakeFoeValid`** — the `k==='snake'` grudge test now uses reachability instead of a blanket
    `state!=='AMBUSH_COIL'`.
  - **`pickSpitTarget`** — same shared skip, so a canopy cobra sprays rivals it can see but not into another canopy.
- **Three small shared predicates** replace four copies of `state==='AMBUSH_COIL'`:
  - `snakeInCanopy(T)` — `AMBUSH_COIL` **or** a tree `SIESTA_SLEEP`. **This closes a hole today's tree-siesta
    commit opened:** the old checks only knew about `AMBUSH_COIL`, so once the cobra started sleeping 3 m up a
    tree, a worm could bite it through thin air. Now it can't.
  - `snakeTreedOutOfReach(S,T)` — `snakeInCanopy(T) && !S.v.tree`. **Only the python climbs** (`v.tree`, the
    same capability behind its tree-grab), so it is the one serpent that can fight in a canopy. Deliberately
    NOT "a treed snake is safe": per Steven, sleepers are not shielded — the cobra is reachable by the animal
    that can actually get to it, and answers with venom or a spray of it.
  - `snakeRivalSkip(S,T)` — `T===S || T.dying || same variant || out of reach`. (The `T===S` guard matters:
    `snakeNightTarget`'s scan has no self-check of its own.)
- **`_climb` reused for the python's trunk rear.** When a python bites a serpent that is `snakeInCanopy`, it
  ramps `_climb` toward 1 (decays at 3.0/s otherwise, and in the no-target branch). `layoutSnake` already
  lifts the head render up to 3.4 and tips it down from that field — **purely visual, `S.pos` stays on the
  deck**, so no new geometry, no new state, no hitbox change. Without it the python's head sat at ankle height
  while it bit something three metres up. Verified it reaches 1.0 in a turret fight and decays to 0 in 4 s.
- **Hierarchy is EMERGENT — no table anywhere.** It falls out of the existing HP/damage/venom numbers.
  Isolated duels (other animals cleared, 40 s, day and night both):
  | Fight | Winner | Kill at | Winner's end state |
  |---|---|---|---|
  | python vs cobra | **python** | 13.6 s day / 14.2 s night | 331 HP → poisoned → ground to **1 HP** by t=34 |
  | cobra vs worm | **cobra** | 11.5 s / 11.3 s | 260 HP, clean (the worm carries no venom) |
  | python vs worm | **python** | 9.2 s | 600 HP, barely scratched |
  **python > cobra > worm**, which is the python-beats-cobra outcome Steven called "more interesting" and it
  needed no tuning at all. Growth fired on every win (14→15 segments, `growth:1`).
- **⚠ THE EMERGENT BEHAVIOUR WORTH FLAGGING: the cobra loses and wins anyway.** One bite lands the venom, and
  `applyCreatureVenom` scales to the victim's own maxHealth — it bleeds *anything* to 1 HP in 60 s. So the
  python wins the exchange on raw dps and then bleeds out to 1 HP regardless. **A python that has just killed
  a cobra is the softest target on the map** — for a worm, a lion, or the player. Against a low-HP **turret**
  it is even starker: the turret dies in ~2 python bites but gets one spit away first, and that single spit
  still drags the python from 1000 to ~600 and falling. A dying cobra is never a free kill.
- **Other emergent notes:**
  - A cobra wounded below `RETREAT_HP` *during* a serpent fight breaks off, climbs, and dies as a turret — the
    turret mechanic composes with the civil war without a special case (observed unprompted in a duel).
  - **No runaway chase.** A speed-14 cobra can never catch a speed-32 worm, but instrumenting a 60 s isolated
    pair showed only **19 % lock time** in both `NIGHT_HUNT` *and* `CRUISE`, because the targeting is **mutual**
    — the worm closes the distance itself instead of fleeing — and the venom finishes it even after it breaks
    away (max gap 105 m, worm still died). `NIGHT_GIVEUP` never had to carry it.
  - A **worm** facing a treed cobra wanders off to find a reachable target (tree distance 7 → 80 m) rather
    than milling at the trunk. **No stalemate.**
- **Verified:** targeting matrix correct in all six directions, grounded and treed; `CANOPY_VIOLATIONS` (a
  non-climber locked onto a canopy serpent) held at **0** across a 190 s full-ecosystem soak with 4–5 serpents;
  live snake-vs-snake lock counts in that soak `cobra→worm`, `worm→cobra`, `python→cobra`, `cobra→python` all
  non-zero; growth observed on all three variants (worm reached 23 segments); **0 errors, 0 NaN, 0 console
  errors**; **0 scene / 0 geometries / 0 textures** leaked across 3 full kill-collapse-respawn cycles;
  `_climb` never stuck on; `resetGame` clean.
- **⚠ Interpretive calls (report, not silently tuned):** (a) **same-species serpents still don't fight** —
  pre-existing, and Steven's ask was explicitly worm-vs-python-vs-cobra; (b) **no numbers were touched** —
  the hierarchy is whatever the existing HP/damage produce, so re-tuning any serpent's HP or bite silently
  re-orders it; (c) the **python's canopy reach** uses the existing 2-D `MELEE_R` bite check with `_climb` as
  the visual justification, rather than a new climb state — cheapest honest way to let the one climber climb.


## Cobra night territory — a quarter of the map each (2026-07-30e)
Steven: *"At night I want it to come out of the tree and actually attack things. Also I wanted it to patrol
its territory — it has one fourth of the map as a territory, and anything that comes into there at nighttime,
it hunts down. Does it attack predators at night? Make sure it doesn't just hunt prey. Everything."*

**Two of the four asks were already shipped — verified live before touching anything, not assumed:**
- **"Comes out of the tree at night" — ALREADY WORKED.** Traced it: dusk → `NIGHT_DESCEND` (unwinds down the
  trunk, 1.05 s) → `NIGHT_HUNT` on the ground at height 0.5. Built 2026-07-28. Nothing to do.
- **"Attacks everything, not just prey" — ALREADY WORKED, one gap.** `snakeNightTarget` already scanned lion,
  dog, gorilla, rhino, secretary, eagle, prey, rival serpents *and* the player. The only creature missing was
  the **sky vulture**, now added (`state!=='LANDED'` skipped — an airborne one is nothing to strike at), with
  its `snakeFoeValid` branch and a `SNAKE_VICTIM_NOUN` entry so a kill reads properly. Bite verified: 20 dmg
  + venom on a landed vulture. Night-scan only — the python/worm cruise list was left alone as out of scope.

**The real work: territory (new) and territorial patrol (rewritten).**
- **Storage & assignment.** The world splits into four quadrants about the origin (`quadrantOf(x,z)` → `{id,
  xMin, xMax, zMin, zMax}`, each `MAPR`×`MAPR` = 244×244). `claimNightTerritory(S)` runs **once, in
  `makeSnake`, gated on `v.night`** (cobra only; python/worm get `null`) and never runs again.
  - **⚠ Stored as `S.territory` — on the INSTANCE, deliberately NOT `S.v.territory` as the brief sketched.**
    `S.v` is the shared `SNAKE_VARIANTS.cobra` object: a territory written there would be ONE territory shared
    by every cobra, silently overwritten by each new spawn. Asserted in test —
    `SNAKE_VARIANTS.cobra.territory === undefined` after spawning five cobras and after a `resetGame`.
  - **Claims its spawn quadrant, else the nearest FREE one.** Steven offered "contest it" or "claim adjacent"
    and left the call to me: **adjacent**, because they *cannot* contest it — `snakeRivalSkip` excludes
    same-variant serpents, so two cobras sharing a quadrant would just double-patrol it while a quarter of the
    map went unwatched. Verified: four cobras all spawned in **NE** claimed **NE, SE, NW, SW** — full coverage.
    With `SNAKE.MAX 6` against four quadrants a 5th/6th has to share, and does (verified).
- **Patrol.** `pickNightPatrolSpot` rewritten: a `NIGHT_ROAM_R` step in a random direction, **clamped back
  inside the territory bounds**. The clamp does double duty — it keeps the patrol in the quadrant *and*, when a
  chase has left the cobra outside, every waypoint points back in, so **walking home needed no go-home state**.
  Roughly **one leg in four is a LONG one** drawn from anywhere in the quarter: pure local stepping made it
  camp whichever corner it descended into (measured **77×70 m** of a 244×244 quadrant over a whole night);
  with long legs it sweeps **165×186 m / 33 of 81 grid cells**, still **0 frames outside**.
- **Detection, split deliberately between player and creatures:**
  - **PLAYER — full-quadrant, stealth-proof.** Anywhere in its territory after dark you are targeted at **any**
    range and **crouching does not hide you**. Verified targeted at 10 m standing, 10 m crouched, 61 m
    crouched, and **186 m crouched in the far corner**; **not** targeted at 332 m outside it. This is the
    headline of the rule and the strategic teeth — a quarter of the map is simply dangerous at night.
    **`playerOffGround` is untouched, so a tree/wall/grapple still saves you** (verified) — the game's
    "get above it" answer to serpents survives intact.
  - **CREATURES — generous but finite (`NIGHT_TERR_MUL 3` → 26 m becomes 78 m).** Full-quadrant creature
    awareness was considered and **rejected**: prey herds are everywhere, so the cobra would be in permanent
    pursuit of the nearest one and never patrol — the territory would read as a heat-seeking missile rather
    than an owner walking its ground.
- **`NIGHT_REANCHOR` deleted.** That rule moved the cobra's hunting ground to wherever a long chase dragged it;
  a territory that follows you around is not a territory. Replaced by a **territorial leash**: chase more than
  `NIGHT_TERR_MARGIN` 30 m past its own border and it drops the target (+`NIGHT_SKIP`), then walks home.
- **⚠ Bug caught in the soak and fixed — leash alone was not enough.** With only the leash, the cobra broke off
  the current chase and then *immediately acquired whatever else was within 26 m out there*, broke off again,
  acquired again — ratcheting itself across the map one target at a time. Measured **383 frames (19 s) beyond
  its own border**, ending up in the wrong quadrant entirely. Fix: `snakeNightTarget` **returns null outright
  while the cobra is off its own ground** — it suppresses ACQUISITION, not retaliation (a grudge is handled by
  the `aggroTimer`/`snakeFoeValid` branch above the call and re-arms on every fresh hit, so it still bites
  anything that jumps it on the way home). After the fix: **0 frames beyond the margin over 280 s**, max
  excursion 10 m (well inside the 30 m chase allowance).

**Full 24-hour cycle, one continuous trace (280 s, 2 cobras + python + worm):**
| t | phase | state | head height |
|---|---|---|---|
| 0 s | day | `CRUISE` | 0.5 (ground) |
| 8 s | day | `AMBUSH_TRAVEL` | 0.5 |
| 13 s | day | `AMBUSH_COIL` | **3.2 (canopy)** |
| 105 s | **dusk** | `NIGHT_DESCEND` | 3.1 → descending |
| 106 s | night | `NIGHT_HUNT` | **0.5 (ground, patrolling)** |
| 225 s | **dawn, day 2** | `AMBUSH_TRAVEL` | 0.5 |
| 231 s | day 2 | `AMBUSH_COIL` | **2.9 (canopy)** |
Plus **1201 frames of `SIESTA_SLEEP`** from the second cobra — the midday tree siesta, still routing to the
nearest tree. **0 errors, 0 NaN, 0 console errors**; **0 scene / 0 geometries / 0 textures** leaked across
3 spawn→claim→night-hunt→death-collapse cycles; `resetGame` leaves the shared variant object clean.

**⚠ Emergent behaviour worth flagging:**
- **Two cobras in different quarters never meet.** Minimum separation over 280 s was **202 m**; **0 frames**
  within 20 m of each other. Exactly the outcome Steven guessed at. Combined with same-species non-aggression
  this means multiple cobras now *partition* the map rather than clustering — the map has corners with owners.
- **The border stand-off is the best thing here.** Instrumented a cobra chasing an (immortal) python west out
  of its quadrant: it followed to the 30 m margin, **broke off at 4.5 s**, was back inside its own ground by
  **5.6 s**, then **parked at x=2 — right on its own border — and watched the python flee to x=-191 without
  following.** Textbook territorial behaviour, and it fell out of the leash + patrol-clamp rather than being
  scripted.
- **A cobra coiled in a day ambush skips the midday siesta** (the siesta gate requires `CRUISE`). Pre-existing,
  and harmless — it is already up a tree, which is where the siesta would have put it. So "day → siesta → dusk"
  is really "day in a tree (ambush *or* siesta) → dusk".
- **Territory does not constrain the DAY tree.** Per the brief the ambush/siesta/turret tree pickers are
  untouched, so a cobra can spend its day in a neighbour's quarter and walk home at dusk. Looks natural; noted
  in case it should be bounded later.
- **⚠ Balance (report, not silently tuned):** the player-side rule is a real difficulty increase — a quarter of
  the map now hunts you on sight at night with no stealth counter. Mitigations already present and unchanged:
  trees/walls, the 30 m break-off, the `NIGHT_GIVEUP` rule, and cobra speed 14 vs your sprint 16. Nothing else
  was rebalanced.


## Cobra colour morphs — five, rolled at spawn (2026-07-30f)
Steven: *"I want that to be like multiple different colours… acid green, the current dark blue, red, dark
purple, and then like 5% chance it's kinda rare, it's like a gold."*

- **`COBRA_COLORS` + `pickCobraColor()`** — the table and a weighted roll, kept as a **named helper rather
  than inlined at the spawn site** (per the brief) so the python and worm can be given morph tables the same
  way later; a new variant needs nothing but its own weighted array. Weights **23.75 × 4 + 5 = exactly 100**.
- **Which spawn function was touched: `makeSnake`** — the single constructor every serpent goes through
  (`spawnSnake` → `makeSnake`; `rollSnakeSpawns` is just the per-variant coin flip above it). The roll happens
  once there, before the materials are built, and the result is stored as **`S.colour` on the instance** —
  same discipline as `S.territory`, never on the shared `S.v`.
- **A morph drives the whole animal, not one material**, because the cobra's colour lives in four places:
  - `cobraScaleTex(pal)` — **parameterised** (was hard-coded): `texBase`/`texLit`/`texMid`/`rim` are the mass
    of the body. Tinting alone would not have worked — the original texture is near-black, so multiplying it
    by a colour just gives black; the texture itself had to become palette-driven.
  - `matB.color` ← `tint` — the second body tone, which is what makes the segment banding read.
  - `matBlot.color` ← `belly` — belly + hood membrane, the single biggest visual signature.
  - `spotM.color` ← `spot` — the hood's spectacle marking. `emis`/`spec` keep a dark animal from dissolving
    into the night.
- **Minimap is per-morph.** `S.mm`/`S.mmHot` shadow the variant's shared pair and the minimap now reads
  `S.mm || S.v.mm`, so a gold cobra is a gold dot and an acid one is green — python/worm fall back unchanged.
- **Venom spit MATCHED, no refactor needed.** The blob material was already built **per blob**, so it just
  reads `S.colour.venom`. Verified all five: acid `#b6ff3c`, black `#9be34a`, crimson `#ff5a68`, violet
  `#c48cff`, gold `#ffe066`. **The `black` morph keeps the original GREEN venom on purpose** — it is "the
  current cobra, unchanged", and a dark-blue blob off a near-black snake would be nearly invisible, which
  matters for a projectile you are meant to dodge.
- **The rare morph announces itself** — `✨ A GOLD cobra has moved onto the savannah — rare` in the killfeed.
  At 5% it should feel like an event; the other four arrive on the ordinary "serpents move in" line.

**Visual iteration — this is what the offline projector is for.** `dossiers/render_cobra.py` was made
palette-aware (`PALETTES` + `set_palette()`; the pose sheet still renders from `midnight`) and now emits a
**second sheet, `dossiers/cobra_morphs.png`** — all five morphs × (flared hood, reared body), same mesh, same
light, gamma-matched. Two problems were visible on the first pass and fixed by looking at it:
- **acid** and **violet** had washed-out hood spectacle markings (the spot was too close to their own belly
  value). Fixed: the spectacle now **contrasts with its own hood** rather than being a fixed hue — bright
  bellies (acid) get a **dark** marking, dark/cool bellies (violet) get a **warm ochre**, which is the same
  complementary trick that makes the original blue morph's marking the clearest of the five.
- The offline `SKIN_A`/`SKIN_B` are **derived** (`texMid × ½`, then × the tint) the same way the original
  hand-tuned constants were, so the sheet keeps matching the engine as the palette changes.

**Verified live:**
- **RNG sanity (what Steven asked for, plus tighter stats):** 20 000 pure rolls → **gold 4.91 %**, others
  23.30 / 23.66 / 23.78 / 24.36 %. 100 pure rolls → gold 3. **100 real `makeSnake` spawns → gold 7** (binomial
  sd at n=100 is 2.2, so 3–7 is ordinary noise, and it is neither 0 nor 50).
- **Persistence:** a forced gold cobra grown **14 → 20 segments** through the real `addSnakeSegment` path kept
  its exact belly/tint/minimap hex through a hit-flash, a tree ambush, a night hunt, a **turret conversion**, a
  `healAllAnimals` and dawn — `colourNeverChanged: true`, `grewWhileGold: true`.
- All five morphs **live simultaneously** for a 150 s soak: **0 errors, 0 NaN, 0 console errors**, four distinct
  venom-blob colours caught in flight, every survivor still carrying its morph, and they grew normally
  (`midnight` reached 22 segments).
- **Disposal unchanged:** **0 scene / 0 geometries / 0 textures** across 3 spawn → grow → death-collapse
  cycles. The scale texture is still built per snake (never cached at module scope) precisely because
  `disposeObject3D` frees every texture hanging off a material — now doubly true, since two cobras genuinely
  have different textures.
- **⚠ Interpretive calls (report, not silently tuned):** (a) equal 23.75 % split for the four commons, as the
  brief defaulted; (b) `black`'s venom stays green (readability + "unchanged"); (c) the **amber eyes and ivory
  fangs are shared by all five** — they are the cobra's signature and the emissive eye-glow is what reads at
  night; only gold has slightly low eye contrast in daylight, judged not worth a per-morph eye colour;
  (d) no gameplay numbers touched — a gold cobra is exactly as dangerous as a black one, the morph is purely
  cosmetic plus identification.


## Gold cobra = 1500 HP boss (2026-07-30g)
Steven: *"keep everything else the same, but just the gold cobra, make it have one thousand five hundred health."*

- **Where the HP init reads from — morph-driven, not inlined.** `COBRA_COLORS`' gold entry gained an optional
  **`hp:1500`**; `makeSnake` computes `const hp0 = (pal && pal.hp != null) ? pal.hp : v.HEALTH;` and the S
  literal is now `health:hp0, maxHealth:hp0, _prevHealth:hp0`. There is **no `health:v.HEALTH` left in the
  file** (grep-verified).
  - **Falls back to `v.HEALTH`, not to a literal 700** as the brief sketched. Same reason the territory lives
    on the instance: `SNAKE_VARIANTS.cobra.HEALTH` stays the single source of truth, so retuning the ordinary
    cobra later still moves the other four morphs together instead of silently diverging from a hard-coded 700.
- **Verified per morph** (forced spawn of each): gold **1500/1500**, acid / black / crimson / violet all
  **700/700**, python **1000** and worm **500** untouched. Bite 20, `BITE_CD` 0.5, speed 14 and
  `RETREAT_HP` 100 identical across all five — only the pool differs.
  - Kill counts for gold: **19 spears** (`SPEAR_DMG` 80) / 30 bolts / 15 boomerangs / ~100 rocks, and it must
    shed **1400 HP** before the turret threshold. Reheal restores the full 1500; the turret still converts at
    95 HP (verified → `AMBUSH_COIL` + `turret`, height 4.28).
  - **Gold is now the tankiest animal in the game**, above the sand python's 1000 (was: python). Flagged, not
    tuned — it is the boss framing Steven asked for.
- **⚠ THE GROWTH-CAP ANSWER (Steven asked directly): growth never touches HP for ANY serpent.**
  `addSnakeSegment` contains no reference to `health`/`maxHealth` — growth adds a segment and `snakeBiteDmg`
  adds +1 per growth to the BITE. Drove a gold cobra to the `SEG_MAX 50` cap: segments **14 → 50**, bite
  **20 → 56**, `maxHealth` **1500 → 1500** (`HP_NEVER_GREW: true`), with 54 further adds rejected by the cap.
  So it ends up the **longest and hardest-hitting** serpent, exactly like any other morph's growth curve, but
  its health advantage is a **flat +800 that never compounds** — which is a slightly different thing from the
  brief's "would end up biggest and toughest", and worth knowing before tuning further.
- **⚠ Real hole found and closed — a stray venom blob trivialised the boss.** `pickSpitTarget` already refuses
  to AIM at the same variant, but `updateVenomSpits`' creature hit-test did **not** exclude it, so a blob
  already in flight from an ordinary cobra could clip a gold one — and `applyCreatureVenom` scales to the
  victim's own maxHealth, flooring **1500 HP to 1 in 60 s** (measured `venomDps` 24.98). One stray blob would
  have reduced the new boss to a husk. The two paths disagreeing was an inconsistency, not a design choice, so
  the in-flight test now skips `O.v.key===p.srcKey`. **`srcKey` is carried on the blob separately from `src`**
  so the rule still holds after the shooter dies mid-flight.
  - Verified: cobra→cobra blob **passes through** (1500 → 1500, unpoisoned); cobra→**python** still lands
    (1000 → 992 + venom); **player** still hit (100 → 92 + venom).
  - ⚠ Test-artifact note for future sessions: a first "player not hit" reading was **my test's fault**, not a
    regression — a python left standing on the player's exact coordinates absorbed the blob one frame earlier,
    because the creature radius is `(hitR||1.2) + SPIT_HIT_R*0.6` while the player's is a flat `SPIT_HIT_R`
    1.5. Re-run in isolation, the player is hit normally.
- **Verified live:** 180 s ecosystem soak with a gold + a black cobra + python + worm — **0 errors, 0 NaN,
  0 console errors**; the gold one held **1500/1500**, grew **14 → 20 segments**, `maxHealth` never moved, and
  ran the normal `CRUISE → NIGHT_HUNT` cycle. **0 scene / 0 geometries / 0 textures** leaked across 3
  gold-specific spawn → grow → death-collapse cycles. The floating HP bar is the unchanged 256×44 canvas and
  `"1500/1500"` is the same 9 characters the python's `"1000/1000"` has always rendered.


## Cobras go BLACK FROM ABOVE — colour moves to belly + hood only (2026-07-30h)
Steven: *"I want them to be black on top still, but have just the colour on the belly and the hoods. And then
the colour can be on their back, but just make it really dark so it's almost black."*

The first morph cut let the hue saturate the **whole animal** — an acid cobra was a bright green snake, a gold
one was brass from nose to tail. Reversed: every morph is now a **near-black snake with a coloured underside**.

- **`midnight` is the reference, not a formula.** It already looked exactly right — near-black with the hue
  carried as a channel *ratio* rather than saturation — and Steven had approved it. So instead of inventing a
  weighting, the other four were **derived from midnight's value ladder** (dominant channel: texBase 2 /
  texMid 19 / texLit 40 / rim 102 / emis 9 / spec 40) re-pointed at each hue. That makes "black is unchanged"
  **structural** rather than something to be careful about — and the palette carries a ⚠ comment telling a
  future session not to retune midnight to match a formula, because the formula was fitted to *it*.
- **New palette:**

| morph | texBase | texMid | texLit | rim | tint | emis | spec | body luma (was → now) |
|---|---|---|---|---|---|---|---|---|
| **acid-green** | `#010200` | `#081303` | `#112806` | `43,102,15` | `0x97a88f` | `0x040901` | `0x112806` | 13.5% → **3.9%** |
| **black** *(reference — untouched)* | `#010102` | `#0a0b13` | `#141728` | `38,52,102` | `0x8790a8` | `0x020309` | `0x121728` | 5.0% → **5.0%** |
| **crimson** | `#020001` | `#130505` | `#280a0b` | `102,26,29` | `0xa88f90` | `0x090203` | `0x280a0b` | 7.0% → **3.8%** |
| **dark-violet** | `#010102` | `#0e0813` | `#1d1128` | `73,43,102` | `0x9c8fa8` | `0x060409` | `0x1d1128` | 10.6% → **5.3%** |
| **GOLD** | `#020200` | `#130f04` | `#281f09` | `102,80,22` | `0xa8a18f` | `0x090702` | `0x281f09` | 18.6% → **4.9%** |

Unchanged at full saturation on every row: `belly`, `spot`, `mm`/`mmHot`, `venom` (and gold's `hp:1500`).

- **What moved vs what didn't.** Dark now, hue as ratio only: `texBase`, `texMid`, `texLit`, `rim`, `tint`,
  `emis`, `spec`. Untouched and fully saturated: **`belly` (matBlot), `spot`, `mm`/`mmHot`, `venom`** — the
  `git diff` shows `belly:` and `spot:` byte-identical on both sides of every changed line, and `mm:`/`venom:`
  never appear in the diff at all. Identity now reads from **underneath, off the flared hood, on the radar and
  in the spit** — never from above.
- **Black is provably unchanged.** No `midnight` palette line appears in the diff. Measured independently: its
  drawn-texture luminance is **4.9550% before and 4.9550% after — bit-identical**.
- **Measured, not eyeballed** (see the ⚠ below for why this took a detour): replicating `cobraScaleTex()` in
  PIL and measuring the actual drawn 64² gives every morph **3.8–5.3%** raw luminance, bracketing midnight's
  **5.0%**. Gold was the worst offender at **18.6%** (nearly 4× the reference) and is now at parity.
- **Render updated:** `dossiers/render_cobra.py`'s morph sheet went from 2 rows to **3 — TOP-DOWN (dorsal),
  SIDE, HOOD FLARED (front)** — because "black from above" is the claim and the old sheet had no top view to
  check it against. Confirmed on the sheet: the dorsal row is five dark snakes, the hood row is five
  full-saturation hoods.
- **⚠ ENVIRONMENT GOTCHA worth remembering: 2-D canvas readback is BLOCKED in the Browser pane.**
  `getImageData` returns an all-zero buffer *including alpha*, even for a canvas just `fillRect`'d — a
  `#ff8000` control read back `0,0,0,0`. So an in-page measurement of any procedural CanvasTexture
  (`cobraScaleTex`, `giraffeTex`, `elephantTex`, the HP bars) is impossible, and it fails **silently, looking
  exactly like "the texture is black"**. First attempt at verifying this change reported all five morphs at 0%
  luminance, which was the probe being broken, not a finding. Recorded in the verify memory; run the `#ff8000`
  control first whenever a canvas-pixel number looks impossible.
- **Verified live:** 150 s soak with all five morphs + python + worm — **0 errors, 0 NaN, 0 console errors**;
  every survivor kept its morph and minimap colour; **all five venom colours** observed in flight
  (`#b6ff3c`/`#9be34a`/`#ff5a68`/`#c48cff`/`#ffe066`); gold still **1500** HP. Material wiring re-confirmed
  per morph (belly, matB tint, matA specular).
- **⚠ Interpretive call:** gold used to be the one genuinely *bright* morph and is now dark-on-top like the
  rest, per the instruction. Its "rare" read now comes entirely from the **gilt hood + belly**, the killfeed
  announcement, the gold minimap dot and the 1500 HP — not from being shiny at distance. Flagged in case
  Steven wants the boss to stay visually loud from afar.


## Wall fixes: unequip no longer demolishes paid-for walls; cap 10 → 50 (2026-07-30i)
Steven: *"When I placed down a stone or wood wall, then when I unequipped the ability, it deletes it, which is
really annoying because then I wasted like a hundred wood. Also, the wall limit is like ten. I want it to be fifty."*

### Bug 1 — the handler, and why the suspected cause was not the cause
- **Which handler:** `reconcileKitWalls()`, called from **`equipToSlot()`** and **`unequipItem()`**. It called
  `clearKitWalls(ability)`, which ran every matching `kitWalls` entry through `removeWallAt` — disposing the
  mesh and dropping it from `wallMeshes`/`wallAABBs`.
- **⚠ There was NO preview/placed split to fix, and no stray blanket `forEach`.** The brief suspected the
  unequip path was disposing placed walls when it meant to dispose a preview/ghost wall. **There is no preview
  or ghost wall anywhere in this game** (grepped: zero `preview`/`ghost` wall code) — `placeKitWall` builds the
  real mesh and deducts materials in the same call, instantly. So nothing needed separating.
- **The actual cause was a deliberate design decision from 2026-07-16c**, documented in this very file: placed
  walls were torn down on unequip "mirroring the Fire Torch". That was the wrong analogy. The Fire Torch FX is
  an **active effect of holding the tool**, so extinguishing it on unequip is correct; a placed wall is a
  **product the player already paid wood or rock for**. Unequipping refunded nothing and silently demolished
  the lot.
- **Fix: `clearKitWalls()` and `reconcileKitWalls()` are DELETED** (both call sites removed; a ⚠ tombstone
  comment sits where they were, explaining the Fire-Torch mis-analogy so nobody reintroduces it). No new
  lifecycle metadata was needed — placed walls were already tracked correctly.
- **The three legitimate removal paths were verified still working, all still routing through
  `removeWallAt`:** player fells it (`damageWall` → 999 dmg on a 120-HP wood wall → gone), enemy smash
  (`removeWallAt` direct, as `wallBlockingPath` does), and `resetGame`'s world teardown (walls 50 → 0,
  geometry back to baseline). `kitWalls` stayed in lockstep with `wallMeshes` in every case via
  `updateAbilities`' prune loop, **which runs whether or not the tool is equipped** — that is what keeps the
  cap honest now that unequip doesn't clear anything.
- `clearKitFX()` (resetGame / triggerGameOver) is now the ONLY place placed walls are dropped wholesale, and
  both callers are run boundaries. Incidentally observed: walls survive a game-over intact and are freed by
  the following `resetGame`.

### Bug 2 — `KIT_WALL_MAX` 10 → 50, with the perf curve measured
| walls | logic frame time (median of 3×500) | Δ vs 0 | % of the 16.67 ms 60fps budget |
|---|---|---|---|
| 0 | 2.524 ms | — | 15.1% |
| 25 | 3.250 ms | +0.726 ms | 19.5% |
| 50 | **3.974 ms** | **+1.450 ms** | **23.8%** |

- **Exactly linear — 29 µs per wall at both 25 and 50** (Δ50/Δ25 = 2.00), which is the expected
  O(animals × walls) shape of `collideWalls` / `collideStoneWalls` / `segHitsWall` running plain AABBs.
- **Verdict: ship 50.** In relative terms 50 walls add **+57%** to logic time, which sounds alarming, but the
  absolute is 1.45 ms and the total is under a quarter of the frame budget. At 29 µs/wall you would need
  **~440 walls** to exhaust the remaining headroom. A wall is one `BoxGeometry` + one Lambert material, so
  VRAM and draw calls are negligible.
- Measurement is **logic-only** (render stubbed to fit the tool's 30 s ceiling). The animal population
  actually *fell* across the three runs (80 → 76 → 66), so the wall cost is if anything slightly understated.

### Pinned tests — all pass
- `test_placed_wall_survives_unequip_and_re_equip` — 3 walls → unequip → **still 3** (`kitWalls`,
  `wallMeshes`, `wallAABBs` all 3, ability now false) → re-equip → still 3 → **three full cycles** → still 3,
  wood unchanged.
- `test_preview_wall_disappears_on_unequip` — **cannot exist as written**: there is no preview wall. Pinned the
  meaningful equivalent instead: unequip disposes **nothing** (0 geometries, 0 textures, 0 scene children).
- `test_wall_limit_is_50_and_51st_placement_rejected` — cap 50, all 50 placed, 51st returns `false`, killfeed
  reads `🪵 Wall limit (50) reached — hammer some down to free space`, **wood NOT charged** for the rejected
  placement, still exactly 50.
- **Leak:** 0 geometries / 0 textures / 0 scene children across 3 × (place 50 → wipe 50) cycles.
- **0 console errors.**

### ⚠ Benchmark methodology trap, recorded for next time
The first two attempts at the perf curve produced garbage — frame times of **0.001 ms** and wall counts that
did not match what was placed. Cause: **the player STARVED mid-benchmark** (`gameState` went to `'over'`,
`player.hunger` 0), after which `animate()` early-returns and every subsequent sample measures nothing. Pinning
`player.health` alone is **not enough** to keep a long synthetic soak alive — pin `player.hunger` too (and
re-assert `gameState==='playing'`) every frame, and assert `ok: gameState==='playing'` in the result so a dead
run is obvious instead of silently reporting a fast one.


## Walls are WALKABLE ON TOP — clip-inside + bump-cascade fixed (2026-07-30j)
Steven: *"They have this glitch where I can jump inside of them… last time you fixed it you made me bump off
the edge, but if I place two walls near each other it'd bump me off one wall into the other wall. So just make
it a solid surface on top, so I can walk on it if I want."*

### Root cause of BOTH bugs — one block of code in `updatePlayer`
The old player wall handling was a radial sphere-AABB push (`dx/dist` toward the nearest point on the box),
run AFTER the ground snap:
- **"Jump inside a wall":** the jump apex is **3.27** units and a wall top needs only **2.10** of rise, so the
  player can already jump above a wall. Once the feet cleared `max.y - 0.15` the push was skipped, the player
  descended INTO the footprint — and for a point *inside* an AABB `clamp()` returns the point itself, so
  `dist === 0` and the `dist > 0.001` guard made the push a **no-op**. (The animal version, `collideWalls`, has
  an `else { pos.x += radius; }` dead-centre ejection; the player copy never did.) You were stuck inside.
- **The bump cascade:** the nearest-point vector near a wall's END-CAP points **diagonally**, so it shoved the
  player into the neighbouring wall, which shoved back. Pinball.

### The fix
- **`wallSupportY(x,z,feetY,prevFeetY,vy)`** — the highest wall top that can hold the player at (x,z). The
  ground snap now uses `max(terrainY, wallTop)`, and that single change gives landing, standing, walking a
  chain, walking off the end, and a wall being smashed out from under you **all for free** from the existing
  gravity path. No special cases.
  - A top only counts as a floor if it is at/below the feet (+ step) — otherwise standing *beside* a 2.2-high
    wall would teleport you on top of it.
  - **Swept guard:** gravity moves the feet up to ~1.1 units per clamped frame, so a fast fall could cross a
    wall top entirely between frames. If the feet were above a top last frame and are below it now while
    descending, that top still catches them. (Same idea as the wild-dog / snake anti-tunnel checks.)
- **`pushPlayerOutOfWalls()`** — replaces the radial push with an **axis-aligned minimum-translation** push,
  and runs **before** the ground snap. Resolves the inside-the-box case (both overlaps positive → eject the
  shallow way), and never pushes diagonally, so there is nothing to cascade. Skipped entirely for a wall whose
  top is within the step-up of the feet — up there it is a floor, which is what makes walking across adjacent
  walls produce **exactly zero** horizontal pushes.
- **Old code removed cleanly** — the `wallAABBs.forEach` radial block is gone; grep for
  `above the wall — vault over` / `0.5-dist` returns nothing. A comment marks where it was and why it died.
- Knockback can still slide the player sideways after the snap, so `pushPlayerOutOfWalls()` is called once more
  after it. Deliberately **not** re-running the ground snap there — doing so let a shove lift the player onto a
  wall top they never jumped to.

### ⚠ Two further problems found while testing, both real, both fixed
1. **`WALL_STEP_UP = 0.7`, not a tight tolerance — because THE GROUND IS SLOPED.** Walls sit on terrain, so a
   chain placed 2.5 apart can have wildly different tops: measured **1.61 / 1.68 / 1.79 / 2.01 / 2.05 / 2.55 /
   2.59 / 2.81 / 2.92 / 2.99** across ten adjacent walls — a **1.38 spread**. With the first cut's 0.12
   tolerance the player walked one wall and **jammed against the next wall's face forever**. 0.7 crosses those
   steps while staying far below a wall's own 2.2 height, so **a wall is still an impassable barrier from flat
   ground** — that invariant is what keeps walls worth building.
2. **`onGround` was flip-flopping every single frame at rest.** At rest the feet sit *exactly* at
   `floorY + 0.1`, and the test was a strict `<`, so it alternated true/false. Gravity **and the jump** both
   gate on `onGround`, so roughly half of all jump presses were being swallowed — pre-existing, on terrain as
   well as walls. Now `<=` plus 1e-4. Standing still measures **60/60 grounded frames** (was ~30/60).

### Pinned tests — all pass
| pin | result |
|---|---|
| `test_player_lands_on_wall_top_and_stays` | lands at exactly `top+0.1`, **60/60 grounded frames** over 3 s, never inside |
| `test_player_walks_along_adjacent_walls_without_bump_cascade` | crossed 5 walls with tops **1.6→3.0**; **max lateral jerk 0.0000**, 0 stalled frames, 0 clips |
| `test_player_falls_normally_off_wall_edge` | left top frame 1, landed frame 10, feet match terrain, **knockback impulse 0** |
| `test_wall_destruction_while_player_standing_drops_player_with_gravity` | velY 0 → −1.1 → −2.2 → −3.3 (clean g), lands exactly on terrain |

### Verifications
- **Player cannot clip inside a wall from any angle** — 24 approach angles × 7 heights (below / mid / at-top /
  above) sprinting straight in = **168 cases, 0 frames inside a wall**.
- **Predators still cannot climb** — lioness in permanent `chase` against a 5-wall barrier for 20 s: pressed to
  z = −2.12, **never crossed**, and **max height above terrain 0.000**. Animal wall code untouched.
- **60 s soak, 10-wall chain, 24 patrol turns:** 0 frames inside, 0 fall-throughs, 0 frames off-chain, **max
  lateral jerk 0.0000**, 0 geometry / texture / scene delta. Final feet sat exactly `top + 0.1`.
- **Gap jump:** 1.5-wide gap between walls — cleared it, landed on the far (taller, 2.95) wall, no clipping.
- **Diagonal (45°) chain:** walkable, 0 frames inside, 0 sinking. Note collision uses the AABB of the rotated
  box, so a diagonal wall's walkable top is slightly generous — same approximation every existing animal
  collision already uses.
- 0 console errors.
- **Standing on a wall still counts as `playerOffGround()`** (unchanged, pre-existing), so a fortification
  genuinely protects you from ground predators — the feature and the safety model agree.


## Palisade Gate ability + cobra chase speed = wild dog (2026-07-30k)
Steven: *"Can you build a wall with, like, a gate in it or a door? And if I go up to it and hit E, it opens,
and I need to turn around and hit E to close it… make it a separate ability. And make it two wood just like a
normal one."* · *"The cobra is so slow it can't catch anything. Can you make it faster than prey? …as fast as
like a wild dog."*

### Gate — the whole trick is registration, not new physics
**A CLOSED gate puts its mesh in `wallMeshes`/`wallAABBs`; an OPEN one takes it out.** That single idea is the
entire implementation of "shut acts like a wall, open lets things through", and it means every wall system
works on gates for free, with no new collision code: player push-out + the walkable top
(`pushPlayerOutOfWalls`/`wallSupportY`), animal blocking (`collideWalls`/`collideStoneWalls`), bite and
line-of-sight checks (`segHitsWall`), and smashing (`wallBlockingPath`/`damageWall`/`removeWallAt`). An open
gate is simply invisible to all of them — which is precisely the "predators pour through one you left open"
behaviour that was asked for.
- **Mesh:** a `Group` at the wall-equivalent centre carrying the placement yaw, with a **`swing` child at the
  hinge line** so `swing.rotation.y` swings the panel clear. At angle 0 the panel spans the same local
  x [−1.25, +1.25] and the same height as a wall, so **a closed gate's AABB is 2.5 wide — measured identical to
  a wall** — and therefore its walkable top matches. The fixed hinge post lives on the parent so it does not
  swing, and every swinging part is inset so nothing pokes past the footprint and inflates the AABB.
  5 meshes: post, panel, two proud cross-braces, iron handle.
- **`[E]`** → `toggleNearestGate()`, wired ahead of the existing carcass/collect handler (you walked up to it
  deliberately). Reach 3.6, facing dot > 0.15 — generous, and works **from either side**, so you walk through,
  turn round, and the same key shuts it behind you. **PLAYER ONLY**: nothing in any animal module calls it.
- **Opening unregisters instantly** (walk straight through). **Closing re-arms collision only when the swing
  finishes** (~0.35 s) — snapping a wall back on instantly would trap whoever is in the doorway.
- **⚠ `unregisterGateCollision` must NOT use `removeWallAt`** — that DISPOSES the mesh, and an opened gate has
  to survive to be shut again. It splices `wallMeshes`/`wallAABBs` and leaves the object alive in the scene.
- **Separate array + separate cap, deliberately.** `kitGates[]`, `KIT_GATE_MAX = 20`, alongside the untouched
  `KIT_WALL_MAX = 50`. Gates are **not** in `kitWalls` because `updateAbilities`' kitWalls prune drops any entry
  that has left `wallMeshes` — a gate in that list would be forgotten the instant it opened, breaking the cap
  and leaking the mesh at reset. Verified: 50 walls + 20 gates = **70 wall meshes**, caps enforced
  independently, no gate present in `kitWalls`.
- **Teardown:** `clearKitGates()` runs in `resetGame` *before* the `wallMeshes` sweep — a closed gate rides that
  sweep, an **open one is not in `wallMeshes` and would otherwise leak**, so it is disposed explicitly. A closed
  gate smashed by a predator is disposed by `removeWallAt`, and `updateGates` prunes the entry via
  `!g.mesh.parent`.
- **Cost: 2 wood — Steven's assumption was correct.** `WALL_COST.wood` is 2, and `GATE_COST` is defined **as**
  `{ wood: WALL_COST.wood }` so the pairing is structural rather than a copied literal.

### Cobra chase speed 14 → 18
- **`SNAKE_VARIANTS.cobra.SPEED_HUNT` now references `DOG.SPEED_CHASE`** (18) rather than copying the number,
  because the instruction was literally "as fast as a wild dog" — retune the pack and the cobra follows.
  (`DOG` is declared at line ~4136, well before `SNAKE_VARIANTS` at ~5548, so the reference is safe.)
- `SPEED_HUNT` drives **only** the chase paths (`NIGHT_HUNT` close + `CRUISE` pursuit). Unchanged: patrol
  (`SPEED_ROAM` 6), the ambush walk (`AMBUSH_SPEED` 8), the siesta stroll (`SIESTA_SPEED` 7) and the low-HP
  retreat (`RETREAT_SPEED` 14). Only its hunting got faster, as specified.
- **⚠ "as fast as a wild dog" and "faster than prey" are not the same thing** — reporting rather than
  reinterpreting. At 18 the cobra outruns the flee speed of **warthog 11 · kudu 14 · wildebeest 15 · zebra 16**
  but NOT **elephant 18 · impala 19 · gazelle 21 · giraffe 22**. Measured from a 14-unit start it **caught and
  killed** zebra in 3.7 s, wildebeest in 3.3 s and warthog in 3.7 s; the gazelle escaped (closest 11.3, never
  bitten) and the existing `NIGHT_GIVEUP` rule dropped it cleanly with no lock-up over 35 s. Going literally
  faster than all prey would need ~23, which would also put it well past the player's sprint of 16 — not done,
  since 18 is the number Steven named.

### Pinned tests — all pass
| pin | result |
|---|---|
| `test_gate_costs_2_wood_or_matches_wall_cost` | 10 → 8 wood, `GATE_COST.wood === WALL_COST.wood`; refuses at 1 wood and charges nothing |
| `test_gate_open_close_on_e_press_toggles_collision` | placed shut & registered → E opens (unregistered, 0 AABBs, swing −π/2) → E **from the other side** shuts (registered, swing exactly 0) |
| `test_predator_cannot_open_gate` | 25 s of a chasing lioness: gate **never toggled**, never crossed, max height above terrain **0.000** |
| `test_open_gate_walkable_through_for_player_and_predators` | shut = **0** crossings through the aperture; open = a dog crossed at **x = 0.62**, straight through. Player walks through (endZ 36) |
| `test_cobra_chase_speed_matches_wild_dog_and_catches_prey` | 18 === `DOG.SPEED_CHASE`; killed 3/3 slower species; gazelle still escapes |
- **Closed gate's walkable top verified:** landed at exactly `top + 0.1`, **40/40 grounded frames**, footprint
  width **2.5** = a wall's.
- **Leaks:** isolated gate lifecycle (place 6 → open → teardown) × 3 cycles, mixing open and closed →
  **0 geometries / 0 textures / 0 scene children**. A closed gate smashed mid-life prunes to 0 entries with no
  dangling ref.
- **120 s integration soak** (8 walls + 4 gates + 2 fast cobras, toggling gates every 12 s): **0 errors, 0
  console errors**, 10 toggles, every gate correctly either registered-and-shut or unregistered-and-open. One
  gate was smashed by the ecosystem during the run and pruned cleanly — 4 → 3.

### ⚠ Emergent limitation worth knowing: LIONS avoid wall gaps
A lion pressed to z ≈ −4 and refused a 2.5-wide open gate flanked by walls, while **wild dogs went straight
through**. Cause is **pre-existing lion behaviour**, not the gate: `updateLions` has a wall-**avoidance steering**
term (the file's only `wallAABBs.forEach`) that repels a lion from any wall centre within 3 units, so it will
not thread a narrow gap in a wall line. Dogs, snakes, rhinos and the gorilla have no such steering and exploit
an open gate normally. So "leave it open and they pour in" holds for the pack — for lions specifically, a
wide-open approach or a lone gate is needed. Left alone deliberately: changing lion steering is a separate
balance decision, not part of this ask.

### ⚠ Test-methodology note (third time this class of thing has bitten)
The first two attempts at the predator-through-gate pin **falsely reported both PASS and FAIL** because the
assertion was `z > 0.35` — which counts an animal that simply **walked around the end** of a 7.5-wide barrier.
Both the shut and open cases "crossed". The fix was to build a barrier out to x = ±24 and assert on the
**x-coordinate at the moment of crossing** (through the aperture, |x| ≤ 1.4, vs around the ends). Assert on the
mechanism, not on a proxy that a detour satisfies.


## Predators can no longer tunnel walls — MTV ejection + exact swept test (2026-07-30l)
Steven: *"The wild dog for some reason went straight through my walls… can you just make sure they can't get
through unless there's a hole big enough for them? Like a gate."*

### Which predator, and why — TWO defects, one of them the real culprit
Reproduced three ways before touching anything. `dogStep` *already* had a swept guard (added 2026-07-19), so
the 2026-07-19 note in this file was not the whole story.

1. **⚠ THE CULPRIT — `collideWalls`' dead-centre fallback was `pos.x += radius`.** An arbitrary **+X** shove.
   Walls are only 0.3 thick, so anything that ended up *inside* an AABB was never ejected: it was slid
   **ALONG** the wall at radius-per-frame until it cleared the end. The easiest way in is the player **dropping
   a wall on top of a chasing dog** (placement is 2.5 in front — right where the pack is).
   **Measured repro:** a vendetta dog with a wall dropped on it sat at z=0 for three frames, then popped to
   **z=4.37 — the player's side**. From the cockpit that is indistinguishable from walking through the wall.
   Note this was **system-wide**, not a dog bug: every animal shares `collideWalls`.
2. **`segHitsWall` samples only 7 interior points of the segment**, so a fast mover on a glancing approach can
   slip between samples. **Measured: 2 of 32 full-speed vendetta charge angles tunnelled clean through.**

Not a velocity/timestep problem and not a stale code path — the dog was using the same collision as everything
else. The collision *primitive* was wrong.

### Fix — system-wide, and it de-duplicates rather than adds
- **`pushOutOfAABB(pos, a, r)`** — one shared minimum-translation ejector: always perpendicular to the nearest
  face, along the shallowest axis. Nothing can be moved along a wall or through one. `collideWalls`,
  `collideStoneWalls` **and** the player's `pushPlayerOutOfWalls` now all call it, so the MTV logic I wrote for
  the player in `c57e684` is no longer duplicated — **one implementation, four call sites**.
- **`segCrossesWall(ax,az,bx,bz,r)`** — exact segment-vs-AABB **slab test** on each box expanded by the body
  radius. No sampling, so no step length or approach angle can defeat it. Swapped into the three movement
  guards: `dogStep`, `snakeStep`, `secretaryStep`.
- **`segHitsWall` left untouched** for line-of-sight / bite / spot-picking. Those run over long segments (a dog
  20 m from the player) where the cheap 7-sample approximation is the point; making it exact there would cost
  ~200 AABB tests per call per animal per frame.
- **Lions, rhinos, prey and the gorilla needed no swept guard** — checked rather than assumed. Top speeds are
  lion 19.5 / prey-flee 22 / worm 32 → ≤1.6 units per clamped frame, versus a 0.3-thick slab expanded by the
  body radius (≥1.7 effective). The MTV resolver alone holds them, and the all-predator test below confirms it.

### Pinned tests — all pass
| pin | result |
|---|---|
| `test_wild_dog_cannot_tunnel_through_closed_wall` | 0 crossings through the aperture (long barrier, x ±24) |
| `test_wild_dog_cannot_tunnel_through_closed_gate` | 0 crossings |
| `test_wild_dog_walks_through_open_gate` | **3 crossings at x = 0.00 / −0.45 / +0.45** — through the mouth. Feature intact |
| `test_all_predators_respect_wall_collision` | **0 crossings for all 8**: lion, vendetta dog, rhino, python, **worm (speed 32)**, cobra, grounded secretary bird, gorilla-vs-stone. All stayed at terrain height |
| `test_two_adjacent_walls_have_no_pathable_gap` | walls abut **exactly** (seam gap 0.0000); 0 of 12 seam-aimed dogs got through |
- **Repros re-run after the fix:** ejection is now perpendicular (dead-centre → z −0.65, x unchanged, never
  left inside the slab); the wall-dropped-on-a-dog case ends at z −0.65 and **stays** there over 200 frames;
  **0 of 32** charge angles tunnel, for **wood and stone**.
- **Aerial no-regression:** sky vulture crossed at 12 above terrain, martial eagle reached z 243 at 21.6 above
  terrain. Flying over is unaffected.

### Siege soak — the headline result
A closed ring of 19 **stone** walls (unsmashable) around the player with ONE gate, under 60 s of attack by
**8 vendetta wild dogs + lions + a speed-18 cobra**:
- **Gate SHUT: `framesAnyoneInside` = 0.** Nothing got in, once, at any point. The compound simply held.
- **Gate OPEN: 1178 frames with attackers inside**, a dog reaching **r = 1.7** — arm's length from the player at
  the centre. Overrun, exactly as designed.

That pair is the whole design intent in one measurement: **the only hole is an open gate.**

### ⚠ Note on the open-case metric
`breachesAwayFromGate` reads 1174 in the OPEN siege, which is **not** a failure — once a dog is inside and
roaming, its distance from the gate exceeds the 4.5 threshold, so it keeps counting. The load-bearing number is
the SHUT case's `framesAnyoneInside = 0`. Left in the report rather than quietly reworded, because the metric
is easy to misread as a leak.


## Cobra attacks TREES (and a treed player is no longer safe) — 2026-07-30m
Steven: *"Make the cobra able to attack people and trees and shoot venom at people and trees."*

### Player targeting was NOT broken — this was a spec extension, with one real bug found
Bite and spit already targeted the player correctly (grounded player takes 100 → 92 + venom from a spit,
verified). What was new is the **tree** work, and chasing it surfaced a genuine defect in the spit itself:
**`spawnVenomSpit` always aimed at `terrainY(target)+1.0`**, i.e. ground level, whatever the target's real
height. Harmless while every target stood on the ground; the moment a treed player became legal the blob sailed
along the dirt underneath them and the whole rule silently did nothing. Now aims at
`max(terrainY+1.0, tgt.pos.y)` — grounded targets sit at terrain+0.1 so the old arc is untouched.

### ⚠ There was no tree damage model to reuse — all of it is new
The brief assumed the axe already fells trees. **It does not.** `kitAxe` treats a tree as a **renewable harvest
node**: 8 s `cooldown`, +1 wood, tree stays forever. **Nothing in the game had ever removed a tree.** So HP,
felling and teardown are all new and the numbers are **invented**, anchored to `WALL_HP.wood`:
- `TREE_HP = { normal:120, big:240 }` — "a tree is about as tough as a wood palisade", big trees double.
- Measured: **6 cobra bites** (120/20) or **15 venom spits** (120/8) to fell a normal tree. Exactly as designed.
- **`kitAxe` is deliberately untouched.** Making the player's wood harvesting destroy their own climbing trees
  is a change Steven did not ask for and would quietly delete his escape spots. **So only the cobra fells
  trees** — flagged as an interpretive call, and it does read slightly odd that a snake can bring a tree down
  and an axe cannot.
- **Felling drops nothing.** There is no wood-pickup entity in the game (wood is granted directly by
  `doCollect`/`kitAxe`), so "match existing player-fell behaviour" had nothing to match. A felled tree bursts
  into 5 dust puffs, shakes the screen and is gone.

### Teardown was nearly free — earlier work paid for it
`fellTree` removes the tree from `treeObjects` **first**, then disposes. Every holder already polls that array:
the cobra's `AMBUSH_COIL`/`AMBUSH_TRAVEL`/`SIESTA_SLEEP` states re-check `treeObjects.indexOf(tree)` every
frame (written for the turret and tree-siesta work) and the gorilla already guarded its perch with
`treeObjects.includes(G.perchTree)`. The only explicit release needed was the **player**: `fellTree` calls
`dropFromTree()` while the reference is still valid. Verified — perched player at 3.54 → `inTree:false`,
`grapple.tree:null`, velY −2, lands exactly on terrain, `onGround:true`.

### Targeting priority
`player` → **the tree the player is hiding in** → creatures → any tree within `TREE_ATTACK_R` 20 (< the 26 it
will travel for a creature, so living things win on range too). Verified: with a tree 4 away and a lion 12
away it picks the **lion**; remove the lion and it picks the tree.
- **A cobra never targets the tree it is currently occupying** (`snakeOwnTree`) — it cannot bite the trunk it
  is coiled around and spitting at its own perch would loop. ⚠ This does **not** block Steven's
  nap-and-destroy-your-own-habitat case: verified live, a cobra that slept in a tree, woke, came down and
  **felled that same tree in 6.3 s**, with no errors and no physics weirdness.
- **Growth-on-kill deliberately does NOT fire for trees** — no `snakeCredit` in the tree branch. Verified:
  growth 0 → 0, segments 14 → 14 after felling.

### ⚠ A TREE IS NO LONGER SAFE FROM A COBRA — the biggest behavioural change here
This reverses an invariant defended across several commits and written into the bestiary ("height is the answer
to a serpent"). Steven asked for it explicitly and twice. Two routes:
1. **Spit reaches a player up a tree.** Scoped with **`player.inTree`, not `playerShelterTree()`** — the latter
   is a proximity test (near a canopy AND above `SHELTER_MINH`), so a player standing on a **wall** that happens
   to sit near a tree would have become spittable. `inTree` is the explicit perched flag, so the nerf lands
   exactly where it was aimed. **On a wall or mid-grapple you are still safe**, verified.
2. **It chops your perch down.** The tree you are hiding in is ranked directly below you and above every other
   creature.
The **bite** still refuses a treed player (`playerOffGround`), so the melee tree-safety rule is intact — only
the ranged spit and the tree itself changed.

### ⚠ Bug found and fixed mid-build: the spit killed itself on its own launch tree
First cut had the blob collide with trees from frame 0. With 768 trees on the map a cobra standing beside a
trunk **destroyed its own blob instantly** — measured, the spit died on frame 0 and the cobra could never hit
anything while near a tree. Added `SNAKE.SPIT_TREE_GRACE = 2.0`: no tree collision for the first 2 units of
flight. Standard don't-collide-with-your-own-muzzle rule.

### ⚠ EMERGENT RISK WORTH A DECISION: trees never grow back
Soak with **4 cobras** (above the usual population — they roll only on Day 1 and Day 5) over **one full
in-game day**: **20 of 767 trees felled = 2.61 %**, and the marks show it is **night-only** (0 through the
entire day phase, then 1 → 7 → 13 → 20 across the night, because trees are only targeted in `NIGHT_HUNT`).
**There is no regrowth anywhere in the game**, so the loss is monotonic — at that rate ~26 % of the map's trees
by day 10. Not tuned down, because the feature is what was asked for, but the knobs are `TREE_ATTACK_R` (20),
`TREE_HP` and the night-only targeting. Trees are the player's escape from lions/dogs/rhinos, so thinning them
is a slow, invisible difficulty ramp — worth Steven's call.

### Verified
- Pins: bite fells a tree (6 bites) · spit fells a tree (15 spits) · spit hits the player grounded **and**
  treed (100 → 92 + venom both) · creatures beat trees when both in range · **no growth from felling**.
- Player on a wall not targeted; cobra never targets its own tree; nap-then-fell-own-tree works with 0 errors.
- **Disposal:** 12 trees felled → 12 out of the array, **19 geometries freed**, every mesh detached. (Scene
  children rise transiently from the dust puffs, which self-dispose.)
- 240 s full-day ecosystem soak with 4 cobras: **0 errors, 0 console errors**.

Each phase is an independent commit so it can be iterated in isolation.
