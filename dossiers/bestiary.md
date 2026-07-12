# Lion Survival — Bestiary & Rules (canonical reference)

*The plain-English "how the world works" doc. Kept current — last updated 2026-06-28.*
*Exact numbers live in `index.html`: `SPECIES`, `GOR`, `RHINO`, `ELE`, `PLAYER` configs.*

---

## Core survival rules

**Hiding (the big one):**
- **Grass only hides you if you CROUCH in it.** Walking or standing in tall grass leaves you fully
  visible — the animals will still see and come for you. Press **C** to crouch, move slowly, stay low.
- **Up a tree = safe.** Grapple (`1`/`G`) into a climbable tree and lions/rhinos/elephants **cannot reach
  you** (no stamina cost to stay up there — wait out anything). **Exception:** the **gorilla** is the only
  animal that can see a treed player and will climb over to **tree-grab** you back to the ground.
- **While grappling/climbing/standing on a wall** you're also out of a ground animal's reach.
- How well you're seen scales with a stealth value (`stealth.visMul`): crouch ×0.55, crouch-in-grass an
  extra ×0.45, standing still ×0.85, sprinting ×1.2 (loud & obvious). Lions, the gorilla (grounded
  player), the rhino, the elephant, and prey all read this — so **crouch-in-grass makes you nearly
  invisible; running in the open makes you a target.**

**Day / night (a 4-minute cycle — 2 min day, 2 min night):**
- **Every dawn a fresh wave spawns: 3 lions, 2 gorillas, 1 rhino** (population caps: lions 14, gorillas 5,
  rhinos 5). Elephants, giraffes and the plains herbivores arrive in herds.
- **At every day↔night turn, ALL animals heal to full.** Wearing something down resets each half-cycle.
- Lions are most active at **dawn, dusk and through the night**; they laze in shade at midday.

**Walls & fire:**
- Player-built walls block most animals — **but the gorilla and the elephant SMASH straight through them.**
- Campfires scare lions off (they flee fire).

**Your weapons & hunting:**
- **Rocks** (`F`, hold up to 10): chip damage + a long **stun**. Your main tool for stunning big threats.
- **Spear** (slot **6**, LMB): craft-on-throw for **2 wood + 1 rock**, hits far harder than a rock.
- **Pounce** (`Q`): a long lunge (range 9, 54 damage); from a **hidden crouch-in-grass ambush it's ×3**
  (~162 — one-shots most prey). The stealth-hunter play.
- **Hitboxes cover the whole body** now — a thrown weapon connects anywhere on an animal (no more having
  to hit its feet).

**Spears-to-kill:** gazelle/impala/warthog/zebra/wildebeest **1** · kudu **2** · giraffe **3** ·
lion **5** · gorilla **10** · rhino **14** · **elephant 15**.

---

## The animals

### 🦁 Lions — the pride (they hunt YOU)
- HP 30 (lioness) / 46 (male, hits harder). Fast (sprint ~16), hunt in a coordinated pride.
- **They stay in a pack** and now **drift back together** so they don't scatter.
- **Pride vendetta:** hurt **any one lion** and the **whole pride turns on the attacker** — you, a gorilla,
  a rhino, or an elephant. Attacking a lion is how you get the entire pack chasing you.
- Detect you by sight+sound (crouch-in-grass to slip past). Hunt prey when hungry; scavenge/steal kills.
- **Can't climb** — a tree is your safe haven from them. **Scared of fire.**

### 🦍 Gorilla — the apex brawler (very strong)
- HP 160, extremely tanky (~10 spears). Territorial: **fights lions, rhinos AND elephants**, and hunts you.
- **Roams by day, perches in a tree by night**, dropping to engage anything that comes near.
- **The only animal that can see & grab a treed player** — it closes in and **tree-grabs** you down.
- **SMASHES walls** in its path. **Pursues from far (40 m).**
- **Smacks you for ~50 — half your health in one hit** (cooldown ~1.7 s, plus knockback). Brutal up close.
- **Stunned by rocks/spears** (your counter — stun it, then run or climb). **Flees when near death.**

### 🦏 Rhino — neutral until you poke it
- HP 220 (~14 spears). Roams and mostly ignores you… until provoked.
- **Poor senses** — you can sneak past, especially crouched in grass. Attack it (or get close & exposed)
  and it **charges and gores** you (35 dmg + knockback), tracking you as it comes.
- After it lands a hit it's **winded and slow** for a moment — that's your window to escape.
- **Can't pass through walls** (wall it off). **Stunned by rocks/spears.** **Flees when near death.**
- **Fights back against lions, the gorilla, and the elephant** if they attack it.

### 🐘 Elephant — the towering bull (biggest, tankiest)
- HP **300** (**15 spears** — the toughest thing in the game). A huge scaled-up bull with long tusks.
- **Charges and TRAMPLES** rather than fleeing — **50 damage to you** + big knockback, and it **gores
  lions/gorilla/rhino for 26**. It **smashes walls** in its path.
- **Enrages when hit** — spear or rock it and it locks onto you and charges *even if you hide*, for a few
  seconds. Otherwise it only aggros when you're **close AND visible** (crouch-in-grass avoids it).
- **Stunned by rocks/spears.** Only **flees when near death.**
- **Everything fights it and it fights everything** — a rhino/gorilla/lion it tramples will turn on it.

### 🦒 Giraffe — tall prey, too fast to chase
- HP 40 (~a lion). **Faster than you even sprinting** — you can't run it down; spear/rock or ambush it.
- **Flees** when threatened or hit (like all prey). Takes **3 spears.** Towering, spotted, walks with a gait.

### Plains herbivores (flee — they don't attack, mostly)
These graze in herds, flee predators, **bolt when hit**, and **panic-run when near death**. Crouch-in-grass
to sneak up for a pounce. All die to **1 spear** (kudu takes 2).
- **Zebra** (hp 42), **Wildebeest** (hp 48), **Thomson's gazelle** (hp 16, very fast, jukes),
  **Impala** (hp 24, hops when fleeing), **Kudu** (hp 72, big spiral horns — 2 spears),
  **Warthog** (hp 30 — **gores you back for 14 if you pounce and don't kill it**).

---

## Who fights whom (the combat web)
- **Lions** hunt you & prey; mob the gorilla/rhino/elephant; **whole pride retaliates** if one is hurt.
- **Gorilla** fights lions, rhinos, elephants, and hunts you.
- **Rhino** & **Elephant** fight back against anything that attacks them (including each other).
- **Prey** (zebra→kudu, giraffe) just flee — except a cornered **warthog** gores back.
- **Everything reheals at each day/night turn**, so bring enough firepower to finish a fight in one round.
