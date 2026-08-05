#!/usr/bin/env python3
"""
Offline SCALE sheet for the 2026-08-05b gorilla halving (group.scale 1.05 -> 0.525).

WHY THIS IS NOT render_gorilla_compare.py: that sheet answers "does it look
cool", and its project() recomputes pixels-per-unit PER PANEL from the mesh's
own span — so it normalises size away and every gorilla fills its cell
identically no matter what scale you hand it. That is exactly useless for
judging a size change. Here ppu is FIXED across the whole sheet and both
gorillas stand on ONE shared ground line, so the panels are directly comparable.

The MESH IS IMPORTED, not re-declared — render_gorilla_compare.new_gorilla()
stays the single source of truth for the gorilla's box geometry and poses, so a
future mesh edit can't leave these two sheets disagreeing. Only the projection
is local (PITCH 0, a level view, so world Y maps 1:1 to screen Y and the
reference rules land on the pixel they claim to).

Reference heights are the in-page Box3 numbers from CONTEXT.md 2026-08-05b.
Run: python3 dossiers/render_gorilla_scale.py
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_gorilla_compare import new_gorilla, POSES, roty, mul, hexrgb  # shared mesh + math

YAW, PITCH = -0.7, 0.0          # PITCH 0 -> world Y maps 1:1 to screen Y
LIGHT = (-0.40, 0.72, 0.60)
_l = math.sqrt(sum(c*c for c in LIGHT)); LIGHT = tuple(c/_l for c in LIGHT)

def font(sz):
    for p in ('/System/Library/Fonts/Helvetica.ttc',
              '/System/Library/Fonts/Supplemental/Arial.ttf'):
        try: return ImageFont.truetype(p, sz)
        except Exception: pass
    return ImageFont.load_default()

# ---------- sheet layout ----------
PPU     = 78                    # FIXED pixels per world metre, whole sheet
W, H    = 1180, 700
GROUND  = 600                   # y of the shared ground line
TITLE_H = 74

# measured in-page (Box3 over isMesh, rotation.y zeroed, HP-bar excluded)
LION_TALL, PORC_TALL = 1.370, 1.834
GOR_TALL_AT_105      = 3.665    # so a panel's caption can sit just above its own head
PANELS = [
    ('BEFORE   scale 1.05',  1.05,  380, (231, 76, 60), '2.17 long x 3.67 tall x 3.02 wide'),
    ('AFTER   scale 0.525',  0.525, 800, (46, 160, 90), '1.09 long x 1.83 tall x 1.51 wide'),
]

img = Image.new('RGB', (W, H + TITLE_H), (24, 24, 29))
d = ImageDraw.Draw(img, 'RGBA')
d.text((22, 16), 'Survive the Savannah  —  gorilla halved, 2026-08-05b',
       font=font(24), fill=(241, 196, 15))
d.text((22, 46), 'mesh imported from render_gorilla_compare.py  ·  ONE fixed scale + ONE ground line across both panels',
       font=font(15), fill=(150, 150, 160))

d.rectangle([0, TITLE_H, W, TITLE_H + GROUND], fill=(216, 201, 168))            # sky
d.rectangle([0, TITLE_H + GROUND, W, TITLE_H + H], fill=(150, 140, 110))        # dirt

for m in range(1, 6):                                                           # metre grid
    y = TITLE_H + GROUND - m * PPU
    d.line([0, y, W, y], fill=(255, 255, 255, 40), width=1)
    d.text((8, y - 16), f'{m} m', font=font(13), fill=(90, 84, 70))

# reference rules — the two animals the brief compares against. Labels sit in the
# LEFT gutter; the right side collides with the AFTER caption box.
for tall, col, label in ((PORC_TALL, (155, 89, 182), f'porcupine height {PORC_TALL:.2f} m'),
                         (LION_TALL, (52, 152, 219), f'lion height {LION_TALL:.2f} m')):
    y = TITLE_H + GROUND - tall * PPU
    for x in range(0, W, 14):
        d.line([x, y, x + 7, y], fill=col + (220,), width=2)
    d.text((62, y - 19), label, font=font(14), fill=col)

def draw(parts, scale, cx):
    tri = []
    for faces, col in parts:
        for verts, n in faces:
            tri.append(([roty(mul(v, scale), YAW) for v in verts], roty(n, YAW), col))
    def scr(p): return (cx + p[0]*PPU, TITLE_H + GROUND - p[1]*PPU)
    d.ellipse([cx - PPU*1.5*scale, TITLE_H + GROUND - PPU*0.16*scale,
               cx + PPU*1.5*scale, TITLE_H + GROUND + PPU*0.16*scale], fill=(0, 0, 0, 95))
    tri.sort(key=lambda t: sum(p[2] for p in t[0]) / len(t[0]))                  # painter's algorithm
    for vv, nn, col in tri:
        nl = math.sqrt(sum(c*c for c in nn)) or 1
        nu = tuple(c/nl for c in nn)
        sh = 0.30 + 0.70 * max(0.0, sum(a*b for a, b in zip(nu, LIGHT)))
        r, g, b = hexrgb(col)
        fill = (int(r*sh), int(g*sh), int(b*sh))
        d.polygon([scr(p) for p in vv], fill=fill,
                  outline=(max(0, fill[0]-16), max(0, fill[1]-16), max(0, fill[2]-16)))
    for ex, ey, ez in ((-0.23, 2.70, 0.965), (0.23, 2.70, 0.965)):               # eyes, so the
        sx, sy = scr(roty(mul((ex, ey, ez), scale), YAW))                        # silverback still
        rr = max(1.6, PPU * 0.075 * scale)                                       # reads when small
        d.ellipse([sx-rr, sy-rr, sx+rr, sy+rr], fill=(255, 154, 54))

for label, scale, cx, tag, dims in PANELS:
    parts, _ = new_gorilla(POSES['roaming'])       # shared mesh; scale comes from PANELS, not the module
    draw(parts, scale, cx)
    top = TITLE_H + GROUND - GOR_TALL_AT_105 * scale / 1.05 * PPU
    d.rectangle([cx-186, top-64, cx+186, top-8], fill=(24, 24, 29, 215))
    d.rectangle([cx-180, top-58, cx-170, top-38], fill=tag)
    d.text((cx-160, top-60), label, font=font(20), fill=(255, 255, 255))
    d.text((cx-160, top-33), dims, font=font(14), fill=(178, 178, 188))

d.text((22, TITLE_H + H - 30),
       'hitR 1.762 -> 1.100 (floored by setHitbox\'s global Math.max(1.1, ...))   ·   '
       'hitTop 4.065 -> 2.232   ·   GOR.BODY_R 1.08 -> 0.54 (hand-set)',
       font=font(15), fill=(241, 196, 15))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gorilla_scale.png')
img.save(out)
print('wrote', out, img.size)
