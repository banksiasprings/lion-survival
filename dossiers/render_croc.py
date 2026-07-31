#!/usr/bin/env python3
"""Offline render of the CROCODILE — mesh, swimming tail wave, and the four-phase
land walk — by rebuilding makeCrocodile()'s exact geometry and replaying
crocAnimate()'s exact gait maths with the same painter's rasteriser the other
creature dossiers use.

Why offline: the in-app WebGL pane composites blank to a headless driver (it
returns all-zero pixels including alpha while renderer.info still reports a full
draw list), so a screenshot of the running game is not obtainable here. Same
approach, and same reason, as render_cobra.py.

⚠ Shading model matches the app: renderer.outputEncoding is sRGBEncoding while
colours go in un-decoded, so the framebuffer is gamma-lifted on the way out and
everything renders ~2x lighter than its literal hex. Reproduced in shade().

⚠ This mirrors index.html by hand. If makeCrocodile() or crocAnimate() change,
this file must change with them — it is a dossier illustration, not a test.
The gait constants below are transcribed verbatim from crocAnimate().
"""
import math
from PIL import Image, ImageDraw

# ---------------------------------------------------------------- vec / matrix
def rotx(v, a):
    c, s = math.cos(a), math.sin(a); x, y, z = v; return (x, y*c - z*s, y*s + z*c)
def roty(v, a):
    c, s = math.cos(a), math.sin(a); x, y, z = v; return (x*c + z*s, y, -x*s + z*c)
def rotz(v, a):
    c, s = math.cos(a), math.sin(a); x, y, z = v; return (x*c - y*s, x*s + y*c, z)
def add(a, b): return (a[0]+b[0], a[1]+b[1], a[2]+b[2])
def mul(a, k): return (a[0]*k, a[1]*k, a[2]*k)
def sub(a, b): return (a[0]-b[0], a[1]-b[1], a[2]-b[2])
def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
def norm(v):
    l = math.sqrt(sum(c*c for c in v)) or 1.0
    return (v[0]/l, v[1]/l, v[2]/l)

class TF:
    """A Three.js-style Object3D node: position, euler rotation, applied parent-first."""
    def __init__(self, pos=(0,0,0), rot=(0,0,0)):
        self.pos, self.rot = pos, rot
    def apply(self, v):
        x, y, z = self.rot
        if x: v = rotx(v, x)
        if y: v = roty(v, y)
        if z: v = rotz(v, z)
        return add(v, self.pos)

def chain(stack, v):
    """Apply a transform stack innermost-first, exactly like a scene-graph walk."""
    for t in reversed(stack):
        v = t.apply(v)
    return v

# ---------------------------------------------------------------- primitives
FACES = [(0,1,2,3),(4,5,6,7),(0,1,5,4),(2,3,7,6),(0,3,7,4),(1,2,6,5)]

def box(stack, w, h, d, colour, out):
    hx, hy, hz = w/2, h/2, d/2
    pts = [(-hx,-hy,hz),(-hx,hy,hz),(hx,hy,hz),(hx,-hy,hz),
           (-hx,-hy,-hz),(-hx,hy,-hz),(hx,hy,-hz),(hx,-hy,-hz)]
    wp = [chain(stack, p) for p in pts]
    for f in FACES:
        out.append(([wp[i] for i in f], colour))

def cone(stack, r, h, seg, colour, out):
    """ConeGeometry(r,h,seg) — apex at +h/2, base ring at -h/2, like Three.js."""
    apex = chain(stack, (0, h/2, 0))
    ring = [chain(stack, (math.cos(2*math.pi*i/seg)*r, -h/2, math.sin(2*math.pi*i/seg)*r))
            for i in range(seg)]
    for i in range(seg):
        out.append(([apex, ring[i], ring[(i+1) % seg]], colour))
    out.append((ring, colour))

