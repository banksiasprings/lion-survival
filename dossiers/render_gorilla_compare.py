#!/usr/bin/env python3
"""
Offline software render of the Lion-Survival gorilla mesh — BEFORE vs AFTER the
detail upgrade. The headless preview browser reports a WebGL2 context but has no
functional GL backend (a raw clear-to-red reads back [0,0,0,0]), so the live
three.js scene cannot be screenshotted here. This projects the *exact* box
geometry from makeGorilla() and the *exact* limb angles from animateGorilla()
with a tiny painter's-algorithm rasteriser, so the comparison is faithful to the
real code rather than a mock-up.
"""
import math
from PIL import Image, ImageDraw, ImageFont

# ---------- tiny vector helpers ----------
def rotx(v, a):
    c, s = math.cos(a), math.sin(a); x, y, z = v
    return (x, y*c - z*s, y*s + z*c)
def roty(v, a):
    c, s = math.cos(a), math.sin(a); x, y, z = v
    return (x*c + z*s, y, -x*s + z*c)
def rotz(v, a):
    c, s = math.cos(a), math.sin(a); x, y, z = v
    return (x*c - y*s, x*s + y*c, z)
def add(a, b): return (a[0]+b[0], a[1]+b[1], a[2]+b[2])
def mul(a, k): return (a[0]*k, a[1]*k, a[2]*k)

def hexrgb(h): return ((h>>16)&255, (h>>8)&255, h&255)

# Box -> 8 verts + 6 faces (each: 4 vert indices + local normal)
def box_faces(w, h, d, center):
    hx, hy, hz = w/2, h/2, d/2
    cx, cy, cz = center
    V = [(cx-hx,cy-hy,cz-hz),(cx+hx,cy-hy,cz-hz),(cx+hx,cy+hy,cz-hz),(cx-hx,cy+hy,cz-hz),
         (cx-hx,cy-hy,cz+hz),(cx+hx,cy-hy,cz+hz),(cx+hx,cy+hy,cz+hz),(cx-hx,cy+hy,cz+hz)]
    F = [([0,1,2,3],(0,0,-1)),([5,4,7,6],(0,0,1)),([4,0,3,7],(-1,0,0)),
         ([1,5,6,2],(1,0,0)),([3,2,6,7],(0,1,0)),([4,5,1,0],(0,-1,0))]
    return [( [V[i] for i in idx], n) for idx, n in F]

# ---------- model builders (mirror index.html exactly) ----------
FUR_N, BACK, CHEST, FACE_N, BROW_N, MUZ, DARK = 0x2b2b32,0x53535e,0x3a3a44,0x141418,0x303038,0x47403a,0x0c0c10
FUR_O, FACE_O, BROW_O = 0x2a2a30,0x16161a,0x3a3a42

def new_gorilla(pose):
    """Returns list of (faces, color). pose sets arm/leg pivot angles."""
    parts = []
    def stat(w,h,d,col,x,y,z): parts.append((box_faces(w,h,d,(x,y,z)), col))
    # core
    stat(1.28,0.95,1.08, FUR_N, 0,0.86,0.0)
    stat(1.62,1.45,1.20, FUR_N, 0,1.70,0.02)
    stat(1.85,0.62,1.18, FUR_N, 0,2.32,-0.04)
    stat(1.18,1.00,0.18, CHEST, 0,1.62,0.62)
    stat(1.30,0.70,0.95, BACK,  0,2.00,-0.32)
    # head
    stat(0.92,0.82,0.86, FACE_N, 0,2.60,0.32)
    stat(0.30,0.40,0.66, FACE_N, 0,3.05,0.20)
    stat(0.78,0.24,0.18, BROW_N, 0,2.70,0.78)
    stat(0.13,0.10,0.08, DARK,  -0.20,2.60,0.80)
    stat(0.13,0.10,0.08, DARK,   0.20,2.60,0.80)
    stat(0.56,0.46,0.40, MUZ,    0,2.40,0.84)
    stat(0.30,0.14,0.08, DARK,   0,2.34,1.06)
    stat(0.11,0.18,0.13, FACE_N,-0.50,2.66,0.30)
    stat(0.11,0.18,0.13, FACE_N, 0.50,2.66,0.30)
    # limbs: pivot at P, rotate child boxes (upper arm + hand)
    def limb(P, rx, rz, children):
        for (w,h,d,col,lc) in children:
            faces = box_faces(w,h,d,lc)         # in pivot-local space
            out = []
            for verts, n in faces:
                vv = [add(P, rotz(rotx(v, rx), rz)) for v in verts]
                nn = rotz(rotx(n, rx), rz)
                out.append((vv, nn))
            parts.append((out, col))
    for ax, (arx, arz) in ((-1.02, pose['armL']),(1.02, pose['armR'])):
        limb((ax,2.20,0.06), arx, arz, [   # rx, rz
              (0.52,1.90,0.52, FUR_N, (0,-0.95,0)),
              (0.50,0.34,0.62, DARK,  (0,-1.86,0.14))])
    for lx, (lrx, lrz) in ((-0.44, pose['legL']),(0.44, pose['legR'])):
        limb((lx,1.12,0.0), lrx, lrz, [
              (0.62,0.92,0.66, FUR_N, (0,-0.46,0)),
              (0.52,0.26,0.74, DARK,  (0,-0.92,0.16))])
    return parts, 1.32

