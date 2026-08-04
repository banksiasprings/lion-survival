#!/usr/bin/env python3
"""Offline render of the CRESTED PORCUPINE ("spike-back") — the calm silhouette next to
the bristled one, the rear view a back-charge actually gives you, and a head close-up.

Why offline: the in-app Browser pane hands this page a 0x0 canvas and a software WebGL
context, so `renderer.domElement.toDataURL()` returns "data:," and readPixels comes back
empty while renderer.info still reports a full ~4000-call draw list. A screenshot of the
running game is not obtainable here. Same reason and same approach as render_cobra.py /
render_croc.py / render_birds.py.

⚠ The rasteriser, the vector helpers and the sRGB-matched shader are IMPORTED from
render_croc.py rather than copied. There is one projector in this folder and this file is a
scene for it — a second copy would drift.

⚠ This mirrors makePorcupine() / animatePorc() in index.html by hand. If either changes,
this file must change with it: it is a dossier illustration, not a test. The body and quill
constants below are transcribed verbatim from makePorcupine().
"""
import math, os, sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_croc import TF, chain, box, sphere, render, shade   # noqa: E402

# ---------------------------------------------------------------- palette
# transcribed from makePorcupine()
HIDE  = 0x33291f     # coarse dark brown pelt
HIDEL = 0x463829     # sun-bleached over the barrel
BELLY = 0x574839
DARK  = 0x0e0b08     # eyes / nose / ears / feet
BAND  = 0xd8cdb4     # the pale throat collar
INC   = 0xd8a63c     # orange incisors

# QUILL_BANDS — the seven vertex-colour rings baked into the shared quill geometry. Flat runs
# are doubled up so each band spans a whole SEGMENT: a colour given a single ring just
# interpolates away into its neighbours.
QUILL_BANDS = [0x120f0b, 0x120f0b, 0xf0e6cc, 0xefe4c8, 0x171009, 0xf7f0dc, 0xf7f0dc]

SCALE = 0.88         # g.scale.setScalar(0.88) — "~a wild dog"
# ⚠ Counted from the body block in build() — 7 torso + 8 head + 2 incisors + 8 leg/foot. Kept
# as a named constant because the caption below quotes it, and a hardcoded total in a caption
# is exactly the copy that has rotted behind the code twice in this repo already.
BODY_MESHES = 25