def sphere(stack, r, colour, out, scale=(1,1,1), rings=6, segs=8):
    grid = []
    for i in range(rings+1):
        lat = math.pi * i / rings
        row = []
        for j in range(segs):
            lon = 2*math.pi*j/segs
            p = (math.sin(lat)*math.cos(lon)*r*scale[0],
                 math.cos(lat)*r*scale[1],
                 math.sin(lat)*math.sin(lon)*r*scale[2])
            row.append(chain(stack, p))
        grid.append(row)
    for i in range(rings):
        for j in range(segs):
            out.append(([grid[i][j], grid[i][(j+1) % segs],
                         grid[i+1][(j+1) % segs], grid[i+1][j]], colour))

# ---------------------------------------------------------------- palette
# transcribed from makeCrocodile()
DARK  = 0x232a1e
MID   = 0x39432c
MOSS  = 0x4a5433
BELLY = 0x8b8a66
TOOTH = 0xeee7d2
EYE   = 0xd4a92a
PUPIL = 0x0a0a06

# ---------------------------------------------------------------- the gait
# ⚠ verbatim from crocAnimate() — the four phases Steven described:
#   "a little bit up and then move the leg forward and then it goes down"
def leg_phase(ph):
    if ph < 0.35:
        k = ph/0.35
        return math.sin(k*math.pi*0.5)*0.11, k*0.05
    if ph < 0.5:
        k = (ph-0.35)/0.15
        return 0.11, 0.05 + k*0.23
    if ph < 0.6:
        k = (ph-0.5)/0.1
        return 0.11*(1-k), 0.28
    k = (ph-0.6)/0.4
    return 0.0, 0.28*(1-k) - 0.06*k

LEG_DEF = [(-0.5, 0.62, 1), (0.5, 0.62, -1), (-0.52, -0.95, 1), (0.52, -0.95, -1)]

