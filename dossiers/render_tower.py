#!/usr/bin/env python3
"""Offline elevation/plan render of a 4-storey Savannah tower, from the live game's
own AABBs. Headless WebGL renders black, so this is how the geometry gets looked at."""
import json
from PIL import Image, ImageDraw, ImageFont

D = json.loads(open('tower.json').read())
TERR = D['terrain']
walls, roofs, decks = D['walls'], D['roofs'], D['decks']

W, H = 1500, 940
img = Image.new('RGB', (W, H), '#12161c')
d = ImageDraw.Draw(img)
try:
    f  = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 15)
    fb = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 20)
    fs = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 12)
except Exception:
    f = fb = fs = ImageFont.load_default()

GROUND = '#8a7a4e'
C_GW, C_EW, C_ROOF = '#c88a4a', '#4fc3ff', '#9a6b45'

# ---------- LEFT: side elevation (X across, Y up) ----------
L, T, PW, PH = 70, 90, 620, 760
xs = [w['x0'] for w in walls] + [w['x1'] for w in walls] + [r['x0'] for r in roofs] + [r['x1'] for r in roofs]
x0, x1 = min(xs) - 1.2, max(xs) + 1.2
y0, y1 = TERR - 1.0, max(r['y1'] for r in roofs) + 1.2
sx = PW / (x1 - x0); sy = PH / (y1 - y0)
s = min(sx, sy)
ox = L + (PW - (x1 - x0) * s) / 2
def px(x): return ox + (x - x0) * s
def py(y): return T + PH - (y - y0) * s

d.rectangle([L-14, T-46, L+PW+14, T+PH+30], outline='#2a3240', width=1)
d.text((L, T-42), 'SIDE ELEVATION  —  4 storeys, wall → roof → wall → roof', font=fb, fill='#e8eef7')

# ground
d.rectangle([L-10, py(TERR), L+PW+10, T+PH+28], fill='#1d2229')
d.line([L-10, py(TERR), L+PW+10, py(TERR)], fill=GROUND, width=3)
d.text((L-6, py(TERR)+8), 'terrain  y = %.2f' % TERR, font=fs, fill=GROUND)

# only draw geometry whose Z band straddles the tower centre line, so the near
# wall doesn't paint over the section
zc = (min(r['z0'] for r in roofs) + max(r['z1'] for r in roofs)) / 2
for r in roofs:
    d.rectangle([px(r['x0']), py(r['y1']), px(r['x1']), py(r['y0'])], fill=C_ROOF, outline='#c9a274')
for w in walls:
    if not (w['z0'] < zc < w['z1']):
        continue
    col = C_EW if w['el'] else C_GW
    d.rectangle([px(w['x0']), py(w['y1']), px(w['x1']), py(w['y0'])], fill=col, outline='#0d1116')

for i, dy in enumerate(decks):
    d.line([L-10, py(dy), L+PW+10, py(dy)], fill='#3b4657', width=1)
    d.text((L+PW-2, py(dy)-17), 'deck %d   y=%.2f' % (i, dy), font=fs, fill='#8fa3bd')

# storey pitch annotation
if len(decks) > 1:
    ax = px(x1) - 26
    d.line([ax, py(decks[0]), ax, py(decks[1])], fill='#f0c674', width=2)
    for yy in (decks[0], decks[1]):
        d.line([ax-6, py(yy), ax+6, py(yy)], fill='#f0c674', width=2)
    d.text((ax-96, (py(decks[0])+py(decks[1]))/2 - 9),
           'pitch %.3f' % (decks[1]-decks[0]), font=fs, fill='#f0c674')

# player, to scale, standing on deck 1
phx = px((x0+x1)/2 - 1.6)
d.line([phx, py(decks[1]+0.1), phx, py(decks[1]+0.1+1.7)], fill='#ffffff', width=3)
d.ellipse([phx-5, py(decks[1]+0.1+1.7)-10, phx+5, py(decks[1]+0.1+1.7)], fill='#ffffff')
d.text((phx+10, py(decks[1]+0.1+0.85)), 'you (1.7)', font=fs, fill='#ffffff')

# ---------- RIGHT: plan of one deck ----------
RL, RT, RS = 790, 90, 470
zs = [w['z0'] for w in walls] + [w['z1'] for w in walls]
pxs = [w['x0'] for w in walls] + [w['x1'] for w in walls]
a0, a1 = min(pxs) - 0.6, max(pxs) + 0.6
b0, b1 = min(zs) - 0.6, max(zs) + 0.6
ps = RS / max(a1-a0, b1-b0)
def qx(x): return RL + (x - a0) * ps
def qz(z): return RT + (z - b0) * ps

d.text((RL, RT-42), 'PLAN  —  deck 1 ring (doorway at −Z)', font=fb, fill='#e8eef7')
r = roofs[1]
d.rectangle([qx(r['x0']), qz(r['z0']), qx(r['x1']), qz(r['z1'])],
            fill='#2a2318', outline=C_ROOF, width=2)
d.text((qx(r['x0'])+8, qz(r['z0'])+8), 'roof %.1f × %.1f' % (r['x1']-r['x0'], r['z1']-r['z0']),
       font=fs, fill='#c9a274')
for w in walls:
    if abs(w['y0'] - decks[0]) > 1e-6:
        continue
    d.rectangle([qx(w['x0']), qz(w['z0']), qx(w['x1']), qz(w['z1'])], fill=C_EW)
# doorway arrow
mx = (qx(r['x0']) + qx(r['x1'])) / 2
d.line([mx, qz(r['z0'])-34, mx, qz(r['z0'])+8], fill='#7ee787', width=3)
d.polygon([(mx-7, qz(r['z0'])+2), (mx+7, qz(r['z0'])+2), (mx, qz(r['z0'])+14)], fill='#7ee787')
d.text((mx+14, qz(r['z0'])-30), 'doorway', font=fs, fill='#7ee787')

# ---------- legend / findings ----------
LY = RT + RS + 58
d.text((RL, LY), 'MEASURED', font=fb, fill='#e8eef7')
rows = [
    (C_EW,   'elevated wall  — snapped to the deck rim, base = roof top'),
    (C_GW,   'ground wall    — base follows the terrain, unchanged'),
    (C_ROOF, 'roof / deck    — 4.4 × 4.4, the storey floor'),
]
yy = LY + 30
for col, label in rows:
    d.rectangle([RL, yy+3, RL+16, yy+15], fill=col)
    d.text((RL+26, yy), label, font=f, fill='#c3cede')
    yy += 26

yy += 12
facts = [
    'storey pitch          2.595  (uniform to 20 decks, top y = 50.41)',
    'single jump apex      3.373  → clears one storey, 0.78 to spare',
    'double jump apex      5.547  → deck 1 from the ground; deck 2 never',
    'rim overhang          0.15 of the wall’s 0.30 depth, half supported',
    'wall→roof seam        0.06 slit at the top of every elevated wall',
]
for t in facts:
    d.text((RL, yy), t, font=fs, fill='#8fa3bd')
    yy += 21

img.save('tower.png')
print('ok', img.size)
