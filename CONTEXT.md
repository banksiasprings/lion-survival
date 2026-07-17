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
      stamina (and regens) so you can wait out any threat; Space/G/RMB drop; drop-attack deals
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
  Spawns on a **2–5 day cadence** (`dn.nextRhinoDay`), `MAX 3`.
- **All animals reheal at each day↔night turn** (`healAllAnimals` in `updateDayNight`).
- **Every animal flees when about to die** (< ~25 % HP, runs from the nearest threat): prey (`flee`),
  rhino (drops target & bolts), lion (`flee_hurt` state), gorilla (`fleeing` state).
- **Spawn cadence — a daily wave** (`spawnDailyWave`, fired at each dawn `dn.day++` and once at reset for
  day 1): **3 lions, 2 gorillas, 1 rhino**, each up to its cap (lions 14, `GOR.MAX 5`, `RHINO.MAX 5`),
  spawned player-relative (r 55–95). The old per-flip / per-N-day cadences are gone. Lions, the gorilla
  and rhinos all show on the minimap.
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
- **Basic-tool abilities (2026-07-16b):** five granted, material-free, cooldown-gated tools — `kit_spear`,
  `kit_wall` (Palisade Wall), `kit_grapple`, `kit_axe` (Hand Axe: chop tree / heavy melee via
  `nearestAnimalInFront`+`dealKitMelee`, reusing each animal's wound+retaliation hooks), `kit_fire`
  (bigger/longer campfire). Each **reuses an existing mesh + its disposal path** so nothing new leaks:
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
- **Controls:** `[Z]` `useActiveAbility`, `[R]` `cycleActiveAbility`, `[Tab]` open loadout. The keydown/
  mousedown handlers early-return while `uiPaused` (only Tab/Esc close). All wired in `registerControls`.
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

Each phase is an independent commit so it can be iterated in isolation.
