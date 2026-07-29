# Lion Survival — Bestiary & Rules (canonical reference)

*The plain-English "how the world works" doc. Kept current — last updated 2026-07-28.*
*Exact numbers live in `index.html`: `SPECIES`, `GOR`, `RHINO`, `ELE`, `PLAYER` configs.*

---

## Core survival rules

**Hiding (the big one):**
- **Grass only hides you if you CROUCH in it.** Walking or standing in tall grass leaves you fully
  visible — the animals will still see and come for you. Press **C** to crouch, move slowly, stay low.
- **Up a tree = safe.** Grapple (`1`/`G`) into a climbable tree and lions/rhinos/elephants **cannot reach
  you** (no stamina cost to stay up there — wait out anything). **Exceptions:** the **gorilla** and the
  **sand python** can both see a treed player and will climb over to **tree-grab** you back to the ground —
  and a **black cobra** may already be coiled in a canopy waiting to drop on whoever walks under it —
  **though after dark that cobra is down on the ground hunting you instead.** A treed cobra also **spits
  venom up to 24 m**, so a canopy you can't reach is no longer a canopy you can ignore.
- **While grappling/climbing/standing on a wall** you're also out of a ground animal's reach.
- How well you're seen scales with a stealth value (`stealth.visMul`): crouch ×0.55, crouch-in-grass an
  extra ×0.45, standing still ×0.85, sprinting ×1.2 (loud & obvious). Lions, the gorilla (grounded
  player), the rhino, the elephant, and prey all read this — so **crouch-in-grass makes you nearly
  invisible; running in the open makes you a target.**

**Day / night (a 4-minute cycle — 2 min day, 2 min night):**
- **Every dawn a fresh wave spawns: 3 lions, 2 gorillas, 2 rhinos, 10 wild dogs, 2 sky vultures**
  (population caps: lions 14, gorillas 5, rhinos 6, wild dogs 15, sky vultures 4). **Giant serpents are
  rarer — they roll only on Day 1 and Day 5**, and each roll is three independent 30% coin flips (one per
  variant: sand python, pink worm, black cobra), so a roll brings 0–3 of them. Cap 6 total.
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

> **⚠️ STUN IS ROCKS ONLY.** The **thrown rock is the only weapon in the game that stuns anything** — and it
> stuns *everything* it hits, from a wild dog to the elephant. The **axe, hammer, spear, crossbow bolt and
> boomerang do damage and nothing else**: hit a lion with the axe and it keeps mauling you, hit the elephant
> with the hammer and it keeps trampling. Rocks are cheap and weak; that's the trade. **Rock the tank, then
> hit it with everything else** is now the core combat loop.
>
> Between *animals* the same idea holds: only the **elephant and the rhino** can be staggered by another
> creature. A lion, gorilla, wild dog or serpent that gets hit just keeps fighting — no more predators
> freezing solid mid-brawl.

- **Rocks** (`F`, hold up to 10): chip damage + a long **stun** — **the only stun weapon there is**. Your
  main tool for interrupting big threats.
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
- HP **58** (lioness) / **85** (male, hits harder — 32 vs 22). Hunt in a coordinated pride.
- **⚡ FASTER THAN YOU IN THE RUSH (buffed).** A charging lioness opens at **19.5**, a male at **17.5** —
  both beat your **sprint (16)**. You cannot simply run from the charge. But the burst **tires**: it drains
  down to a **13.5** floor over ~4 s, and 13.5 is under your sprint. **Survive the rush, then run.** The
  pride's closing-in speed (`converge`) is **14** lioness / **11.5** male.
  *(Their lazy wander/rest speeds are unchanged — the crepuscular activity curve still makes them near-inert
  through the heat of midday, which is when you cross open ground.)*
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
- **Stunned by ROCKS only** (your counter — rock it, then run or climb). A spear/bolt/axe/hammer just
  wounds it and it keeps swinging. **Flees when near death.**

### 🦏 Rhino — neutral until you poke it
- HP 220 (~14 spears). Roams and mostly ignores you… until provoked.
- **Poor senses** — you can sneak past, especially crouched in grass. Attack it (or get close & exposed)
  and it **charges and gores** you (35 dmg + knockback), tracking you as it comes.