def old_gorilla():
    parts = []
    def stat(w,h,d,col,x,y,z): parts.append((box_faces(w,h,d,(x,y,z)), col))
    stat(1.5,1.35,1.1, FUR_O, 0,1.55,0)
    stat(1.2,0.85,1.0, FUR_O, 0,0.8,0)
    stat(0.82,0.72,0.78, FACE_O, 0,2.4,0.12)
    stat(0.6,0.42,0.22, BROW_O, 0,2.36,0.5)
    # arms (center-pivot, slight swing as the old animateGorilla did)
    def carm(ax, rx):
        faces = box_faces(0.44,1.55,0.44,(0,0,0))
        P = (ax,1.15,0.12); out=[]
        for verts,n in faces:
            out.append(([add(P, rotx(v,rx)) for v in verts], rotx(n,rx)))
        parts.append((out, FUR_O))
    carm(-1.02, 0.22); carm(1.02, -0.22)
    stat(0.52,0.9,0.52, FUR_O, -0.46,0.45,0)
    stat(0.52,0.9,0.52, FUR_O,  0.46,0.45,0)
    return parts, 1.28

# ---------- poses (mirror animateGorilla math) ----------
def roam_pose(phase=0.9, g=0.9):
    amp = 0.35 + g*0.5
    a0 = -0.35 + math.sin(phase)*amp;       a1 = -0.35 + math.sin(phase+math.pi)*amp
    l0 = math.sin(phase)*amp*0.5;           l1 = math.sin(phase+math.pi)*amp*0.5
    return dict(armL=(a0,0.0), armR=(a1,0.0), legL=(l0,0.0), legR=(l1,0.0))
POSES = {
    'roaming':  roam_pose(),
    'perched':  dict(armL=(-0.55,0.0), armR=(-0.55,0.0), legL=(1.15,0.0), legR=(1.15,0.0)),
    'swiping':  dict(armL=(-1.27,-0.667), armR=(0.20,0.0), legL=(0.12,0.0), legR=(0.12,0.0)),
    'smashing': dict(armL=(-2.29,0.0), armR=(-2.29,0.0), legL=(0.10,0.0), legR=(0.10,0.0)),
    'treegrab': dict(armL=(-2.52,-0.14), armR=(-2.52,0.14), legL=(-0.12,0.0), legR=(-0.12,0.0)),
}

# ---------- rasteriser ----------
YAW, PITCH = -0.7, 0.20
LIGHT = (-0.40, 0.72, 0.60)
ll = math.sqrt(sum(c*c for c in LIGHT)); LIGHT = tuple(c/ll for c in LIGHT)

