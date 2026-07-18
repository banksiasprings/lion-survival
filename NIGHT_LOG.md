# Lion Survival — Night Log

Running log of changes, newest first. One line per change.

## 2026-07-18 — Stone walls, numbered toolbar, LMB fire, axe/hammer on walls
- **Stone Wall** (`kit_stonewall` 🧱): new permanent barrier that elephants & gorillas CANNOT smash — `wallBlockingPath` skips stone, and the gorilla (which has no normal wall collision) is now stopped by `collideStoneWalls`; the elephant is stopped by its existing `collideWalls`. 200 HP.
- **Walls now have HP** (`userData.hp`/`maxHp`): wood 120, stone 200 — so player tools fell them over several swings instead of one-shotting.
- **Axe fells wood walls**: swinging the Hand Axe at a wood wall deals 42/swing (3 to fell); it refuses stone ("use a Hammer"). Entity melee unchanged (42).
- **Hammer** (`kit_hammer` 🔨): new demolition tool — smashes stone (67/swing, 3 to fell) or wood (2 to fell), and lands a 67 melee blow on the animal in front. Procedural haft+head swing model. 1.4 s cooldown.
- **Numbered toolbar**: ability slots now show number badges **1–5** (active slot highlighted); number keys 1–5 jump to a slot AND R still cycles — both work.
- **LMB fires the equipped tool** (was already wired to `useActiveAbility`); Z kept as backup.
- Disposal verified: stone walls + hammer-swing Groups free exactly once; two wall abilities reconcile independently on unequip; no orphans.
