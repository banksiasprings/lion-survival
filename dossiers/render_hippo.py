#!/usr/bin/env python3
"""Offline render of the HIPPOPOTAMUS — the silhouette on land, the periscope silhouette
in the water, the gape it charges with, and the leg cycle.

Why offline: the in-app Browser pane hands this page a 0x0 canvas and a software WebGL
context, so `renderer.domElement.toDataURL()` returns "data:," while renderer.info still
reports a full draw list. A screenshot of the running game is not obtainable here. Same
reason and same approach as render_cobra.py / render_croc.py / render_porcupine.py.

⚠ The rasteriser, the vector helpers and the sRGB-matched shader are IMPORTED from
render_croc.py rather than copied. There is one projector in this folder and this file is
a scene for it — a second copy would drift.

⚠ Rendered in MODEL space, so the group's HIPPO_SCALE (1.24, sized to match the rhino's
bounding height) does not appear here — and the waterline stays at the base FLOAT_DEPTH
1.30, because scaling the group scales the float offset with it.

⚠ This mirrors makeHippo() / animateHippo() in index.html BY HAND. If either changes, this
file must change with it: it is a dossier illustration, not a test. Every constant below is
transcribed verbatim from makeHippo().

⚠ WHAT THIS SHEET IS FOR. The porcupine's render caught a real bug — its quills leaned
forward over its own face, because a positive rotation.x tips +Y toward +Z and +Z is the
nose. The two things worth checking here are the same class of thing and cannot be seen
from inside a headless canvas:
  1. the TUSKS must curve UP and OUT of the lower jaw, not down through it;
  2. the WATERLINE pose must leave eyes, ears and nostrils above the surface and nothing
     else — that is the whole reason the head was modelled with them riding high.
"""
import math, os, sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_croc import TF, chain, box, cone, sphere, render, shade, label   # noqa: E402

# ---------------------------------------------------------------- palette
# transcribed from makeHippo()
HIDE  = 0x6b6168     # wet slate-grey back
BELLY = 0x9a6f6a     # the famous pink-brown underside
MOUTH = 0x7d3f45     # gums
IVORY = 0xefe7cf     # tusks + incisors
DARK  = 0x3a3238     # eyes, nostrils, feet

WATER = 0x2b6a8c     # the pond disc colour from the minimap note


def cyl(stack, rt, rb, h, colour, out, seg=6):
    """CylinderGeometry(rt, rb, h, seg) — centred on the origin, like Three.js."""
    top = [chain(stack, (math.cos(2*math.pi*i/seg)*rt, h/2, math.sin(2*math.pi*i/seg)*rt))
           for i in range(seg)]
    bot = [chain(stack, (math.cos(2*math.pi*i/seg)*rb, -h/2, math.sin(2*math.pi*i/seg)*rb))
           for i in range(seg)]
    for i in range(seg):
        j = (i+1) % seg
        out.append(([top[i], top[j], bot[j], bot[i]], colour))
    out.append((top[::-1], colour))
    out.append((bot, colour))


def leg_pose(ph, moving, swimming):
    """animateHippo()'s leg cycle, transcribed. Returns (dz, dy, hipRotX, kneeRotX)."""
    reach = 0.34 if swimming else 0.26
    lift = 0.05 if swimming else 0.13
    swing = math.sin(ph * math.pi * 2)
    up = max(0.0, math.sin(ph * math.pi * 2)) * (1.0 if moving else 0.25)
    k = 1.0 if moving else 0.3
    return (swing * reach * k, up * lift, -swing * 0.5 * k, up * 0.7)