def mix(a, b):
    """Mean of two packed colours — stands in for Gouraud interpolation between rings."""
    return ((((a >> 16 & 255) + (b >> 16 & 255)) // 2) << 16 |
            (((a >> 8 & 255) + (b >> 8 & 255)) // 2) << 8 |
            (((a & 255) + (b & 255)) // 2))


def cyl(stack, rt, rb, h, colour, out, seg=6):
    """CylinderGeometry(rt, rb, h, seg) — centred on the origin, like Three.js."""
    top = [chain(stack, (math.cos(2*math.pi*i/seg)*rt, h/2, math.sin(2*math.pi*i/seg)*rt))
           for i in range(seg)]
    bot = [chain(stack, (math.cos(2*math.pi*i/seg)*rb, -h/2, math.sin(2*math.pi*i/seg)*rb))
           for i in range(seg)]
    for i in range(seg):
        j = (i+1) % seg
        out.append(([bot[i], bot[j], top[j], top[i]], colour))
    out.append((top, colour))


def quill(stack, rad, length, out, seg=5):
    """The SHARED quill: one unit cone (base y=0, tip y=1) scaled (rad, length, rad).

    ⚠ In-engine the banding is a per-VERTEX colour attribute on five rings, Gouraud-
    interpolated up the shaft. Here each of the four bands takes the mean of its two ring
    colours, which is the same read at sheet resolution and keeps the painter's rasteriser
    (which is flat-shaded per polygon) honest about what the eye actually sees.
    """
    n = len(QUILL_BANDS) - 1                      # 6 segments between 7 rings
    rings = []
    for k in range(n+1):
        t = k/float(n)
        r, y = rad*(1-t), length*t
        rings.append([chain(stack, (math.cos(2*math.pi*i/seg)*r, y, math.sin(2*math.pi*i/seg)*r))
                      for i in range(seg)])
    for k in range(n):
        col = mix(QUILL_BANDS[k], QUILL_BANDS[k+1])
        lo, hi = rings[k], rings[k+1]
        for i in range(seg):
            j = (i+1) % seg
            out.append(([lo[i], lo[j], hi[j], hi[i]], col))


def quill_defs():
    """Every quill as (px, py, pz, len, rad, lean, splay) — verbatim from makePorcupine().

    ⚠ The engine jitters each back-field quill's length by rand(-0.03, 0.03). This sheet
    uses the un-jittered value so two runs are diffable; the shipped animal is very slightly
    more ragged, which is the intent there and noise here.
    """
    qs = []
    # the CREST — hair-like bristles, thinner and longer than the body quills
    for i in range(8):
        t = i/7.0
        qs.append((0, 0.50 + 0.12*t, 0.88 - t*0.60,
                   0.44 + math.sin(t*math.pi)*0.34, 0.019, 1.02 - 0.10*t, 0.0))
    for i in range(3):
        t = (i + 0.5)/3.0
        for s in (-1, 1):
            qs.append((s*0.085, 0.48 + 0.12*t, 0.82 - t*0.58,
                       0.38 + math.sin(t*math.pi)*0.24, 0.017, 1.00, s*0.30))
    # the BACK-AND-RUMP FIELD — arcs ACROSS the back, densest and longest over the hips
    for (z, y, n, ln, rad, lean, spread) in (
            (0.20, 0.76, 6, 0.42, 0.026, 0.98, 0.34),
            (-0.06, 0.82, 9, 0.52, 0.029, 0.94, 0.44),
            (-0.32, 0.85, 10, 0.62, 0.031, 0.90, 0.50),
            (-0.58, 0.85, 10, 0.64, 0.031, 0.92, 0.49),
            (-0.78, 0.74, 8, 0.56, 0.029, 0.98, 0.42)):
        for i in range(n):
            u = (i/(n-1))*2 - 1
            qs.append((u*spread, y - u*u*0.30, z,
                       ln*(1 - u*u*0.26), rad, lean - u*u*0.16, u*1.05))
    # rattle quills on the stub tail — short, fat, and what a real one shakes as a warning
    for i in range(7):
        u = (i/6.0)*2 - 1
        qs.append((u*0.16, 0.44 - u*u*0.05, -0.96, 0.22, 0.052, 1.15, u*1.05))
    return qs


QUILLS = quill_defs()


def build(bristle, leg_phase=0.0, sway=0.0):
    """Rebuild the whole porcupine at one animation instant. Returns polys.

    `bristle` is animatePorc's 0..1 flare. Each pivot lerps restX -> upX (pitch) AND
    restZ -> upZ (splay) together, so a provoked one does not merely tilt its quills, it
    SWELLS — measured in-engine at +19% taller and +32% wider across the quill tips.
    """
    out = []
    root = TF(rot=(0, 0, sway))    # animatePorc's idle weight-shift (roll only)
    B = [root]

    def sph(r, col, px, py, pz, sc=(1, 1, 1)):
        sphere(B + [TF(pos=(px, py, pz))], r, col, out, scale=sc)

    # ---- body: a WEDGE that climbs to its high point over the HIPS, not the shoulders
    sph(0.28, HIDE,  0, 0.42,  0.62, (1.00, 0.94, 1.10))   # neck / withers
    sph(0.36, HIDE,  0, 0.48,  0.28, (1.12, 1.00, 1.15))   # shoulder
    sph(0.42, HIDEL, 0, 0.52, -0.10, (1.20, 1.00, 1.20))   # barrel
    sph(0.46, HIDE,  0, 0.53, -0.48, (1.24, 1.00, 1.18))   # HIPS — widest and tallest
    sph(0.37, HIDE,  0, 0.45, -0.80, (1.10, 0.95, 1.00))   # rump falling to the tail
    sph(0.42, BELLY, 0, 0.30, -0.15, (1.05, 0.50, 1.70))   # pale underside
    sph(0.12, HIDE,  0, 0.40, -0.96, (0.90, 0.85, 0.90))   # stub tail

    # ---- head: small, blunt, pig-snouted, carried low
    sph(0.235, HIDE, 0, 0.455, 0.90,  (0.95, 0.88, 1.02))  # skull
    sph(0.155, HIDE, 0, 0.405, 1.10,  (0.86, 0.80, 1.05))  # muzzle
    sph(0.075, DARK, 0, 0.385, 1.2585, (1.25, 0.85, 0.75))  # nose pad — ⚠ sets hitR
    sph(0.032, DARK, -0.155, 0.505, 1.00)                   # eyes — small, dark, side-set
    sph(0.032, DARK,  0.155, 0.505, 1.00)
    sph(0.055, DARK, -0.175, 0.565, 0.855, (0.50, 1.00, 0.85))   # ear nubs
    sph(0.055, DARK,  0.175, 0.565, 0.855, (0.50, 1.00, 0.85))
    sph(0.24,  BAND, 0, 0.375, 0.66, (1.05, 0.40, 0.42))    # the pale THROAT COLLAR
    for ix in (-0.033, 0.033):
        box(B + [TF(pos=(ix, 0.352, 1.20))], 0.042, 0.058, 0.03, INC, out)

    # ---- legs: short, dark, with a flat foot pad. animatePorc bobs y and strides z.
    for i, (lx, lz) in enumerate(((-0.22, 0.42), (0.22, 0.42), (-0.26, -0.48), (0.26, -0.48))):
        ph = leg_phase + i*math.pi/2
        by, bz = 0.165 + math.sin(ph)*0.045, lz + math.cos(ph)*0.05
        cyl(B + [TF(pos=(lx, by, bz))], 0.10, 0.085, 0.32, DARK, out)
        sph(0.10, DARK, lx, 0.045, lz, (1.00, 0.50, 1.15))

    # ---- THE SPIKES. Pivot at the skin, shared unit cone scaled out of it.
    for (px, py, pz, ln, rad, lean, splay) in QUILLS:
        # ⚠ negated, exactly as in makePorcupine: +rotation.x tips toward +Z, and +Z is the
        # nose. Unsigned, every quill lies forward over the animal's face.
        rx = -lean + (-lean*0.16 - -lean)*bristle
        rz = -splay*0.45 + (-splay*1.15 - -splay*0.45)*bristle
        # ⚠ ROTATION ORDER. Three.js Euler 'XYZ' builds Rx·Ry·Rz, so the ROLL is applied
        # FIRST and the pitch then sweeps the already-splayed quill backwards. TF.apply does
        # x-then-y-then-z, so the two rotations must be NESTED (roll innermost) to agree —
        # a single TF(rot=(rx, 0, rz)) would compose them the other way round and the fan
        # would come out wrong.
        stack = B + [TF(pos=(px, py, pz), rot=(rx, 0, 0)), TF(rot=(0, 0, rz))]
        quill(stack, rad, ln, out)
    return out


def scaled(polys, k=SCALE):
    return [([tuple(c * k for c in p) for p in poly], col) for poly, col in polys]


def sheet(path):
    W, H, PH = 1240, 700, 320
    img = Image.new('RGB', (W, H), (24, 27, 22))
    dr = ImageDraw.Draw(img)
    panels = [
        # label,                        bristle, cam,                  target,          fov
        ('CALM  (FORAGE)  bristle 0.0',      0.0, (2.15, 1.15, 2.55), (0, 0.50, 0),    40),
        ('BRISTLED  (BRISTLE)  bristle 1.0', 1.0, (2.15, 1.15, 2.55), (0, 0.50, 0),    40),
        ('BRISTLED — from BEHIND, the back-charge view', 1.0, (0.0, 1.05, -3.05), (0, 0.52, -0.2), 38),
        ('CALM — head & throat collar',      0.0, (1.35, 0.95, 2.35), (0, 0.46, 0.75), 26),
    ]
    pw = W // 2
    for i, (label, bristle, cam, tgt, fov) in enumerate(panels):
        polys = scaled(build(bristle, leg_phase=0.8*i, sway=0.03 if bristle == 0 else 0.0))
        panel = render(polys, pw - 16, PH, cam, tgt, fov=fov)
        img.paste(panel, ((i % 2)*pw + 8, 44 + (i//2)*(PH + 30)))
        dr.text(((i % 2)*pw + 16, 24 + (i//2)*(PH + 30)), label, fill=(235, 232, 214))
    dr.text((12, 4), 'CRESTED PORCUPINE ("spike-back") — makePorcupine() / animatePorc()',
            fill=(238, 231, 210))
    dr.text((W - 440, 6), 'quills: %d   meshes/animal: %d   geometries: 26   scale %.2f'
            % (len(QUILLS), BODY_MESHES + len(QUILLS), SCALE), fill=(150, 158, 132))
    dr.text((12, H - 16),
            'bristling: quill tips +19%% taller, +32%% wider   ·   hitR held at 1.406 (unchanged)',
            fill=(150, 158, 132))
    img.save(path)
    return path


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    print(sheet(os.path.join(here, 'porcupine_render.png')))