def build(gait, bob, swimming, spd):
    """Rebuild the whole croc at one animation instant. Returns polys."""
    out = []
    # ---- tail wave (crocAnimate) ----
    normv = min(1.0, spd / 9.5)              # CROC.SPD_CHARGE
    if swimming:
        amp  = 0.12 + normv*0.5
        rate = 3.2 + normv*7.5
    else:
        amp  = 0.05 + normv*0.16
        rate = 2.2 + normv*3
    body_yaw = math.sin(bob*rate + 0.6) * amp * 0.16
    walking = (not swimming) and spd > 0.15
    if walking:
        body_roll = math.sin(gait*math.pi*2) * 0.055
        body_lift = abs(math.sin(gait*math.pi*2)) * 0.02
    else:
        body_roll = body_lift = 0.0

    root = TF()
    body = TF(pos=(0, body_lift, 0), rot=(0, body_yaw, body_roll))
    B = [root, body]

    # ---- torso slabs ----
    for (w, h, d, z, col, y) in [(1.02,0.50,0.9,0.55,DARK,0.36),
                                 (0.94,0.46,0.9,-0.30,DARK,0.35),
                                 (0.78,0.40,0.8,-1.05,MID,0.33),
                                 (0.98,0.17,2.5,-0.15,BELLY,0.12)]:
        box(B + [TF(pos=(0, y, z))], w, h, d, col, out)
    # mottle plates (deterministic stand-ins for the random ones in-engine)
    for i in range(9):
        mx = -0.30 + (i % 3) * 0.30
        mz = -1.30 + i * 0.26
        box(B + [TF(pos=(mx, 0.60, mz))], 0.22, 0.04, 0.24, MOSS, out)
    # ---- scutes ----
    for i in range(9):
        z = -1.4 + i*0.29
        for sx in (-0.26, 0.26):
            cone(B + [TF(pos=(sx, 0.60, z), rot=(0, math.pi/4, 0))], 0.095, 0.2, 4, MID, out)
        if i % 2 == 0:
            cone(B + [TF(pos=(0, 0.63, z), rot=(0, math.pi/4, 0))], 0.07, 0.14, 4, MID, out)

    # ---- head ----
    jaw_open = 0.5 if swimming and spd > 8 else 0.03
    H = [root, TF(pos=(0, 0.30, 1.05))]
    box(H + [TF(pos=(0,0,0.16))], 0.66, 0.30, 0.62, DARK, out)
    box(H + [TF(pos=(0,-0.02,0.92))], 0.40, 0.20, 0.92, DARK, out)
    box(H + [TF(pos=(0,-0.02,1.44))], 0.32, 0.16, 0.2, DARK, out)
    for nx in (-0.08, 0.08):
        sphere(H + [TF(pos=(nx,0.08,1.5))], 0.045, MID, out)
    J = H + [TF(pos=(0,-0.11,0.2), rot=(jaw_open,0,0))]
    box(J + [TF(pos=(0,0,0.6))], 0.38, 0.14, 1.14, BELLY, out)
    for i in range(9):
        z  = 0.34 + i*0.13
        sx = 0.15 if i % 2 else -0.15
        cone(H + [TF(pos=(sx,-0.12,z), rot=(math.pi,0,0))], 0.032, 0.12, 4, TOOTH, out)
        cone(J + [TF(pos=(-sx,0.07,z))], 0.03, 0.1, 4, TOOTH, out)
    for ex in (-0.2, 0.2):
        sphere(H + [TF(pos=(ex,0.15,0.02))], 0.115, DARK, out, scale=(1,0.8,1.1))
        sphere(H + [TF(pos=(ex,0.23,0.03))], 0.075, EYE, out)
        box(H + [TF(pos=(ex,0.28,0.055))], 0.018, 0.09, 0.05, PUPIL, out)

    # ---- tail: 5 nested segments, each lagging the last (the travelling wave) ----
    stack = [root, TF(pos=(0, 0.32, -1.4))]
    for i in range(5):
        w, h = 0.6 - i*0.1, 0.42 - i*0.06
        yaw = math.sin(bob*rate - i*0.85) * amp * (0.45 + i*0.22)
        stack = stack + [TF(pos=(0, 0, 0 if i == 0 else -0.42), rot=(0, yaw, 0))]
        box(stack + [TF(pos=(0,0,-0.21))], w, h, 0.46, DARK if i < 2 else MID, out)
        if i < 2:
            for cx in (-0.11, 0.11):
                cone(stack + [TF(pos=(cx, h*0.5+0.07, -0.21))], 0.07, 0.22, 4, MID, out)
        else:
            cone(stack + [TF(pos=(0, h*0.5+0.09, -0.21))], 0.06, 0.26, 4, MID, out)

    # ---- legs: four-phase gait, diagonal pairs ----
    for idx, (lx, lz, side) in enumerate(LEG_DEF):
        diag = 0.0 if idx in (0, 3) else 0.5
        if walking:
            ph = ((gait + diag) % 1 + 1) % 1
            lift, fwd = leg_phase(ph)
        else:
            lift, fwd = 0.0, 0.0
        hip = TF(pos=(lx, 0.30 + lift, lz + fwd), rot=(-fwd*0.9, 0, 0))
        Hs  = [root, hip]
        box(Hs + [TF(pos=(side*0.13,-0.06,0), rot=(0,0,side*0.55))], 0.17, 0.15, 0.17, MID, out)
        knee_rot = (lift*2.6 if walking else (0.5 if swimming else 0.0))
        K = Hs + [TF(pos=(side*0.26,-0.13,0), rot=(knee_rot,0,0))]
        box(K + [TF(pos=(0,-0.09,0))], 0.13, 0.2, 0.13, MID, out)
        box(K + [TF(pos=(side*0.03,-0.2,0.03))], 0.22, 0.07, 0.26, MID, out)
        for t in range(3):
            cone(K + [TF(pos=(side*0.03+(t-1)*0.07, -0.22, 0.17), rot=(-math.pi/2.2,0,0))],
                 0.028, 0.09, 4, BELLY, out)
    return out

# ---------------------------------------------------------------- rasteriser
LIGHT = norm((-0.45, 0.82, 0.35))

