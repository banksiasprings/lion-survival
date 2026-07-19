# Lion Survival — Bestiary & Rules (canonical reference)

*The plain-English "how the world works" doc. Kept current — last updated 2026-07-19.*
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
- **Every dawn a fresh wave spawns: 3 lions, 2 gorillas, 2 rhinos, 10 wild dogs, 2 sky vultures, 1 giant
  snake** (population caps: lions 14, gorillas 5, rhinos 6, wild dogs 15, sky vultures 4, giant snakes 2).
  Elephants, giraffes and the plains herbivores arrive in herds.
- **At every day↔night turn, ALL animals heal to full.** Wearing something down resets each half-cycle.
- Lions are most active at **dawn, dusk and through the night**; they laze in shade at midday.

**Walls & fire:**
- **Wood walls** (Palisade Wall) block most animals — **but the gorilla and the elephant SMASH straight
  through them.** An axe fells a wood wall in 3 swings; a hammer in 2.
- **Stone walls** (new) block everything the same way **but the gorilla and elephant CANNOT smash them** —
  they're stopped cold. Only a **Hammer** brings a stone wall down (3 swings). A true fortress material.
- Campfires scare lions off (they flee fire).

**Your weapons & hunting:**
- **Rocks** (`F`, hold up to 10): chip damage + a long **stun**. Your main tool for stunning big threats.
- **Spear** (equip the **Spear** kit ability, then **LMB**/`Z`): hurls far harder than a rock. **Costs 1 rock
  + 2 wood per throw** now (the toolbar slot greys out when you can't afford it).
- **Tusk Boomerang** (equip the **🪃 Tusk Boomerang** ability — **craft it from 1 elephant tusk** first):
  **LMB**/`Z` hurls a carved boomerang that arcs **out ~26 m and RETURNS to your hand** for **100 damage**,
  20 s cooldown. One-shots a lion, downs a gorilla in 2 throws, an elephant in 3. Hits each target once per throw.
- **Rhino Crossbow** (equip the **🏹 Rhino Crossbow** ability — **craft it from 1 rhino horn** first): **LMB**/`Z`
  fires a bolt that flies **almost all the way across the map** for **50 damage**, 2.5 s cooldown, **unlimited
  bolts**. **Hold [RMB] (or the 🔭 button on mobile) to scope-zoom** — the view narrows with a crosshair for
  precise long shots. Fire while zoomed to snipe. Aim the crosshair *on* your target (the bolt flies flat/level).
- **Pounce** (`Q` / pounce button): a long lunge (range 9, 54 damage); from a **hidden crouch-in-grass ambush
  it's ×3** (~162 — one-shots most prey). The stealth-hunter play. **Requires the 🦷 Lion Tooth Necklace
  equipped** — without it you *cannot* pounce (the key/button is greyed out). Craft the necklace from **1 lion
  tooth**, so a **fresh save must kill its first lion the hard way** (axe/hammer/spear/rock) before pouncing prey.
- **Hitboxes cover the whole body** now — a thrown weapon connects anywhere on an animal (no more having
  to hit its feet).

**Loot drops (craft materials):**
- **🦷 Lion tooth** — drops from **every lion you kill** (kills by a gorilla/rhino don't count). Feeds the
  Lion Tooth Necklace. Shown in the HUD once you hold one; carried within a run (reset on death).
- **🦴 Elephant tusk** — drops from **every elephant that dies**. Feeds the Tusk Boomerang.
- **🦏 Rhino horn** — drops from **every rhino that dies**. Feeds the Rhino Crossbow.
- Crafting spends the material in the **🛒 SHOP** ("Craft" button, greyed if you can't afford it). The
  crafted item then **persists across runs** like the rest of your kit; the raw teeth/tusks do not.

**Spears-to-kill:** gazelle/impala/warthog/zebra/wildebeest **1** · kudu **2** · giraffe **3** ·
lion **5** · gorilla **10** · rhino **14** · **elephant 15**.

---

## Your kit — the Shop (abilities & accessories)

Your whole toolset. **(The old bottom tool hotbar was removed 2026-07-16 — the kit on the left replaced it;
the bottom of the screen now shows only your health/stamina/hunger bars.)** Use the active ability with
**LMB** or **`Z`**. Open the **🛒 SHOP** from the menu, or press **Tab** in-game (pauses) to manage your **loadout**.
Unlocks are **free** (no currency yet) and — like the equipped loadout — **persist across runs**
(`localStorage` key `lionSurvivalKit`). New saves start with **Fire Torch + Healing Herb + Camo Cloak**.

- **Toolbar: up to 5 abilities + up to 2 accessories — every slot is optional.** Equip anywhere from 0 to 5
  abilities; empty slots show a `+` placeholder you can fill (or leave empty) any time. One *equipped*
  ability is *active* (slot 1 by default). You can equip/unequip freely, even mid-run — unequipping a lit
  Fire Torch puts it out.
- **[LMB]** or **[Z]** uses the active ability · **[1]–[5]** jump to a slot · **[R]** cycles to the next ability · **[Tab]** opens the loadout.
- Tap any slot in the loadout screen to open a **quick-equip picker** (choose an item or "Empty this slot");
  each catalogue card has **Unlock/Equip/Unequip**. Slots never auto-fill against your choice.

**Abilities** (activated with [Z]):
- 🔥 **Fire Torch** — toggle a light that brightens the dark. It's a **beacon** — lions spot you more easily (like the torch tool).
- 🌿 **Healing Herb** — +40 health, 20 s cooldown.
- 💨 **Adrenaline** — refill stamina + run 40 % faster for 5 s, 25 s cooldown.
- 🌀 **Smoke Screen** — near-invisible (visMul ×0.15) for 6 s, 30 s cooldown.
- 🦅 **Eagle Eye** — minimap zooms to the whole map and reveals **every** animal for 8 s, 20 s cooldown.
- 🗡️ **Spear** — hurl a flint spear (heavy ranged damage), no crafting needed, 3 s cooldown.
- 🪵 **Palisade Wall** — drop a **permanent** wooden barrier for cover (up to **10** walls up at once), 8 s cooldown. Blocks animals; the gorilla & elephant still smash through. 120 HP (axe fells in 3, hammer in 2).
- 🧱 **Stone Wall** — drop a **permanent** stone barrier the gorilla & elephant **cannot smash** — only a Hammer brings it down. Shares the 10-wall cap, 10 s cooldown. 200 HP (hammer fells in 3).
- 🪝 **Grappling Hook** — reel up into a climbable tree or yank toward any surface in range (same as the tool grapple).
- 🪓 **Hand Axe** — swing: chop a nearby tree for wood, **fell a wood wall** (42), or land a **heavy melee** blow (42) on the animal in front, 1.2 s cooldown. Can't cut stone.
- 🔨 **Hammer** — swing: **smash a stone OR wood wall** (67), or land a **crushing melee** blow (67) on the animal in front, 1.4 s cooldown. The demolition tool. On each swing a **giant hammer crashes down from the sky** onto the target (flash + dust + screen-shake) — pure spectacle on top of the swing.
- 🪃 **Tusk Boomerang** — **craft from 1 elephant tusk.** Hurl a boomerang that flies out ~26 m and **returns to your hand** for **100 damage**, 20 s cooldown. One-shots a lion; 2 throws down a gorilla, 3 an elephant.
- 🏹 **Rhino Crossbow** — **craft from 1 rhino horn.** Fire a bolt almost across the map (**50 dmg**), unlimited bolts, 2.5 s cooldown. **Hold [RMB] / 🔭 to scope-zoom** for precise long shots. Deadly at range; aim carefully up close.
- 🏕️ **Campfire** — build a wide, long-lived (~120 s) ring of light that **lions flee**, 12 s cooldown.

*(These five are granted, material-free versions of the classic survival tools — they replaced the old
bottom tool hotbar. Wood & rocks are still collectible (Hand Axe / `E`); rocks feed `F` throws.)*

**Accessories** (passive while equipped):
- 🦷 **Lion Tooth Necklace** — **craft from 1 lion tooth.** While worn it **unlocks pounce** (`Q` / pounce button); without it you can't pounce at all. The gate on the stealth-hunter play.
- 🧥 **Camo Cloak** — 30 % harder to see (visMul ×0.7).
- 👟 **Swift Boots** — 15 % faster on foot.
- 🦴 **Bone Talisman** — health regen ×2.2.
- 🎒 **Forager's Satchel** — hunger drains 40 % slower.

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

### 🐕 African wild dogs — the fast pack (they run you down)
- **Nightmare-fuel look** — a dark dire-wolf silhouette: **bared white fangs**, a **black spike crest down the
  spine** (hyena-punk mohawk), and a menacing rust/near-black mottled coat. Not a cute doggo.
- HP **25 each** — squishy alone (a spear/bolt/boomerang one-shots one, ~2 rocks), **lethal as a pack**.
- **A pack of 10 spawns every dawn** (cap 15). They roam loosely, hunt prey, and hunt **you** cautiously
  when you're **visible standing/sprinting** — crouch-in-grass hides you from them like everything else.
- **Super fast.** Their cautious hunt (~14) you can still outrun by **sprinting (16)**… but once provoked they
  hit **~18 — faster than a sprint and faster than any lion. You cannot outrun a vendetta pack.**
- **PACK VENDETTA — the key danger.** Wound **any one dog** (any hit) and the **ENTIRE pack** turns on you
  and **NEVER disengages** — unlike the lion pride, they don't calm down. It ends only when **the whole pack
  is dead or you die.** Your only escape is to **climb a tree** (grapple) or **put a wall between you and them**.
- Bite ~11 each, fast (~1.5 s). Ten of them at once shreds you. **A treed or walled-off player is safe** —
  they mill at the base but can't reach you (both **wood AND stone** walls block the pack — even a fast
  vendetta dog no longer tunnels through). **Rivals with lions** — they trade small nips on contact.
- **No body-part drop** — they're pure challenge, no crafting reward.

### 🦅 Sky vulture — the raptor that owns the sky
- A **big dark raptor** (bigger than a wild dog), pale bald head, hooked beak, broad flapping wings.
  **Cruises high** — at ~2× tree height — and fast (faster than anything on the ground).
- HP **80**. Every so often it **DIVES**: swoops down, rakes a target with its talons for **30 damage**,
  and immediately climbs back up (15 s between dives). It **attacks nearly everything** — you, wild dogs,
  rhinos, and every prey species (gazelle→kudu, zebra, giraffe, wildebeest, warthog…) — but **never a
  lion, gorilla or elephant** (too big to bother).
- **You can only hit it with RANGED weapons while it's up high** (rock, spear, crossbow bolt, boomerang) —
  aim *up*. Melee (axe/hammer/pounce) only reaches it when it's **LANDED** or in the low arc of a dive.
- It periodically **descends and LANDS** in the open to rest (8–15 s), folding its wings and planting its
  feet; it'll **feed on a nearby carcass** while grounded. Then it **takes off** again.
- **It NEVER dies in the air.** Wound it below ~30% HP and it drops everything, climbs to max altitude and
  cruises until it's healed back up — so the only way to kill one is to catch it **on the ground** and burst
  it down fast. **No body-part drop.**

### 🐍 Giant snake — the tanky slitherer
- A **python about as long as an elephant** — a broad head + a chain of ~14 body segments that follow it in
  an **S-slithering** undulation. **Sandy tan** with darker **carpet-python brown blotches**.
- HP **1000** (**by far the tankiest thing in the game** — ~13 spears / 20 bolts / 10 boomerangs). **Bites
  for 50** damage on a **fast 1 s cooldown** — it chews through you quickly if it reaches you.
- **Slightly slower than a lion** (0.85× its pace) — a **sprint (16) outruns it**, and crouch-in-grass hides
  you from it like everything else. It **cruises the map**, **hunts the nearest prey**, hunts **you** when
  you're exposed and close, and **whips around to fight back** the moment you hit it.
- **Blocked by walls** (wood & stone). On death its whole body **collapses segment-by-segment**. **No
  body-part drop.**

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
- **Wild dogs** hunt you & prey; **rivals with lions** (small skirmishes on contact, not to the death);
  **avoid** the gorilla/rhino/elephant (too big). Wound one → the **whole pack hunts you relentlessly** until
  the pack is wiped or you die (they never calm, unlike the pride).
- **Sky vulture** dives on you, wild dogs, rhinos and every prey species — but **never** a lion, gorilla or
  elephant. Nothing on the ground can hit it back while it's high (it flees the ground and can't be melee'd
  up there), and it retreats to heal rather than die in the air.
- **Giant snake** hunts prey + you and fights back when attacked; it just coexists with the other big
  predators (no special rivalry).
- **Prey** (zebra→kudu, giraffe) just flee — except a cornered **warthog** gores back. They also flee the
  giant snake and scatter when a vulture dives.
- **Everything reheals at each day/night turn**, so bring enough firepower to finish a fight in one round.
