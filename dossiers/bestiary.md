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

### 🦒 The giraffe is now TWICE the size
**11.6 units tall — 1.6× an elephant and about four times a lion**, against your own eye height of 1.7. It is
by a clear margin the tallest thing on the savanna. Everything else about it is unchanged: same herds, same
speed, still three spears. It just towers now.

**Spears-to-kill:** gazelle/impala/warthog/zebra/wildebeest **1** · kudu **2** · giraffe **3** ·
lion **5** · gorilla **10** · rhino **14** · **elephant 15**.

### 🐊 Crocodile — the pond apex *(600 HP)*
**There are three ponds now, each ~49 across, and every one has 1–2 crocodiles in it.** A croc **never leaves
its own pond** — it will not chase you across the map, and an animal at a *different* pond is none of its
business. That makes water a place you *choose* to enter.

Through the day it **basks on the mud at the rim**, **lies dead-still on the bottom** (no movement at all —
that's the ambush), and **cruises just under the surface** with only its eye-ridge showing. Day favours
basking, night favours lurking. It attacks **everything** that comes into its water: you, prey drinking,
lions, dogs, cheetahs, snakes. **Rhinos and gorillas it leaves alone** — too big to hold.

**Fighting one:** hammer **67**, spear **80** — about **8 spears** to kill. (Until 2026-07-31 no weapon
could touch a croc at all, and the same fault made the **cheetah** invulnerable since it was added. Both fixed.)

**It will come out of the water for you.** If something is within about **7 units of the water's edge**, the
croc **explodes out** and snatches it — that's how it takes animals drinking at the bank. It can only keep that
up for ~3 seconds, then it must go back and recover for ~9. **Outrun it and you're safe for good** — it will
never chase you across the map.

**It grows.** Every **5 kills** a crocodile gets visibly bigger — **+12% and +60 HP per tier**, up to
**1.57× and 840 HP at 20 kills**. A huge croc is one that has been eating well for a long time, and it reaches
and bites further to match. Kill it early or deal with it later.

**Hurt it badly and it sinks.** Below **100 HP** a croc breaks off and lies on the **bottom of its pond**,
healing about 2.5 HP a second until it is back to 300 and comes up hunting again. It won't lunge and won't
leave the water while it's down there — **but it will still grab you if you dive onto it**, and your air is
draining the whole time. Finishing a wounded croc is a choice, not a freebie.

**Walls stop it.** A crocodile cannot cross a wood or stone wall, or a **shut gate** — and it cannot bite you
through one either. Leave a gate **open** and it will come straight through. (Both were broken until
2026-07-31: crocs walked through walls, and even once stopped they could still bite through them.)

**Animals fear it on land.** Prey bolt from a croc they can see: basking, cruising, charging or ashore. But a
croc lying **motionless on the bottom is invisible to them** — that's the ambush, and it's why animals still
come down to drink.

**If it gets you:** it **grabs you and hauls you to the bottom of its pond.** Wherever it seized you — even
out on the bank after a lunge — it **reverses into deep water**, taking you with it, and pins you just off the
bed. Then the **death roll: 20 damage every 1.35 s, and your air burns 2.5× faster**, turning ~11 seconds of
breath into about 4. You can still look around but you **cannot swim away**.
⚠ A **bank grab gives you a few seconds** before your head actually goes under — that's your best window to
mash out. Get taken in deep water and the drowning clock starts immediately.
**To break free: MASH — [SPACE], or tap anywhere on a phone.** Nine taps, but the meter *bleeds away*, so
casual tapping will never get there; a proper mash frees you in about a second. You then get **3 seconds of
grace** to get out of the water. Killing the croc also makes it let go.
Cobra venom sticks to a croc **basking on the bank** but can't reach one **under the water**.
⚠ Clear a pond of crocs and it's yours — **until dawn, when a new one moves in.**

### 🗺️ Reading the radar
- 🐊 **Crocodile** — a **sand-brown dot** sitting on the blue pond. It flares **orange-red** the instant it
  charges or lunges, so you get warning before it reaches you.
- 🐆 **Cheetah** — a **yellow dot with a black centre**. Four other things on the radar are gold (idle lions,
  gold cobras, the martial eagle) but every one of those is a *solid* dot — the cheetah is the only ring with a
  dark middle. It goes **white-hot** the moment it starts its sprint.
- 🦔 **Crested porcupine** — a small **dull olive** dot, deliberately drab: it isn't a threat until you make it
  one. It turns **hot orange** the instant it bristles, which is the only warning you get that you provoked it.

### 🐆 A wounded cheetah runs and hides
Drop a cheetah below **26 HP** and it breaks off — even mid-sprint — and **runs for tall grass** well away from
whatever hurt it, where it lies up and heals back to 56 before hunting again. Let it go and you'll see it
again; chase it down and you won't.

### 🌿 Your own bramble fence will cut you — and a LINE of them stacks
The fence is **symmetric**: **20 damage** to whatever walks into it and **half speed** while you're inside —
**and that includes you**. Push back through your own line and it costs you 20 HP and slows you to a crawl, so
where you put it matters.

**Every fence counts separately.** Walk a line of five and you take **100** — 20 from each, at any speed. (It
used to be 20 total for the whole line: one shared cooldown meant only the first fence you touched ever
scored. Fixed 2026-08-04, so a wall of thorns is finally worth what you paid for it.)

The damage is **per crossing, not a tick**: standing in the thorns costs you 20 **once**, and the half-speed
is what punishes you for staying. Step fully out and back in and the fence re-arms after half a second.
Thorns are on the **ground** — you're clear of them on a roof, on a wall, or up a tree.

### 🦔 Crested porcupine — the "spike-back" *(125 HP)*
**A big, heavy animal** — half again the size it used to be, shorter than a lion but far chunkier: stout,
dark-brown and low-slung, its back climbing to a **hunch over the hips**, with a small pig-snouted head carried
near the ground and a pale band across the throat. It is **covered** in cream-tipped banded quills — crown,
neck, back, flanks, rump and tail, longest over the hips, with a crest of finer bristles running from between
the eyes to the shoulders. **It will never start a fight.** Left alone it just trundles about foraging, swaying
gently on the spot — it does not hunt, does not track you, and its quills are harmless while they're lying
flat. **You can walk straight past one.**

**Hit it once and that changes permanently.** The whole coat stands up and **fans out** — the animal visibly
swells, roughly a third wider, and the quills shiver — that's your warning, and the radar dot goes from dull
olive to hot orange. Then it comes at you **backwards**, rump and quills first, the way a real porcupine does.
Anything in contact takes **18 damage** on a short cooldown, and once provoked it will go for **anything
nearby**, not just you. It does not calm down: it stops only when it **flees below 30% HP**, or dies.

**So melee is the wrong answer.** Swinging at it means standing on the quills — the blow lands and you take 18
straight back, **every swing**. At 125 HP that is no longer a one-off tax: a hammer needs **2** swings (36
back) and an axe **3** (54 back — over half your health to kill one animal).

**The spear is the answer.** It one-shots a porcupine outright, at any HP, from well outside quill range —
you never take a single point back. Everything else now takes several hits: **boomerang 100**, **hammer 67**,
**crossbow bolt 50**, **axe 42**, thrown **rock 15**. You rarely need the full 125 though — it breaks off and
flees the moment it drops below **37.5**, so one boomerang or two bolts is usually enough to send it away
rather than kill it.

Drops a **porcupine quill**. Two arrive with each dawn wave, up to six on the map.

### 💀 Everything that dies leaves bones — pick them up
**Every creature in the game now drops a coloured, species-named keepsake** where it fell: a *lion bone*, a
*wild dog bone*, a *crocodile bone*, a *giraffe bone*, a *python fang*, a *pink worm hide*, a *porcupine
quill*. Colours follow the animal — croc bones are olive, giraffe cream, vulture dark grey, rhino and the
plains herbivores a pale skin tone. **An acid-green cobra drops a bright GREEN fang**; every other cobra morph
gives the ordinary tan one.

Walk up and press **[E]** (or the phone's **EAT** button) to add one to your pouch. The count shows in the
top-right, and the full per-species tally is in the **Shop**, under **BONES & MATERIALS**.

⚠ **They don't do anything yet.** This is material for weapon crafting that hasn't been built — for now they
are purely collectible. They're **run-scoped** like teeth, tusks and horns, so dying loses them.
⚠ The existing craft drops are **unchanged and still separate**: a lion still gives you a 🦷 tooth *and* a
bone, an elephant a 🦴 tusk *and* a bone. Nothing you spend on the necklace, boomerang or crossbow moved.
⚠ The **ecosystem drops them too**, not just your kills — so bones accumulate wherever animals have been
fighting. The map holds the **40 most recent**; older ones are cleared away.

### 🏠 A roof is real overhead cover
Stand **under** a roof and a **sky vulture dive (30)** or a **martial eagle stoop (25)** is turned away
completely. Step out and you're fair game again — the roof protects the tile, not you. The **secretary bird**
never dives; its 15-damage kick is a ground attack, and it can't reach you on a roof at all.
**Standing on top of a roof is the reverse deal:** nothing on the ground can touch you, but the sky can see you
perfectly. Want cover from birds up there? Build a second roof over the first.

### 🎒 Carrying things — [T] / the TAKE button
You have **one hand and it holds one thing**. Press **[T]** (phone: the 🎒 **TAKE** button, which flips to
**DROP** and lights up while your hand is full) to pick up the nearest thing you can carry, and press it again
to put it down in front of you. It stays where you left it — walk off and come back, it's still there.

**What it grabs, in priority order:** anything already lying on the ground → a **hunk of meat** cut off a
carcass (costs the carcass 20 food; a carcass under 20 refuses) → a **berry** straight off a bush → a
**rock or log out of your own stock**. Reach is **3.4**.

⚠ **Nothing is ever created or destroyed.** Picking a rock out of your stock *moves* it from the counter into
your hand; dropping it moves it back into the world. At any instant every item is in exactly one of three
places — your stock, the ground, or your hand — which is what makes carrying meaningful: you can walk a
carcass hunk away from camp as bait, or ferry a rock to where you'll actually want to throw it.

---

## Your kit — the Shop (abilities & accessories)

**🪙 EVERYTHING COSTS COINS NOW (2026-07-31).** A fresh install starts with the **Fire Torch and nothing
else**. You earn **1 coin for surviving day 1, 2 for day 2, 3 for day 3** and so on — so ten days banks **55**,
twenty days banks **210**. Coins and everything you buy are **saved permanently**: they survive dying, and they
survive closing the app. Cheap first buys are the **Healing Herb (4)**, **Smoke Screen (5)** and **Camo Cloak
(6)**; the **Rhino Crossbow is 80 coins AND a rhino horn**. The 🦷/🦴/🦏 craft materials are separate and still
reset every run — coins are the thing that lasts.

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
- 🪵 **Palisade Wall** — drop a **permanent** wooden barrier for cover (up to **100** walls up at once), **no cooldown** — materials are the only gate. Blocks animals; the gorilla & elephant still smash through. 120 HP (axe fells in 3, hammer in 2).
- 🧱 **Stone Wall** — drop a **permanent** stone barrier the gorilla & elephant **cannot smash** — only a Hammer brings it down. Shares the same **100**-wall cap, **no cooldown**. 200 HP (hammer fells in 3).
  ⚠ The cap is a **world** cap: wood and stone draw on the same 100. Try to place the 101st and it simply
  refuses and charges you nothing — nothing you already paid for is ever demolished to make room.
- 🪝 **Grappling Hook** — reel up into a climbable tree or yank toward any surface in range (same as the tool grapple).
- 🏷️ **Name Tag** *(accessory, 6 coins)* — while worn, **[RMB]** (phone: the 🏷️ NAME button) on any animal
  within 30 units names it. It offers **"Bob"** by default — just press Enter — or type your own, up to 24
  characters. The name floats over its head, and when it dies the killfeed says so by name: *"You slew Gerald
  the elephant."* ⚠ The animals themselves don't survive closing the app (the world is regenerated each run),
  but **the names you've given are kept** — who they were, what they were, and how they ended.
- 🪓 **Hand Axe** — swing: chop a nearby tree for wood, **fell a wood wall** (42), or land a **heavy melee** blow (42) on the animal in front, **0.6 s cooldown** (halved 2026-07-31 — same 42 damage, so a tree is still 3 swings, just twice as fast). Can't cut stone.
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

**⚠ THE COBRA IS AS FAST AS A WILD DOG NOW (2026-07-30).** Its chase speed went **14 → 18**, the same as a
wild dog's vendetta sprint and **faster than your sprint (16)**. It runs down **warthog, kudu, wildebeest and
zebra**; **gazelle (21), impala (19) and giraffe (22) still escape** it. Only its *hunting* got faster — its
patrol, its walk to an ambush tree, its midday stroll and its wounded retreat are all unchanged.

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

### 🐍🪱☠️ SERPENT CIVIL WAR — all three fight each other
If more than one **species** of serpent is on the map, they go for each other. Each uses its own weapon (the
python's bite, the worm's bite, the cobra's bite + venom + canopy spit) — there is no special "snake duel"
code and no winner table, so the outcome falls straight out of their HP and damage. They never attack their
**own** species.

**Who wins, measured in isolated duels:**

| Fight | Winner | Over in | …and the winner is left |
|---|---|---|---|
| 🐍 python vs ☠️ cobra | **python** | ~14 s | **on 1 HP** — poisoned, and the venom grinds it down from 331 |
| ☠️ cobra vs 🪱 worm | **cobra** | ~11 s | on 260 HP, unharmed by poison (the worm has none) |
| 🐍 python vs 🪱 worm | **python** | ~9 s | on 600 HP, barely scratched |

So the pecking order is **python > cobra > worm** — but read the last column, because that's the real story.
**The cobra loses to the python and ruins it anyway.** A single bite lands the venom, and the venom doesn't
care how big you are: it bleeds *anything* to 1 HP in 60 seconds. The python walks away from the fight and
then bleeds out to 1 HP regardless. **A python that has just killed a cobra is the easiest kill on the map** —
for a worm, for a lion, or for you. Watch for the fight, then take the winner.

**A canopy cobra can only be fought by the python.** Only the python **climbs** (the same ability behind its
tree-grab), so it is the one serpent that can rear up a trunk and take the fight into the branches — against
a coiled ambush, a low-HP turret, *or* a sleeping cobra (sleepers get no protection; it's a fight worth
having). A **worm can't climb**: it ignores a treed cobra entirely and goes looking for something it can
actually reach, so it never stands under the tree looking useless — it just eats a face full of venom spit on
its way past. A **non-turret** cobra that gets bitten in its canopy is knocked out of the tree and the fight
finishes on the ground; a **turret** stays up and defends by spitting.

**Every kill counts for growth.** Killing a rival serpent grants the same **+1 segment / +1 damage to every
bite** as any other kill, so a serpent that wins a civil war comes out of it bigger *and* hitting harder.

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
- **🎨 FIVE COLOUR MORPHS — rolled at spawn, kept for life.** Every cobra rolls one of five colours when it
  arrives and keeps it forever: it never changes on growth, damage, state or the day/night flip. A gold cobra
  that eats its way to 40 segments is still gold, just enormous. Offline render of all five:
  [`cobra_morphs.png`](cobra_morphs.png).
  - **⚠ ALL OF THEM ARE BLACK FROM ABOVE.** Look down at a cobra and every morph is a near-black snake with
    only a faint cast of its colour on the back — you will not identify one from above. The colour lives
    **underneath and on the hood**: the belly, the **flared hood membrane**, the hood's spectacle marking,
    its **minimap dot** and its **venom spit** are all full-strength. So a cobra you spot from a distance is
    just a black snake; you learn which one it is when it **rears and flares at you**, when it **spits**, or
    off the **radar**.

  | Morph | Look | Chance |
  |---|---|---|
  | **acid-green** | fluorescent poison-dart green, dark spectacle | 23.75% |
  | **black** | the original — near-black scales, deep blue belly | 23.75% |
  | **crimson** | oxblood scales, arterial red belly | 23.75% |
  | **dark-violet** | deep purple with an ochre spectacle | 23.75% |
  | **✨ GOLD** | brass scales, bright gilt belly — announces itself in the killfeed | **5% — rare** |

  **⚠ THE GOLD ONE IS A BOSS: 1500 HP, not 700.** It is the only morph that isn't purely cosmetic, and at
  1500 it is now the **single tankiest animal in the game** — above the sand python's 1000. That's
  **19 spears / 30 bolts / 15 boomerangs / ~100 rocks** to bring down, and it has to lose **1400 HP** before
  the low-HP tree-turret ever triggers. Everything else about it is an ordinary cobra: same bite 20 on a 0.5 s
  cooldown, same venom, same speed 14, same territory, night hunt, siesta and drop-ambush. If a gold one
  claims the quarter of the map you live in, move.

  **Growth does not make any serpent tankier** — it adds length and **+1 damage to every bite** (capped at 50
  segments / bite 56), and never touches HP. So a gold cobra ends up the **longest and hardest-hitting**
  serpent on the map, but its health advantage is a flat +800 that never compounds.

- **Near-black scaled body over a blue ventral stripe** *(the `black` morph — see the table above)*, amber
  eyes, a flat wedge of a head, and a **hood
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
- **⚠ A TREE IS NO LONGER SAFE FROM A COBRA (2026-07-30).** It attacks **trees** now, and it has two ways to
  get you out of one: it can **spit venom straight up at you while you're perched**, and it can **chew the tree
  itself down** — **6 bites or 15 spits** fells a normal tree (double for a big one), and when it falls **you
  fall with it**. A cobra rates the tree you're hiding in above every other creature. Its **bite** still can't
  reach you up there, and a **wall or a grapple is still safe** — this is trees, and cobras, specifically.
  Trees **do not grow back**.
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
- **🗺️ IT OWNS A QUARTER OF THE MAP.** The world splits into four quadrants about the origin, and each cobra
  **claims one at spawn, for life**. Successive cobras take **different** quadrants, so a full map of them
  covers all four corners and two cobras in different quarters will simply never meet. It never gives the
  claim up and it never moves it.
- **🌙 AT NIGHT — IT COMES DOWN AND PATROLS ITS TERRITORY.** At dusk it **pours down the trunk** and works
  its quarter until dawn: patrol → close → strike → move on.
  - **⚠ IF YOU ARE IN ITS QUARTER AFTER DARK, IT KNOWS.** Inside its own territory the cobra hunts you
    **from any distance, and crouching in grass does NOT hide you** — it owns that ground. A quarter of the
    map is simply dangerous at night. **Height is still the answer:** a tree, a wall or a grapple puts you out
    of its reach exactly as before. Step outside its quarter and it drops back to the ordinary
    **22 m × stealth** detection.
  - **It hunts EVERYTHING, not just prey** — you, wild dogs, lions, a gorilla, a rhino, grounded birds, a
    **landed vulture**, and **rival serpents**. Creatures inside its territory are spotted at **78 m** (3× its
    normal 26 m); outside, 26 m.
  - **It won't leave its patch to chase you.** Run for the border. It will follow about **30 m** past its own
    edge and then **break off, turn round, and go home** — and while it's off its ground it hunts nothing at
    all, it just walks back. (It still bites anything that jumps it on the way.)
  - It **commits inside 6 m** — which is when the hood snaps open. While it's travelling the hood stays
    **folded**, so at night the flare is your only warning and it comes late.
  - **It gives up on what it can't catch.** At speed 14 it can't run down an impala, so a target it hasn't
    closed on in 4 s is dropped (and left alone for 10 s) and it goes back to patrolling. Slow things —
    lions, rhinos, gorillas, a cornered dog — it runs down.
  - **At dawn it retreats** to the nearest good tree, climbs, and goes back to being an ambush. If it's
    **mid-strike when the sun comes up it finishes the strike first**.
  - **Its full day, measured end to end:** ground at dawn → climbs a tree (~13 s in) → **coiled in the canopy
    all day** (or asleep in one through the midday siesta) → **pours down at dusk** → **patrols its quarter
    all night** → **back up a tree at first light**. Round and round, every day.
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