- After it lands a hit it's **winded and slow** for a moment — that's your window to escape.
- **Can't pass through walls** (wall it off). **Stunned by ROCKS only** — one of just two animals a rock
  still staggers reliably, and the only thing that will interrupt a charge. **Flees when near death.**
- **Fights back against lions, the gorilla, and the elephant** if they attack it.

### 🐘 Elephant — the towering bull (biggest, tankiest)
- HP **300** (**15 spears** — the toughest thing in the game). A huge scaled-up bull with long tusks.
- **Charges and TRAMPLES** rather than fleeing — **50 damage to you** + big knockback, and it **gores
  lions/gorilla/rhino for 26**. It **smashes walls** in its path.
- **Enrages when hit** — spear or rock it and it locks onto you and charges *even if you hide*, for a few
  seconds. Otherwise it only aggros when you're **close AND visible** (crouch-in-grass avoids it).
- **Stunned by ROCKS only** — with the rhino it's one of the two animals anything can still stagger. A
  spear or bolt enrages it without slowing it down. Only **flees when near death.**
- **Everything fights it and it fights everything** — a rhino/gorilla/lion it tramples will turn on it.
- **Serpents leave it alone.** Neither the pink worm nor the sand python will *pick* a fight with the bull
  (or the rhino) — they're intimidated by the tanks. Bite one yourself and it still answers.

### 🐕 African wild dogs — the fast pack (they run you down)
- **Nightmare-fuel look** — a dark dire-wolf silhouette: **bared white fangs**, a **black spike crest down the
  spine** (hyena-punk mohawk), and a menacing rust/near-black mottled coat. Not a cute doggo.
- HP **25 each** — squishy alone (a spear/bolt/boomerang one-shots one, ~2 rocks), **lethal as a pack**.
- **A pack of 10 spawns every dawn** (cap 15). They roam loosely, hunt prey, and hunt **you** cautiously
  when you're **visible standing/sprinting** — crouch-in-grass hides you from them like everything else.
- **Super fast.** Their cautious hunt (~14) you can still outrun by **sprinting (16)**… but once provoked they
  hit **~18 — faster than a sprint, and they hold it forever. You cannot outrun a vendetta pack.** (A
  charging lioness now *peaks* higher at 19.5, but hers drains to 13.5 in seconds; the pack's 18 never does.
  The dogs are still the one thing you genuinely cannot escape on foot.)
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

### 🦅 Martial eagle — the sky HUNTER (not a scavenger)
- The **biggest bird in the game** — ~1.6× the vulture's wingspan (8.6 vs 5.3 units), 47 parts. **Dark
  chocolate above, PALE spotted underside, a near-black head with a white throat**, big yellow eyes, heavy
  hooked beak, four splayed primary "fingers" at each wingtip.
- **Soars higher than anything else — ~21.6 up, nearly double the vulture's 12** — and flies in **long
  straight lines on wings held DEAD LEVEL**. That's how you tell them apart in the air: the vulture wheels
  and flaps, the eagle glides somewhere on purpose.
- HP **110**. **Never touches carrion** — that's the vulture's niche, untouched. It hunts **small ground
  creatures only**: **wild dogs, small buck (gazelle / impala / warthog), and you**. Never a lion, gorilla,
  rhino, elephant, zebra, wildebeest, kudu, giraffe or serpent.
- **The hunt is a set piece.** It spots quarry (60 m), **banks** onto its line for ~1.3 s, **tucks its wings
  and STOOPS at 3.5× soaring speed (52)**, strikes for **25**, then **lands with its wings spread over the
  spot** for ~1.5 s before **rebounding** back up to altitude.
- **A landed strike costs it 90–120 s of cooldown**, so it's a rare, telegraphed event. A **miss** costs only
  ~14 s — it pulls out of the stoop and lines up again.
- **The mantle is its one vulnerable moment.** While it's on the deck over a kill, **lions will mob it**, a
  **gorilla will swipe it**, a **night cobra will bite it**, and a **wild-dog pack it just raked will come for
  it**. Wound it mid-hunt and it breaks off and climbs away for 30 s.
- Unlike the vulture, **it CAN be killed in the air** — it falls out of the sky. Ranged only while it soars
  (spear ×2, bolt, boomerang, rocks); melee reaches it only when it's low. **No body-part drop.**