def build(gait=0.0, mouth=0.04, swimming=False, moving=True, bob=0.0):
    """One hippo, posed. Mirrors makeHippo() + animateHippo() exactly."""
    out = []
    root = TF()

    # ---- BARREL BODY (body group sits at y = 1.02) ----
    body_y = 1.02 + (math.sin(bob * 0.9) * 0.05 if swimming else 0.0)
    body_rz = (math.sin(bob * 1.1) * 0.03 if swimming
               else math.sin(gait * math.pi * 2) * 0.05 * (1.0 if moving else 0.2))
    body = TF((0, body_y, 0), (0, 0, body_rz))
    sphere([root, body], 1.02, HIDE, out, scale=(1.0, 0.82, 1.62), rings=7, segs=10)
    sphere([root, body, TF((0, -0.30, 0))], 0.84, BELLY, out,
           scale=(1.0, 0.55, 1.45), rings=6, segs=8)

    # ---- HEAD (head group at 0, 0.10, 1.62 inside body) ----
    head = TF((0, 0.10, 1.62))
    hs = [root, body, head]
    box(hs, 0.98, 0.72, 0.92, HIDE, out)                       # skull
    # ⚠ the muzzle FLARES wider than the skull (1.34 vs 0.98) — the hippo's signature
    box(hs + [TF((0, -0.06, 0.74))], 1.34, 0.38, 0.86, HIDE, out)   # upper jaw
    sphere(hs + [TF((0, 0.02, 1.02))], 0.30, BELLY, out,
           scale=(2.10, 0.42, 1.35), rings=6, segs=8)               # fleshy lip roll

    # ---- THE JAW PIVOT — hinged at the BACK of the mouth, not sliding down ----
    jaw = TF((0, -0.22, 0.32), (mouth * 1.15, 0, 0))
    js = hs + [jaw]
    box(js + [TF((0, -0.10, 0.44))], 1.22, 0.32, 0.88, HIDE, out)   # lower jaw
    box(js + [TF((0, 0.05, 0.44))], 1.10, 0.18, 0.76, MOUTH, out)   # gums
    # ---- 🦷 THE CURVED LOWER CANINES, as a three-segment tapered chain ----
    # ⚠ A cone cannot curve, so each tusk is three nested segments, each angled a little
    # further back than the last — the same scene-graph trick the crocodile's tail wave
    # uses. THE POINT OF THIS SHEET is that the tips must clear the CLOSED lip line: a
    # hippo standing with its mouth shut still shows two pale spikes against the grey.
    for s in (-1, 1):
        # ⚠ NOT named `root` — that shadowed the scene root TF and turned it into a list,
        # which crashed the leg loop further down with a bare AttributeError.
        tuskBase = js + [TF((s*0.42, 0.06, 0.66), (-0.62, 0, s*0.20))]
        a = tuskBase
        cyl(a + [TF((0, 0.15, 0))], 0.082, 0.115, 0.30, IVORY, out)
        b = a + [TF((0, 0.30, 0), (-0.34, 0, 0))]
        cyl(b + [TF((0, 0.13, 0))], 0.052, 0.082, 0.26, IVORY, out)
        c = b + [TF((0, 0.26, 0), (-0.38, 0, 0))]
        cyl(c + [TF((0, 0.11, 0))], 0.012, 0.052, 0.22, IVORY, out)
        cone(js + [TF((s*0.17, 0.14, 0.80), (-0.34, 0, 0))], 0.055, 0.28, 5, IVORY, out)

    # ---- eyes / ears / nostrils, all riding HIGH on the skull ----
    for s in (-1, 1):
        sphere(hs + [TF((s*0.30, 0.40, 0.24))], 0.085, DARK, out, rings=5, segs=6)
        sphere(hs + [TF((s*0.36, 0.44, -0.22))], 0.11, HIDE, out,
               scale=(0.7, 1.0, 0.55), rings=5, segs=6)
        sphere(hs + [TF((s*0.17, 0.14, 1.06))], 0.075, DARK, out, rings=5, segs=6)

    # ---- LEGS ----
    for i in range(4):
        side = 1 if (i % 2) else -1
        front = i < 2
        lz = 0.74 if front else -0.76
        rest_y = 0.62
        diag = 0.0 if (i == 0 or i == 3) else 0.5
        ph = ((gait + diag) % 1 + 1) % 1
        dz, dy, hip_rx, knee_rx = leg_pose(ph, moving, swimming)
        hip = TF((side*0.62, rest_y + dy, lz + dz), (hip_rx, 0, 0))
        hs_leg = [root, hip]
        cyl(hs_leg + [TF((0, -0.21, 0))], 0.24, 0.21, 0.42, HIDE, out)
        knee = TF((0, -0.42, 0), (knee_rx, 0, 0))
        ks = hs_leg + [knee]
        cyl(ks + [TF((0, -0.15, 0))], 0.20, 0.19, 0.30, HIDE, out)
        cyl(ks + [TF((0, -0.34, 0))], 0.235, 0.235, 0.12, DARK, out, seg=7)

    cyl([root, TF((0, 1.10, -1.62), (0.5, 0, 0))], 0.07, 0.04, 0.34, HIDE, out)
    return out