def shade(colour, n):
    """Lambert + ambient, then the sRGB lift the app's framebuffer applies."""
    lam = max(0.0, n[0]*LIGHT[0] + n[1]*LIGHT[1] + n[2]*LIGHT[2])
    k = 0.34 + 0.66*lam
    r = ((colour >> 16) & 255)/255.0
    g = ((colour >> 8) & 255)/255.0
    b = (colour & 255)/255.0
    # sRGB encode — this is why everything reads ~2x lighter than its hex
    enc = lambda c: (1.055 * (max(0.0, min(1.0, c*k)) ** (1/2.4)) - 0.055) if c*k > 0.0031308 else 12.92*c*k
    return (int(max(0,min(1,enc(r)))*255), int(max(0,min(1,enc(g)))*255), int(max(0,min(1,enc(b)))*255))

def ground_grid(z0=-3.2, z1=3.2, x0=-1.6, x1=1.6, step=0.4, y=0.0, colour=0x2f3a24):
    """A flat reference plane at y=0. Without it a raised foot and a planted foot
    look identical, which defeats the whole point of the walk sheet."""
    out = []
    z = z0
    while z < z1:
        x = x0
        while x < x1:
            out.append(([(x,y,z),(x+step,y,z),(x+step,y,z+step),(x,y,z+step)],
                        colour if (int(x/step)+int(z/step)) % 2 else 0x364227))
            x += step
        z += step
    return out

def render(polys, W, H, cam, target, fov=42.0, scale=1.0):
    img = Image.new('RGB', (W, H), (24, 27, 22))
    dr = ImageDraw.Draw(img)
    fwd = norm(sub(target, cam))
    # ⚠ a perfectly vertical camera makes cross(fwd, world-up) a zero vector and the
    # whole frame collapses to a dot. Fall back to a different reference axis.
    ref = (0, 1, 0) if abs(fwd[1]) < 0.985 else (0, 0, 1)
    right = norm(cross(fwd, ref))
    up = cross(right, fwd)
    f = (H/2) / math.tan(math.radians(fov)/2) * scale
    drawn = []
    for pts, colour in polys:
        vs = []
        ok = True
        for p in pts:
            d = sub(p, cam)
            z = d[0]*fwd[0] + d[1]*fwd[1] + d[2]*fwd[2]
            if z < 0.05:
                ok = False; break
            x = d[0]*right[0] + d[1]*right[1] + d[2]*right[2]
            y = d[0]*up[0] + d[1]*up[1] + d[2]*up[2]
            vs.append((W/2 + f*x/z, H/2 - f*y/z, z))
        if not ok or len(vs) < 3:
            continue
        n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])))
        depth = sum(v[2] for v in vs)/len(vs)
        drawn.append((depth, [(v[0], v[1]) for v in vs], shade(colour, n)))
    drawn.sort(key=lambda t: -t[0])          # painter's algorithm, far to near
    for _, pl, col in drawn:
        dr.polygon(pl, fill=col)
    return img

def label(img, text, sub=None):
    dr = ImageDraw.Draw(img)
    dr.text((10, 8), text, fill=(235, 232, 214))
    if sub:
        dr.text((10, 22), sub, fill=(150, 158, 132))
    return img

