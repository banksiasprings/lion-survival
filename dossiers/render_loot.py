#!/usr/bin/env python3
"""Offline render of the 2026-08-05 LOOT DROPS — every mesh form makeBoneMesh() builds.

Why offline: the in-app Browser pane hands this page a 0x0 canvas and a non-functional
WebGL backend (readPixels comes back all-zero across a full 2560x1600 frame), so the
running game cannot be screenshotted here. Same reason and same approach as
render_croc.py / render_porcupine.py / render_cobra.py.

⚠ The rasteriser and the vector helpers are IMPORTED from render_croc.py rather than
copied. There is one projector in this folder and this file is a scene for it.

⚠ This mirrors makeBoneMesh() in index.html by hand — the primitive list, the positions,
the rotations and the colours are transcribed from it. If that function changes, this file
changes with it: it is a dossier illustration, not a test.
"""
import math, os, sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_croc import TF, box, cone, sphere, render   # noqa: E402


def cyl(stack, rt, rb, h, colour, out, seg=7):
    """CylinderGeometry(rt, rb, h, seg) — centred on the origin, like Three.js."""
    top = [(math.cos(2*math.pi*i/seg)*rt, h/2, math.sin(2*math.pi*i/seg)*rt) for i in range(seg)]
    bot = [(math.cos(2*math.pi*i/seg)*rb, -h/2, math.sin(2*math.pi*i/seg)*rb) for i in range(seg)]
    from render_croc import chain
    T = [chain(stack, p) for p in top]
    B = [chain(stack, p) for p in bot]
    for i in range(seg):
        j = (i+1) % seg
        out.append(([B[i], B[j], T[j], T[i]], colour))
    out.append((T, colour))
    out.append((B[::-1], colour))


# --- the table, transcribed from BONE_KINDS (label, form, colour) ------------------
DROPS = [
    ('lion tooth  (craft)',   'tooth',   0xf2e9d0),
    ('elephant tusk (craft)', 'tusk',    0xefe6d0),
    ('rhino horn  (craft)',   'horn',    0x8a7f70),
    ('gorilla fang',          'fang',    0xe6ddc6),
    ('porcupine quill',       'quill',   0xf0e6cc),
    ('cheetah claw',          'claw',    0x2e2822),
    ('vulture feather',       'feather', 0x4a4e52),
    ('python skin',           'skin',    0xc2a878),
    ('serpent spine',         'spine',   0xdbd0b2),
    ('worm slime',            'slime',   0xe58fb0),
    ('zebra bone  (prey)',    'bone',    0xcfc3ae),
]
QUILL_ROOT = 0x120f0b
FEATHER_SHAFT = 0xcfc6b2