- **Spawn:** 1 guaranteed on Day 1, then a **50% roll on Day 4 and Day 8**. Cap 3. Gold dot on the minimap,
  blazing white while it banks or stoops.

### 🦩 Secretary bird — the serpents' natural enemy
- A **tall grey-and-white bird on absurd legs** (the tallest bird here, 3.8 units), with a **black quill
  crest**, a **bare orange face**, a grey hooked bill and **two long tail streamers**. It **walks** — almost
  everywhere, almost always. 41 parts.
- HP **90**. **Roams SOLO** (never a pack — that's the wild dogs' behaviour), striding across the savanna.
- **Its entire purpose is SNAKES.** It hunts every serpent variant at top priority, **from up to 70 m** —
  it will cross most of the map for one. A cobra coiled up an ambush tree is out of reach; a cobra down on
  the ground at night is not.
- **The kill is a dance.** It **stalks** in fast (8), then **HESITATES** — circling the coil at 4 m for
  1.1–2.6 s with the crest half-raised — then drives a **STOMP KICK** down, **crest bristling wide** on the
  strike. Then it **drops the dead serpent and walks on**. It does not eat.
- **Stomp damage: 60 — plus a spine-break worth the serpent's whole health bar at zero growth, fading out
  by 6 segments of growth.** So a **young serpent dies to a single kick** (python, worm or cobra alike), a
  serpent that has fed a few times takes 2–3, and a well-grown one takes the flat 60 a kick (worm 9, cobra 5,
  python 17). **A serpent that has been eating is the one that survives being stomped.**
- **Get in the way and it kicks YOU for 15.** You are not its quarry — you're an obstacle.
- **The serpent bites back**, hard, and that's the real fight: an ungrown cobra loses in ~3 s; a grown one
  (bite 28 + venom) kills the bird instead. Lions, the gorilla and the wild dogs will all take a shot at it too.
- **It flies only in serious danger** — below 45% HP, or with a lion / gorilla / rhino inside 7 m. It flaps up
  to ~10, crosses 35–60 m and drops back in; it won't re-launch for 18 s, so a hurt bird gives ground **on
  foot** and slowly recovers instead. **No body-part drop.**
- **Spawn:** 1 guaranteed on Day 1, then a **50% roll on Day 6**. Cap 2. Pale grey dot on the minimap,
  orange while it's working a serpent.

### 🐍🪱☠️ Giant serpents — three variants, all of which GROW
Serpents arrive on **exactly two days: game start and Day 5.** Each time, all three variants get their
**own independent 30% roll** — so a roll can bring nothing, one, two or all three. You might open a run with
a python *and* a cobra but no worm; you might open with an empty map. **Average ≈1 serpent per roll**
(0 snakes 35% of the time, 1 → 44%, 2 → 19%, all 3 → 2.5%). Cap 6. **There are no other serpent spawns.**

All three are a head + a chain of **14 starting body segments** that follow it in an **S-slithering**
undulation, all are **blocked by walls** (wood & stone), all **collapse segment-by-segment** on death, and
none drops a body part.

**All GROW +1 segment for every kill they credit** — anything that took damage from that serpent and dies
within 2 s of its last bite/crush. A well-fed serpent visibly lengthens over a run. **Soft cap 50 segments.**

**⚠ AND EVERY SEGMENT MAKES ITS BITE HURT MORE.** Bite damage = **base + segments grown**. A pink worm that
has eaten five things bites for 45 instead of 40; at the 50-segment cap it bites for **76**. A python at the
cap bites for **86**. This applies to bites on you *and* on other animals — a serpent that has been feeding
all run is a genuinely different animal from the one that spawned. *Kill them early, or don't let them feed.*

**All take a MIDDAY SIESTA — but not in the same place.** At ~11:00 in-game (45–55% through the day) an
unengaged serpent drops everything, winds into a **tight breathing coil** and **sleeps for 60 seconds**.
Where it beds down depends on the species:
- 🐍 **python** and 🪱 **worm** sleep on a **grass patch on the bank of the watering hole** — on the ground,
  in reach, and the best window you'll get to line up a burst of melee damage.
- ☠️ **black cobra** sleeps **UP A TREE** — it travels to the **nearest climbable tree**, coils in the
  branches, and sleeps there. Grass is off the cobra's habitat entirely: it ambushes from trees, hunts from
  trees, retreats to a tree when wounded, and sleeps in one. **You can't melee it up there** — a sleeping
  cobra is a *ranged* opportunity, not a free hammer hit.