def water_plane(y, out, half=4.0, step=0.4):
    """The pond surface at height y, as a GRID of small quads.

    ⚠ TILED, NOT ONE BIG QUAD, and the first version was one big quad — which rendered a
    hippo that looked exactly the same in the water as on land, i.e. it verified nothing.
    `render()` is a painter's algorithm: it sorts whole polygons by their mean depth, so a
    single 8x8 slab that the animal is standing THROUGH has one depth for the entire
    surface and is drawn either wholly in front of the hippo or wholly behind it. Neither
    is a waterline. Small tiles each sort on their own and interleave with the body, which
    is what actually draws a surface the animal is half-submerged in.
    """
    n = int(2*half/step)
    for i in range(n):
        for j in range(n):
            x0, z0 = -half + i*step, -half + j*step
            x1, z1 = x0 + step, z0 + step
            out.append(([(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)], WATER))


# ---------------------------------------------------------------- sheets
def hero_sheet(path):
    """Land silhouette, the CLOSED-MOUTH head close-up, the gape, and the waterline.

    ⚠ The close-up exists because the first version of this sheet could not answer its own
    question. It claimed "the tusks must show even closed" and then rendered the animal at
    5 m on a three-quarter rear view, where the muzzle occludes them and the tips are three
    pale pixels. A check you cannot read is not a check — same lesson as the untiled water.
    """
    PW, PH = 380, 290
    sheet = Image.new('RGB', (PW*4, PH), (24, 27, 22))

    # 1. on land, mouth shut, mid-stride
    polys = build(gait=0.18, mouth=0.04, swimming=False, moving=True)
    img = render(polys, PW, PH, (5.4, 2.3, 4.6), (0, 1.0, 0), fov=40)
    label(img, 'ON LAND  mouth SHUT, mid-stride', 'the tusks must show even closed — that is the whole ask')
    sheet.paste(img, (0, 0))

    # 2. HEAD CLOSE-UP, MOUTH SHUT — the panel that actually answers the question
    polys = build(gait=0.0, mouth=0.04, swimming=False, moving=False)
    img = render(polys, PW, PH, (2.5, 1.9, 3.6), (0, 1.05, 1.5), fov=34)
    label(img, 'HEAD CLOSE-UP  mouth shut', 'two pale canines clearing the lip line = the ask')
    sheet.paste(img, (PW, 0))

    # 3. THE GAPE — what a charging hippo shows you
    polys = build(gait=0.5, mouth=1.0, swimming=False, moving=True)
    img = render(polys, PW, PH, (1.2, 1.9, 5.6), (0, 1.1, 0.9), fov=42)
    label(img, 'THE GAPE  mouth=1.0 (CHARGE)', 'curved canines rake up and out of the lower jaw')
    sheet.paste(img, (PW*2, 0))

    # 3. THE PERISCOPE — floating at the surface, which is what swimming looks like
    polys = build(gait=0.3, mouth=0.04, swimming=True, moving=True, bob=1.4)
    # hippoFloat pins the body HIPPO.FLOAT_DEPTH below the surface, so in model space the
    # waterline sits at y = +FLOAT_DEPTH. ⚠ THIS SHEET IS WHERE THAT NUMBER CAME FROM: at
    # the original 0.86 the barrel and the entire head stood clear of the line and the
    # hippo read as WADING, not swimming. 1.30 is the value measured off this render.
    FLOAT_DEPTH = 1.30
    water_plane(FLOAT_DEPTH, polys)
    img = render(polys, PW, PH, (3.4, 1.5, 4.4), (0, 0.95, 0.4), fov=40)
    label(img, 'IN THE WATER  body pinned %.2f under' % FLOAT_DEPTH, 'eyes / ears / nostrils clear the line, nothing else')
    sheet.paste(img, (PW*3, 0))

    sheet.save(path)
    return path


def gait_sheet(path):
    """Six frames of the leg cycle, top-down — the barrel hides the legs from the side."""
    PW, PH = 300, 230
    sheet = Image.new('RGB', (PW*3, PH*2), (24, 27, 22))
    for i in range(6):
        g = i / 6.0
        polys = build(gait=g, mouth=0.04, swimming=False, moving=True)
        img = render(polys, PW, PH, (0.05, 6.4, 0.6), (0, 0.7, 0), fov=40)
        label(img, 'gait %.2f' % g, 'diagonal pairs (FL+BR, FR+BL)')
        sheet.paste(img, (PW*(i % 3), PH*(i//3)))
    sheet.save(path)
    return path


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    print(hero_sheet(os.path.join(here, 'hippo_render.png')))
    print(gait_sheet(os.path.join(here, 'hippo_gait.png')))