def build(form, colour):
    """Rebuild one drop. Mirrors makeBoneMesh() primitive-for-primitive."""
    out = []
    R = lambda x, y, z, rx=0.0, ry=0.0, rz=0.0: [TF(pos=(x, y, z), rot=(rx, ry, rz))]

    if form == 'fang':
        cone(R(0, 0.10, 0, 0, 0, math.pi/2 + 0.25), 0.09, 0.52, 7, colour, out)
    elif form == 'tooth':
        cone(R(0.06, 0.10, 0, 0, 0, math.pi/2 + 0.5), 0.10, 0.34, 7, colour, out)
        cyl(R(-0.09, 0.09, 0, 0, 0, math.pi/2), 0.085, 0.062, 0.18, colour, out, 6)
    elif form == 'tusk':
        x, y, a = -0.26, 0.09, 0.0
        for i in range(3):
            r = 0.085 - i*0.020
            cyl(R(x, y, 0, 0, 0, math.pi/2 - a), r*0.78, r, 0.26, colour, out)
            x += math.cos(a)*0.21; y += math.sin(a)*0.21; a += 0.30
    elif form == 'horn':
        x, y, a = -0.15, 0.08, 0.0
        for i in range(3):
            r = 0.135 - i*0.034
            cyl(R(x, y, 0, 0, 0, math.pi/2 - a), r*0.74, r, 0.19, colour, out, 8)
            x += math.cos(a)*0.15; y += math.sin(a)*0.15; a += 0.36
    elif form == 'claw':
        x, y, a = -0.09, 0.07, 0.15
        for i in range(3):
            r = 0.058 - i*0.015
            cone(R(x, y, 0, 0, 0, math.pi/2 - a), r, 0.21, 6, colour, out)
            x += math.cos(a)*0.16; y += math.sin(a)*0.16; a += 0.50
    elif form == 'quill':
        cyl(R(-0.26, 0.08, 0, 0, 0, math.pi/2), 0.032, 0.038, 0.20, QUILL_ROOT, out, 6)
        cone(R(0.14, 0.08, 0, 0, 0, -math.pi/2), 0.036, 0.60, 6, colour, out)
    elif form == 'feather':
        cyl(R(0, 0.05, 0, 0, 0, math.pi/2), 0.014, 0.020, 0.62, FEATHER_SHAFT, out, 5)
        for sz in (-1, 1):
            box(R(-0.04, 0.055, sz*0.075), 0.44, 0.012, 0.13, colour, out)
            box(R(0.20, 0.055, sz*0.045), 0.20, 0.012, 0.07, colour, out)
    elif form == 'skin':
        box(R(-0.10, 0.05, 0.03, 0, 0.18, 0.10), 0.56, 0.035, 0.34, colour, out)
        box(R(0.20, 0.07, -0.06, 0, -0.32, -0.14), 0.46, 0.035, 0.30, colour, out)
        box(R(0.02, 0.10, -0.14, 0, 0.55, 0.05), 0.30, 0.035, 0.22, colour, out)
    elif form == 'spine':
        for i in range(3):
            x = -0.20 + i*0.20
            cyl(R(x, 0.07, 0, 0, 0, math.pi/2), 0.085, 0.085, 0.10, colour, out)
            box(R(x, 0.15, -0.02, -0.30), 0.05, 0.17, 0.05, colour, out)
    elif form == 'slime':
        sphere(R(0, 0.035, 0), 0.28, colour, out, scale=(1.15, 0.30, 0.95), rings=6, segs=9)
        sphere(R(0.26, 0.025, 0.14), 0.13, colour, out, scale=(1.0, 0.28, 1.0), rings=5, segs=8)
    else:                                     # bone — shaft + a knob at each end
        cyl(R(0, 0.10, 0, 0, 0, math.pi/2), 0.065, 0.065, 0.62, colour, out, 6)
        for sx in (-0.33, 0.33):
            sphere(R(sx, 0.10, 0), 0.115, colour, out, scale=(1, 0.85, 1.15), rings=5, segs=6)
    return out


def sheet(path):
    COLS, PW, PH = 4, 310, 210
    rows = (len(DROPS) + COLS - 1)//COLS
    W, H = COLS*PW, 46 + rows*PH
    img = Image.new('RGB', (W, H), (24, 27, 22))
    dr = ImageDraw.Draw(img)
    for i, (label, form, colour) in enumerate(DROPS):
        polys = build(form, colour)
        # every drop is rendered at the SAME camera, so the sheet reads as a size comparison
        panel = render(polys, PW - 12, PH - 26, (0.62, 0.52, 0.98), (0.0, 0.08, 0.0), fov=42)
        cx, cy = (i % COLS)*PW + 6, 46 + (i//COLS)*PH
        img.paste(panel, (cx, cy + 20))
        dr.text((cx + 6, cy + 4), label, fill=(232, 228, 208))
    dr.text((12, 8), 'LOOT DROPS — makeBoneMesh() forms  ·  predators drop a part, prey drop bones',
            fill=(240, 234, 212))
    dr.text((12, 26), 'same camera in every cell, so the sizes are comparable  ·  '
                      'craft = feeds the counter its recipe spends', fill=(150, 158, 132))
    img.save(path)
    return path


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    print(sheet(os.path.join(here, 'loot_render.png')))