Any of them **wakes instantly** if you come within **8 m** or if anything damages it — and it wakes
**hostile**, locked onto you. A woken cobra **comes straight down out of the tree** at you (and if its tree
is chopped out from under it while it sleeps, it wakes and drops too). Blundering into a sleeping serpent is
the worst thing you can do at midday.

**All fight back against ANY attacker** — you, a lion, a wild dog, the gorilla, a rhino, the elephant. There
is no such thing as a free hit on a serpent.

**⚠ THE WORM AND THE PYTHON NOW HUNT PREDATORS, NOT JUST PREY.** They used to slither straight past a lion
on their way to a zebra. Now anything inside **30 m** is on the menu — **lions, wild dogs, gorillas, grounded
birds, prey, and serpents of the other kind** (a worm will fight a python; it won't fight another worm). The
two exceptions are the **elephant and the rhino**, which they won't start on — though the python will still
**wrap** those, and both will bite back hard at anything that hits them first. In a soak this shifted the
serpents' predation clean off the herds: **prey survivors more than doubled** while the gorilla population
roughly halved.

#### 🐍 Sand python — the tanky constrictor
- **Sandy tan** with darker **carpet-python brown blotches**. HP **1000** (**by far the tankiest thing in
  the game** — ~13 spears / 20 bolts / 10 boomerangs). **Bites for 50** on a **1 s cooldown**.
- **Exactly as fast as your sprint (16)** — you cannot outrun it on the flat any more; you have to break
  line of sight, get up a tree… and even that isn't safe (below). Crouch-in-grass still hides you.
- **WRAP ATTACK.** Get adjacent to an **elephant, gorilla or rhino** and it **coils around the torso**:
  both are locked in place and the victim takes **100 damage per second**. A rhino dies in ~2.2 s, a
  gorilla in ~1.6 s. The coil breaks when the victim dies, when **the python takes a hit**, or after
  **8 seconds**; then it's on a 5 s cooldown. **It never wraps you** — you get bitten, not crushed.
  *(Tactic: hit the python to make it let go of something you'd rather keep alive.)*
- **TREE-GRAB.** Like the gorilla, the sand python can **see a treed player** (up to 26 m), climbs the
  trunk and **drags you out of the canopy** for 50 damage + a 1.3 s daze + knockback (8 s cooldown). A tree
  is no longer a safe place to wait out a python.

#### 🪱 Pink worm — the fastest thing alive
- A **fleshy, shiny, slightly translucent pink tube** — no scales, no teeth, a blunt rounded head with two
  beady eyes. Cute-ugly.
- HP **500** (~7 spears). **Bites for 40** on a 1 s cooldown.
- **Speed 32 — twice the sand python, twice your sprint.** *Nothing on the ground is faster.* You cannot
  run from a pink worm; you go up a tree, behind a wall, or you fight it.
- **No wrap, no tree-climbing** — it just bites. Trees and walls are a hard escape from it.
- It is also the **fastest grower** in the game, and its bite scales with every segment — a worm left to
  feed on a herd all run will be biting for 70+ by the time you meet it.

#### ☠️ Black cobra — ambush by day, hunter by night
- **Near-black scaled body over a blue ventral stripe**, amber eyes, a flat wedge of a head, and a **hood
  that FLARES** — a spade-shaped blue membrane, black-rimmed, with two ochre spectacle spots and a dark
  throat band, that snaps open the moment it commits to a strike. When it flares it also **rears up** off
  the ground, spreads its neck flat, gapes its jaw and drops its **fangs** into view — every one of those
  is the same tell. If you see the hood, you're already in range. HP **700** (raised from 300 — it now
  outlasts the pink worm and takes **9 spears**; only the 1000-HP python is tankier).
- **⚡ IT STRIKES TWICE A SECOND.** Bite cooldown is **0.5 s** — the fastest attack rate of anything in the
  game. **20 damage a bite = 40 damage per second** before growth and before the poison. Where the python
  and worm land one bite a second, the cobra lands two.
- **It bites for 20 AND poisons you.** Full health → 80 on the first bite, and at two bites a second it is
  **five bites and ~2.25 seconds from full health to dead** if it stays on you (measured) — the venom barely
  gets a chance to matter.
  Every kill it makes adds **+1 to that bite** (a cobra that has eaten five things bites for 25; at the
  50-segment cap, 56 — i.e. **112 damage per second**).
- **☠️ VENOM.** One bite poisons you for **a full in-game day (240 s)**. Over the first **60 seconds** it
  bleeds you from full health down to **exactly 1 HP** — and then holds you there. **The venom itself never
  kills you.** What kills you is the next hit from anything at all, because you have no buffer left. Health
  regen is **blocked** for the entire duration. The HP bar turns **pulsing green** and the top-right HUD
  shows **☠️ POISONED Xs**.
- **CURE — water.** Wade into the **watering hole** and the venom flushes out immediately. That's a long
  walk on 1 HP to the one place lions gather to drink and serpents bed down at midday. The **🌿 Healing Herb**
  ability also purges it (and heals) if you're carrying one.
- **☠️ THE VENOM HITS ANIMALS TOO.** Anything the cobra bites is poisoned on the same terms — lions, wild
  dogs, gorillas, prey, even other serpents. Whatever its size, it is bled down to **1 HP in 60 seconds**
  and **held there for the full in-game day**, and the day/night reheal will **not** heal it while the poison
  is in it. It never kills them outright, but a 1-HP animal in this savannah dies to the next thing that
  touches it. **There is no cure for animals** — water and the herb are yours alone; they ride it out or they
  don't. This makes the cobra a hard counter to almost every other predator on the map: a wild dog it bit
  once is finished, and so is a 500-HP pink worm.
- **☀️ BY DAY — TREE DROP-AMBUSH.** It finds a **climbable tree**, coils in the canopy with the hood folded
  flat, and **waits**. Walk under that tree and it **DROPS on you** and bites on landing. On the minimap a
  treed cobra shows as a **hollow violet ring** rather than a solid dot — you can see where it is; noticing
  that it's *above* you is your problem. After a drop it won't re-tree for 22 s.
- **🟢 A TREED COBRA SPITS.** Coiled in a canopy it is not a passive trap any more — it **rears and hoses
  venom** at anything that comes within **24 m**, once every **2.2 s**. The blob itself only does **8**, but
  it carries **the full venom** on exactly the bite's terms, so one hit puts you on the 60-second slide to
  1 HP. It sprays **animals too** (nearest target if you're out of range) and it will not spray through a
  wall, or at a player who is up a tree or on a wall. The **hood flares as it rears** — that flash out of
  the canopy is your only warning. It leads a walker, so **sprinting or cutting across its line** breaks the
  shot; standing still in the open is a guaranteed hit.
- **☀️ AT MIDDAY IT SLEEPS IN A TREE** (not in grass — see the siesta note above). Same 60-second sleep, same
  8 m wake radius, but 3 m up in the branches and out of melee reach.
- **🎯 BELOW 100 HP IT BECOMES A TURRET — and never comes down again.** Wound a cobra past **100 HP** and it
  **breaks off mid-fight, runs (speed 14) to the nearest climbable tree, climbs, and stays there for the rest
  of its life, spitting.** From then on: **dusk doesn't bring it down**, standing under it **won't make it
  drop**, and **shooting it won't knock it out of the canopy**. It also **stops rehealing** at the day/night
  turn, so the damage you've already done sticks.
  - **This closes the old exploit** — a wounded cobra used to run out onto the ground where you could
    one-shot it. It can't be reached in melee up there at all.
  - **The counter-play is ranged:** a **spear (80)** takes down a turret that's under 80 HP outright, and
    **bolts (50), rocks (~15 + stun) and the boomerang (100)** all still hit it in the canopy. Bring a
    throwing weapon or walk away — but walking away means leaving a venom sprayer on that patch of map.
- **🌙 AT NIGHT — IT COMES DOWN AND HUNTS YOU.** At dusk it **pours down the trunk** and works the ground
  in a **40 m patrol** around that tree until dawn: patrol → close → strike → move on. It will hunt
  **anything** — you, wild dogs, lions, a gorilla, a rhino, prey. It spots you at the usual **22 m
  (× your stealth)** and creatures at **26 m**, and **commits inside 6 m** — which is when the hood snaps
  open. While it's travelling the hood stays **folded**, so at night the flare is your only warning and
  it comes late.
  - **It gives up on what it can't catch.** At speed 14 it can't run down an impala, so a target it hasn't
    closed on in 4 s is dropped (and left alone for 10 s) and it goes back to patrolling. Slow things —
    lions, rhinos, gorillas, a cornered dog — it runs down.
  - **At dawn it retreats** to the nearest good tree, climbs, and goes back to being an ambush. If it's
    **mid-strike when the sun comes up it finishes the strike first**.
- **The counterplay is the clock — until you wound it.** A cobra you can see coiled in a canopy is a hazard
  you can walk around (though now it will spit at you as you go). The same cobra after dark is coming to find
  you — and a poisoned player at 1 HP dies to its next bite. A tree or a wall still stops it (it can't
  tree-grab), so height is the answer at night. Once it's under 100 HP the clock stops mattering: it is up a
  tree permanently and only a thrown weapon finishes it.
- **No wrap, no tree-grab.** It can't pull you out of a tree — but it can be waiting in one.

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

> **The rule underneath all of it: anything that fights, fights anything that attacks it.**
> No animal in the game gets a free hit. Whatever you provoke — or whatever provokes *something else* —
> will turn around and come back at whoever actually hit it, not at whoever happens to be nearest.

- **Lions** hunt you & prey; mob the gorilla/rhino/elephant/**serpents**; **whole pride retaliates** if one
  is hurt, and now that includes being bitten by a serpent.
- **Gorilla** fights lions, rhinos, elephants and **serpents**, and hunts you. It hunts down **whatever drew
  blood**, not just lions.
- **Rhino** & **Elephant** fight back against anything that attacks them (each other, lions, the gorilla,
  **wild dogs**, **serpents**, you).
- **The elephant now HONES IN on its actual attacker.** It used to lumber at whatever was closest, which
  meant a dog or a serpent could chew on its flank forever. Hit the bull — with a spear, a dog's bite, a
  lion, a serpent — and it drops everything else and comes for *you* for 12 s, even if something else is
  standing closer.
- **Wild dogs** hunt you & prey, **and mob any serpent they run into** (a serpent bites back for far more
  than they can take — a python one-shots a dog). **Rivals with lions** (small skirmishes on contact, not to
  the death — deliberately kept off both retaliation systems). Wound one **yourself** → the **whole pack
  hunts you relentlessly** until the pack is wiped or you die. Hurt one with **anything else** → the pack
  turns on *that animal* for 14 s instead. Kill a dog and its pack-mates come for the killer.
- **Sky vulture** dives on you, wild dogs, rhinos and every prey species — but **never** a lion, gorilla or
  elephant. Nothing on the ground can hit it back while it's high (it flees the ground and can't be melee'd
  up there), and it retreats to heal rather than die in the air. A pack it rakes will mob it — but only once
  it lands.
- **Martial eagle** stoops on you, wild dogs and small buck only — **never** carrion, and never anything
  big. It's untouchable while it soars, but the **wings-spread mantle after a strike puts it on the ground**,
  and that's when lions mob it, the gorilla swipes it, a night cobra bites it and the pack it raked catches
  up with it. Wound it and it breaks off the hunt.
- **Secretary bird** hunts **serpents** and nothing else — it will cross the map for one, hesitate, then
  stomp. It kicks you only if you're in the way. It fights back against whatever attacks it, and it takes
  off only in serious danger.
- **Giant serpents** hunt prey + you, and **fight back against every attacker** — **including the secretary
  bird that just stomped them**. The **sand python**
  additionally **constricts elephants, gorillas and rhinos** (100 dmg/s) — the only animal that can kill a
  big three outright in seconds — and **tree-grabs** you like the gorilla. The **pink worm** just bites, but
  nothing outruns it. The **black cobra** runs on the clock — a drop-ambush from a canopy by day, an
  **active ground hunter after dark** that will strike you, a dog, a lion or anything else it finds. All
  three **grow a segment per kill**, **hit harder for every segment**, and **sleep through midday**.
- **Prey** (zebra→kudu, giraffe) just flee — except a cornered **warthog** gores back. They also flee the
  giant serpents and scatter when a vulture dives.
- **Everything reheals at each day/night turn**, so bring enough firepower to finish a fight in one round.
