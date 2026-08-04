#!/usr/bin/env python3
"""Offline render of the CRESTED PORCUPINE ("spike-back") — the calm silhouette
next to the bristled one, plus a top-down of the quill field.

Why offline: the in-app Browser pane's WebGL compositor returns an all-black
frame for this page while renderer.info still reports a full draw list (~3600
calls), so a screenshot of the running game is not obtainable. Same reason and
same approach as render_cobra.py / render_croc.py / render_birds.py.

⚠ The rasteriser, the vector helpers and the sRGB-matched shader are IMPORTED
from render_croc.py rather than copied. There is one projector in this folder and
this file is a scene for it — a second copy would drift.

⚠ This mirrors makePorcupine() / animatePorc() in index.html by hand. If either
changes, this file must change with it: it is a dossier illustration, not a test.
The quill layout constants below are transcribed verbatim from makePorcupine().
"""
import math, os, sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_croc import TF, sphere, cone, render, shade   # noqa: E402

# ---------------------------------------------------------------- palette
# transcribed from makePorcupine()
HIDE  = 0x3a2f26     # coarse dark brown pelt
BELLY = 0x5a4c3e
DARK  = 0x120e0a     # eyes / nose
QUILA = 0xe8dfc6     # banded quills — pale…
QUILB = 0x14100c     # …and near-black

SCALE = 0.88         # g.scale.setScalar(0.88) — "~a wild dog"


def quill_defs():
    """Every quill as (px, py, pz, len, rad, lean, mat) — verbatim from makePorcupine().

    ⚠ The engine jitters each back-field quill's length by Math.random()*0.08. This
    sheet uses a deterministic mid-value so two runs are diffable; the shipped animal
    is very slightly more ragged, which is the intent there and noise here.
    """
    qs = []
    # long neck/shoulder CREST — the "crested" in crested porcupine
    for i in range(7):
        t = i / 6.0
        sx = (1 if i % 2 else -1) * 0.055 * (1 - t)
        qs.append((sx, 0.66 - 0.02 * i, 0.74 - t * 0.42,
                   0.62 - t * 0.10, 0.030, 0.95, QUILA if i % 2 else QUILB))
    # the back-and-rump field — five rows, longest over the hips
    for row in range(5):
        z = 0.34 - row * 0.30
        n = 4 + (2 if 0 < row < 4 else 0)
        for i in range(n):
            sx = (i - (n - 1) / 2.0) * 0.155
            ln = 0.34 + row * 0.10 + 0.04          # deterministic stand-in for the jitter
            qs.append((sx * 0.95, 0.72 - abs(sx) * 0.30, z, ln, 0.028,
                       0.78 - row * 0.06, QUILA if (row + i) % 2 else QUILB))
    # rattle quills on the stub tail
    for i in range(5):
        qs.append(((i - 2) * 0.075, 0.52, -0.86, 0.30, 0.036, 1.25,
                   QUILA if i % 2 else QUILB))
    return qs


QUILLS = quill_defs()


def build(bristle, leg_phase=0.0):
    """Rebuild the whole porcupine at one animation instant. Returns polys.

    `bristle` is animatePorc's 0..1 flare: each pivot lerps restX -> upX, where
    upX = lean*0.18. At 0 the quills lie swept back along the spine; at 1 they
    stand nearly upright, which is the entire visual tell that you provoked it.
    """
    out = []
    root = TF(pos=(0, 0, 0))
    S = TF(pos=(0, 0, 0))          # the group scale is applied at render time
    B = [root, S]

    def sph(r, col, px, py, pz, sc=(1, 1, 1)):
        sphere(B + [TF(pos=(px, py, pz))], r, col, out, scale=sc)

    # body — a wedge that widens toward the rump
    sph(0.42, HIDE,  0, 0.46,  0.30, (1.00, 0.92, 1.15))   # shoulders
    sph(0.50, HIDE,  0, 0.50, -0.34, (1.18, 1.00, 1.20))   # haunches
    sph(0.40, BELLY, 0, 0.30, -0.02, (1.05, 0.55, 1.55))   # pale underside
    # head
    sph(0.26, HIDE,  0, 0.48,  0.86, (1.00, 0.90, 1.05))
    sph(0.15, BELLY, 0, 0.42,  1.12, (0.90, 0.80, 1.10))   # muzzle
    sph(0.055, DARK, 0, 0.44,  1.26)                        # nose
    sph(0.045, DARK, -0.11, 0.57, 1.02)
    sph(0.045, DARK,  0.11, 0.57, 1.02)
    # stubby legs (cylinders stood in for by narrow cones — the gait is a 0.05 bob)
    for lx, lz in ((-0.24, 0.34), (0.24, 0.34), (-0.28, -0.42), (0.28, -0.42)):
        bob = math.sin(leg_phase + (lx + lz)) * 0.05
        cone(B + [TF(pos=(lx, 0.19 + bob, lz), rot=(math.pi, 0, 0))],
             0.085, 0.38, 6, HIDE, out)

    # ⚠ THE SPIKES. Pivot at the skin, cone grown upward out of it, pitch lerped.
    for (px, py, pz, ln, rad, lean, mat) in QUILLS:
        # ⚠ negated, exactly as in makePorcupine: +rotation.x tips toward +Z, and +Z
        # is the nose. Unsigned, every quill lies forward over the animal's face.
        rest_x, up_x = -lean, -lean * 0.18
        rx = rest_x + (up_x - rest_x) * bristle
        pivot = TF(pos=(px, py, pz), rot=(rx, 0, 0))
        cone(B + [pivot, TF(pos=(0, ln * 0.5, 0))], rad, ln, 5, mat, out)
    return out


def scaled(polys, k=SCALE):
    return [([tuple(c * k for c in p) for p in poly], col) for poly, col in polys]


def sheet(path):
    W, H = 1180, 470
    img = Image.new('RGB', (W, H), (24, 27, 22))
    dr = ImageDraw.Draw(img)
    panels = [
        ('CALM  (FORAGE)  bristle 0.0', 0.0, (2.15, 1.35, 2.55), (0, 0.55, 0)),
        ('BRISTLED  (BRISTLE)  bristle 1.0', 1.0, (2.15, 1.35, 2.55), (0, 0.55, 0)),
        ('BRISTLED — from above', 1.0, (0.05, 3.30, 0.15), (0, 0.45, -0.05)),
    ]
    pw = W // 3
    for i, (label, bristle, cam, tgt) in enumerate(panels):
        polys = scaled(build(bristle, leg_phase=0.8 * i))
        panel = render(polys, pw - 16, H - 60, cam, tgt, fov=40.0)
        img.paste(panel, (i * pw + 8, 44))
        dr.text((i * pw + 16, 20), label, fill=(235, 232, 214))
    dr.text((12, 4), 'CRESTED PORCUPINE ("spike-back") — makePorcupine() / animatePorc()',
            fill=(238, 231, 210))
    dr.text((W - 330, 6), 'quills: %d   meshes/animal: 50   scale %.2f'
            % (len(QUILLS), SCALE), fill=(150, 158, 132))
    img.save(path)
    return path


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    print(sheet(os.path.join(here, 'porcupine_render.png')))