# ---------------------------------------------------------------- sheets
def walk_sheet(path):
    """Six frames across one gait cycle, side-on, so lift/swing/plant/stance read."""
    PW, PH = 340, 250
    sheet = Image.new('RGB', (PW*3, PH*2), (24, 27, 22))
    names = ['lift', 'lift/swing', 'swing', 'plant', 'stance', 'stance']
    # ⚠ TOP-DOWN. A crocodile is genuinely low-slung with short splayed legs, so from
    # the side the belly hides them no matter where the camera goes. From above, each
    # foot's forward/back stride is unmistakable — and so is the DIAGONAL pairing
    # (front-left + back-right swing together, then the other pair).
    for i in range(6):
        g = i/6.0
        polys = ground_grid() + build(gait=g, bob=i*0.35, swimming=False, spd=2.2)
        # low 3/4: the only angle where short splayed legs clear the belly line
        im = render(polys, PW, PH, cam=(4.2, 2.2, 4.2), target=(0, 0.25, -0.4), scale=1.35)
        label(im, f'walk {i+1}/6', f'phase {g:.2f} — {names[i]}')
        sheet.paste(im, ((i % 3)*PW, (i//3)*PH))
    sheet.save(path)
    return path

def swim_sheet(path):
    """Four frames of the tail wave — amplitude and rate both scale with speed."""
    PW, PH = 340, 240
    sheet = Image.new('RGB', (PW*4, PH), (24, 27, 22))
    for i in range(4):
        polys = build(gait=0, bob=i*0.55, swimming=True, spd=6.0)
        # steep 3/4 from above — the travelling wave down the 5 tail segments is
        # only legible when you can see the tail's lateral swing
        im = render(polys, PW, PH, cam=(2.2, 4.6, 4.4), target=(0, 0.28, -0.7), scale=1.15)
        label(im, f'swim {i+1}/4', 'tail wave')
        sheet.paste(im, (i*PW, 0))
    sheet.save(path)
    return path

def hero_sheet(path):
    """Three views of the static mesh so the silhouette can be judged."""
    PW, PH = 400, 300
    sheet = Image.new('RGB', (PW*3, PH), (24, 27, 22))
    views = [
        ('side',        (6.0, 0.9, 0.0),   (0, 0.30, -0.2), 1.30),
        ('low 3/4',     (4.2, 2.2, 4.2),   (0, 0.25, -0.4), 1.35),
        ('from above',  (2.2, 5.0, 4.6),   (0, 0.28, -0.7), 1.15),
    ]
    for i, (nm, cam, tgt, sc) in enumerate(views):
        polys = ground_grid() + build(gait=0.18, bob=0.6, swimming=False, spd=2.2)
        im = render(polys, PW, PH, cam=cam, target=tgt, scale=sc)
        label(im, f'crocodile — {nm}', 'makeCrocodile() rebuilt offline')
        sheet.paste(im, (i*PW, 0))
    sheet.save(path)
    return path

def gait_trace(path):
    """Plot the real foot trajectory straight out of leg_phase(), so the shape Steven
    asked for is provable rather than asserted: up first, THEN forward, then down,
    then dragging back through stance."""
    W, H = 660, 300
    img = Image.new('RGB', (W, H), (24, 27, 22))
    dr = ImageDraw.Draw(img)
    ox, oy, sx, sy = 70, 210, 470, 620
    dr.line([(ox, oy), (ox+sx, oy)], fill=(90, 98, 78))            # ground
    dr.line([(ox, oy), (ox, oy-150)], fill=(90, 98, 78))           # lift axis
    dr.text((ox-56, oy-8), 'ground', fill=(150,158,132))
    dr.text((ox-40, oy-150), 'lift', fill=(150,158,132))
    dr.text((ox+sx-70, oy+12), 'forward →', fill=(150,158,132))
    dr.text((10, 10), 'FOOT PATH — one full stride, from leg_phase()', fill=(235,232,214))
    dr.text((10, 26), 'up first, then forward, then plant, then drag back', fill=(150,158,132))
    pts = []
    for i in range(241):
        ph = i/240.0
        lift, fwd = leg_phase(ph)
        pts.append((ox + fwd*sx*3.0, oy - lift*sy))
    dr.line(pts, fill=(212, 169, 42), width=3)
    # phase boundary markers
    for ph, nm in [(0.0,'lift'), (0.35,'swing'), (0.5,'plant'), (0.6,'stance')]:
        lift, fwd = leg_phase(min(ph, 0.999))
        x, y = ox + fwd*sx*3.0, oy - lift*sy
        dr.ellipse([x-4, y-4, x+4, y+4], fill=(238, 231, 210))
        dr.text((x-12, y-22), nm, fill=(238,231,210))
    img.save(path)
    return path

if __name__ == '__main__':
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    print(hero_sheet(os.path.join(here, 'croc_render.png')))
    print(walk_sheet(os.path.join(here, 'croc_walk.png')))
    print(swim_sheet(os.path.join(here, 'croc_swim.png')))
    print(gait_trace(os.path.join(here, 'croc_gait.png')))
