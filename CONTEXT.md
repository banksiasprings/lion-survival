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

Each phase is an independent commit so it can be iterated in isolation.
