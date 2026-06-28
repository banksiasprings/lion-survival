# Lion Survival — Project Context

Single self-contained `index.html`. Three.js **r128** from CDN. **Zero image assets** — all
geometry and textures are procedural (CanvasTexture / shaders). No build step, no npm.

Run locally: `python3 -m http.server 8911` (see `.claude/launch.json`) → open `index.html`.

## Architecture (preserve these invariants)
- **Memory discipline:** every Three object added to the scene must be freed with `killObj()` /
  `disposeObject3D()` when removed. `scene.remove()` alone leaks VRAM and eventually blacks out the
  canvas. Shared materials carry `userData.keep = true` so they're never disposed.
- **WebGL context-loss safety net** in `initScene()` — don't remove it.
- **Day/night hooks:** `scene.userData.sun` (DirectionalLight) and `scene.userData.ambient`
  (AmbientLight) are lerped each frame in `updateDayNight()`. New sky/lighting must hook here.
- **Game loop:** `animate()` calls the `update*(dt)` functions in order, then renders. `dt` is
  clamped to 0.05.
- **World:** `WORLD = 100`, `HALF = 50`. Ground height = `terrainY(x,z)`. Place everything on it.

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
- [x] Phase 3 — mutual stealth detection (`updateStealth` visual×audio model: grass+crouch+
      stillness slash visibility, running is loud; lions hidden in grass sink + drop off radar;
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
- **Spear** = toolbar slot **6** (`throwSpear`/`buildSpearMesh`, modeled handle + flint leaf-blade):
  thrown like a rock (LMB while slot 6 is held), crafted on the throw from **2 wood + 1 rock**. Damage
  is now **sized per target** so kill-counts are predictable: gorilla `maxHealth/10` (**10 spears**),
  lion `maxHealth/5` (**5**), prey one-shot (**1**) except the big-horned **kudu** `maxHealth/2` (**2**).
  Rocks keep the old `mult` model (chip + stun).
- **Pounce** (`Q`) buffed: `pounceRange 3.6 → 9` (long lunge), `pounceDamage 18 → 54` (3×); a hidden
  grass ambush still adds ×3 on top (≈162 — one-shots anything). Lets you leap on prey that hold still
  because grass hides you.
- **Rhino** (new neutral megafauna — `RHINO` config / `rhinoMeshes[]` / `makeRhino`/`updateRhinos`,
  2 spawn at reset): roams and ignores you (poor passive sense, `SENSE_RANGE 7 × stealth.visMul` so grass
  hides you). **Attack it (rock/spear)** → it's briefly stunned, then makes ONE committed straight-line
  **charge** at the spot you hit it from (`CHARGE_DMG 35` + knockback). Very tanky (**220 hp**, ~14
  spears), **blocked by walls** (`collideWalls`, can't smash like the gorilla), stunned by rocks/spears.
  Killing one drops a big edible carcass.
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
**cannot** be eaten. Per-species params live in the `SPECIES` table.

Each phase is an independent commit so it can be iterated in isolation.
