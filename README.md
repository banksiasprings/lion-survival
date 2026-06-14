# 🦁 Lion Survival

A single-file 3D savanna survival game — **[Three.js](https://threejs.org/) r128, zero asset files**, everything procedural.

## ▶ Play now

**https://banksiasprings.github.io/lion-survival/**

Or clone and open `index.html` directly (no build step, no server needed).

## Survive the savanna

Lions hunt hardest at **dawn, dusk and through the night**, and doze in shade by day.
Stay alive: hide in the long grass, mind the wind, hunt to keep your hunger up, and
grapple into a tree when the pride closes in.

### Controls
- **WASD** move · **Mouse** look · **Shift** sprint · **Space** jump · **C** crouch (hide in grass)
- **1 / G** grapple → tree (LMB fire · RMB/Space drop · drop onto a lion = attack)
- **Q** pounce (hunt prey — ambush from grass for ×3) · **E** eat a kill / collect
- **2** walls · **3** campfire · **4** torch · **5** axe · **F** throw rock · **T** craft torch

### What's in it
- **Savanna world** — instanced wind-blown grass, gradient day/night sky, 6 African tree
  types, varied rocks, watering hole, drifting dust, distant hills.
- **Realistic lion AI** — crepuscular/nocturnal activity, lioness vs male prides that
  coordinate, flank and converge, a hunger→aggression cycle, midday shade-resting.
- **Mutual stealth** — grass + crouch + stillness shrink how far you're seen/heard;
  lions stalk hidden in grass too; wind carries your scent downwind.
- **Grapple-to-tree** — perch out of reach, drop-attack from above (grip stamina limits camping).
- **Food chain** — 6 prey species in herds (zebra, wildebeest, gazelle, impala, warthog,
  kudu); lions hunt them, vultures circle kills, you can hunt ahead of the pride or
  scavenge their kills (risky — they guard them). Keep your hunger up or you starve.
- **Weather** — occasional storms cut everyone's visibility; distant roars at night.

The HUD reports the raw signals honestly: your visibility/noise, the nearest lion's
state/hunger/sight range, wind, time-of-day activity.

> Renders shadows on capable GPUs and auto-disables them on drivers that can't handle the
> WebGL2 shadow pass (e.g. some older Macs), so it doesn't go blank. There's a `diag.html`
> GPU capability report if anything looks off.