def project(parts, scale, panel_w, panel_h, ground=True):
    img = Image.new('RGB', (panel_w, panel_h), (216,201,168))   # SKY.day.hor #d8c9a8
    # subtle ground band
    d = ImageDraw.Draw(img, 'RGBA')
    d.rectangle([0, int(panel_h*0.62), panel_w, panel_h], fill=(150,140,110,255))
    # transform every face to view space
    tri = []
    allpts = []
    for faces, col in parts:
        for verts, n in faces:
            vv = []
            for v in verts:
                p = mul(v, scale)
                p = rotx(roty(p, YAW), PITCH)
                vv.append(p); allpts.append(p)
            nn = rotx(roty(n, YAW), PITCH)
            tri.append((vv, nn, col))
    xs = [p[0] for p in allpts]; ys = [p[1] for p in allpts]
    minx,maxx,miny,maxy = min(xs),max(xs),min(ys),max(ys)
    span = max(maxx-minx, maxy-miny)
    ppu = (min(panel_w,panel_h)*0.74)/span
    cx = panel_w/2 - (minx+maxx)/2*ppu
    cy = panel_h*0.56 + (miny+maxy)/2*ppu
    def scr(p): return (cx + p[0]*ppu, cy - p[1]*ppu)
    # ground shadow at model base
    base = rotx(roty(mul((0,0.05,0),scale),YAW),PITCH); bx,by = scr(base)
    d.ellipse([bx-ppu*1.5, by-ppu*0.4, bx+ppu*1.5, by+ppu*0.4], fill=(40,35,25,90))
    # painter's sort: far (small view-z) first
    tri.sort(key=lambda t: sum(p[2] for p in t[0])/len(t[0]))
    for vv, nn, col in tri:
        nl = math.sqrt(sum(c*c for c in nn)) or 1
        nu = tuple(c/nl for c in nn)
        sh = 0.30 + 0.70*max(0.0, sum(a*b for a,b in zip(nu, LIGHT)))
        r,g,b = hexrgb(col)
        fill = (int(r*sh), int(g*sh), int(b*sh))
        poly = [scr(p) for p in vv]
        edge = (max(0,fill[0]-18), max(0,fill[1]-18), max(0,fill[2]-18))
        d.polygon(poly, fill=fill, outline=edge)
    return img

# ---------- compose the sheet ----------
def font(sz):
    for p in ['/System/Library/Fonts/Helvetica.ttc','/System/Library/Fonts/Supplemental/Arial.ttf']:
        try: return ImageFont.truetype(p, sz)
        except: pass
    return ImageFont.load_default()

PW, PH = 470, 500
cells = [
    ('BEFORE  ·  roaming', old_gorilla(),                 None),
    ('AFTER  ·  roaming',  new_gorilla(POSES['roaming']),  None),
    ('AFTER  ·  perched',  new_gorilla(POSES['perched']),  None),
    ('AFTER  ·  swiping',  new_gorilla(POSES['swiping']),  None),
    ('AFTER  ·  smashing', new_gorilla(POSES['smashing']), None),
    ('AFTER  ·  tree-grab',new_gorilla(POSES['treegrab']), None),
]
cols, rows = 3, 2
title_h = 64
sheet = Image.new('RGB', (PW*cols, title_h + PH*rows), (28,28,32))
d = ImageDraw.Draw(sheet)
d.text((20,18), 'Lion Survival — gorilla render upgrade  (offline render of the actual mesh + animateGorilla poses)',
       font=font(22), fill=(241,196,15))
for i,(label,(parts,scale),_) in enumerate(cells):
    c, r = i%cols, i//cols
    panel = project(parts, scale, PW, PH)
    dd = ImageDraw.Draw(panel)
    tag = (231,76,60) if label.startswith('BEFORE') else (46,160,90)
    dd.rectangle([0,0,PW-1,PH-1], outline=(60,60,66), width=2)
    dd.rectangle([12,12,18+10,12+24], fill=tag)
    dd.text((30,12), label, font=font(20), fill=(255,255,255))
    sheet.paste(panel, (c*PW, title_h + r*PH))
out = '/Users/openclaw/Documents/lion-survival/dossiers/gorilla_render_upgrade.png'
sheet.save(out)
print('wrote', out, sheet.size)
