#!/usr/bin/env python3
"""
Offline software render of the Lion-Survival gorilla mesh — BEFORE (basic blob)
vs AFTER ("make it cool": bold V-taper silverback with emissive glowing eyes).
The headless preview browser reports a WebGL2 context with no functional GL
backend (a raw clear-to-red reads back [0,0,0,0]), so the live three.js scene
can't be screenshotted here. This projects the *exact* box geometry from
makeGorilla() and the *exact* limb angles + eye-glow values from
animateGorilla() with a tiny painter's-algorithm rasteriser plus additive eye
glow, so the comparison is faithful to the real code, not a mock-up.
"""
import math
from PIL import Image, ImageDraw, ImageFont, ImageChops

# ---------- vector helpers ----------
def rotx(v,a):
    c,s=math.cos(a),math.sin(a); x,y,z=v; return (x, y*c-z*s, y*s+z*c)
def roty(v,a):
    c,s=math.cos(a),math.sin(a); x,y,z=v; return (x*c+z*s, y, -x*s+z*c)
def rotz(v,a):
    c,s=math.cos(a),math.sin(a); x,y,z=v; return (x*c-y*s, x*s+y*c, z)
def add(a,b): return (a[0]+b[0],a[1]+b[1],a[2]+b[2])
def mul(a,k): return (a[0]*k,a[1]*k,a[2]*k)
def hexrgb(h): return ((h>>16)&255,(h>>8)&255,h&255)

def box_faces(w,h,d,center,rz=0.0):
    hx,hy,hz=w/2,h/2,d/2; cx,cy,cz=center
    V=[(-hx,-hy,-hz),(hx,-hy,-hz),(hx,hy,-hz),(-hx,hy,-hz),
       (-hx,-hy,hz),(hx,-hy,hz),(hx,hy,hz),(-hx,hy,hz)]
    F=[([0,1,2,3],(0,0,-1)),([5,4,7,6],(0,0,1)),([4,0,3,7],(-1,0,0)),
       ([1,5,6,2],(1,0,0)),([3,2,6,7],(0,1,0)),([4,5,1,0],(0,-1,0))]
    def place(p): return add((cx,cy,cz), rotz(p,rz) if rz else p)
    out=[]
    for idx,n in F:
        out.append(([place(V[i]) for i in idx], rotz(n,rz) if rz else n))
    return out

# ---------- palettes ----------
# NEW (cool) coat
FUR,FUR2,BACK,SHEEN,CHEST,FACE,BROW,MUZ,SCAR,DARK = (
    0x26262c,0x191920,0x6a6c7c,0x9aa0b2,0x3c3c48,0x0f0f13,0x2b2b34,0x4a4138,0x9a8e82,0x09090c)
# OLD (basic, pre-upgrade)
FUR_O,FACE_O,BROW_O = 0x2a2a30,0x16161a,0x3a3a42

EYE_LOCAL = [(-0.23,2.70,0.965),(0.23,2.70,0.965)]

def new_gorilla(pose):
    parts=[]
    def stat(w,h,d,col,x,y,z,rz=0.0): parts.append((box_faces(w,h,d,(x,y,z),rz), col))
    # core — V-taper
    stat(1.16,0.92,1.02, FUR2, 0,0.82,0.00)
    stat(1.70,1.52,1.28, FUR,  0,1.74,0.04)
    stat(2.12,0.72,1.34, FUR,  0,2.42,-0.04)
    stat(1.30,1.08,0.18, CHEST,0,1.66,0.68)
    stat(1.50,0.84,1.04, BACK, 0,2.12,-0.36)
    stat(1.28,0.18,0.92, SHEEN,0,2.58,-0.34)
    # head
    stat(0.98,0.88,0.92, FACE, 0,2.70,0.36)
    stat(0.36,0.54,0.78, FACE, 0,3.22,0.24)
    stat(0.88,0.30,0.22, BROW, 0,2.82,0.86)
    stat(0.18,0.13,0.10, DARK,-0.23,2.70,0.90)
    stat(0.18,0.13,0.10, DARK, 0.23,2.70,0.90)
    stat(0.62,0.52,0.46, MUZ,  0,2.50,0.96)
    stat(0.12,0.20,0.14, FACE,-0.56,2.78,0.34)
    stat(0.12,0.20,0.14, FACE, 0.56,2.78,0.34)
    stat(0.52,0.07,0.07, SCAR,-0.30,2.66,0.95,-0.7)   # battle scar
    # limbs
    def limb(P,rx,rz,children):
        for w,h,d,col,lc in children:
            faces=box_faces(w,h,d,lc); out=[]
            for verts,n in faces:
                out.append(([add(P,rotz(rotx(v,rx),rz)) for v in verts], rotz(rotx(n,rx),rz)))
            parts.append((out,col))
    for ax,(arx,arz) in ((-1.14,pose['armL']),(1.14,pose['armR'])):
        limb((ax,2.30,0.06),arx,arz,[(0.58,2.05,0.58,FUR2,(0,-1.02,0)),(0.60,0.40,0.72,DARK,(0,-2.02,0.16))])
    for lx,(lrx,lrz) in ((-0.46,pose['legL']),(0.46,pose['legR'])):
        limb((lx,1.10,0.0),lrx,lrz,[(0.68,0.98,0.72,FUR2,(0,-0.49,0)),(0.58,0.28,0.82,DARK,(0,-0.96,0.18))])
    return parts,1.36

def old_gorilla():
    parts=[]
    def stat(w,h,d,col,x,y,z): parts.append((box_faces(w,h,d,(x,y,z)),col))
    stat(1.5,1.35,1.1,FUR_O,0,1.55,0); stat(1.2,0.85,1.0,FUR_O,0,0.8,0)
    stat(0.82,0.72,0.78,FACE_O,0,2.4,0.12); stat(0.6,0.42,0.22,BROW_O,0,2.36,0.5)
    def carm(ax,rx):
        out=[]
        for verts,n in box_faces(0.44,1.55,0.44,(0,0,0)):
            P=(ax,1.15,0.12); out.append(([add(P,rotx(v,rx)) for v in verts],rotx(n,rx)))
        parts.append((out,FUR_O))
    carm(-1.02,0.22); carm(1.02,-0.22)
    stat(0.52,0.9,0.52,FUR_O,-0.46,0.45,0); stat(0.52,0.9,0.52,FUR_O,0.46,0.45,0)
    return parts,1.28

# ---------- poses (animateGorilla math) ----------
def roam_pose(phase=0.9,g=0.9):
    amp=0.35+g*0.5
    return dict(armL=(-0.35+math.sin(phase)*amp,0.0), armR=(-0.35+math.sin(phase+math.pi)*amp,0.0),
                legL=(math.sin(phase)*amp*0.5,0.0),   legR=(math.sin(phase+math.pi)*amp*0.5,0.0))
POSES={
 'roaming': roam_pose(),
 'perched': dict(armL=(-0.55,0),armR=(-0.55,0),legL=(1.15,0),legR=(1.15,0)),
 'swiping': dict(armL=(-1.27,-0.667),armR=(0.20,0),legL=(0.12,0),legR=(0.12,0)),
 'smashing':dict(armL=(-2.29,0),armR=(-2.29,0),legL=(0.10,0),legR=(0.10,0)),
 'treegrab':dict(armL=(-2.52,-0.14),armR=(-2.52,0.14),legL=(-0.12,0),legR=(-0.12,0)),
}
# eye glow per state: (rgb, intensity) — mirrors the verified emissive values
EYES={
 'roaming':((255,150,45),0.57),'perched':((255,176,70),0.95),
 'swiping':((255,95,32),0.85),'smashing':((255,72,20),0.95),'treegrab':((255,84,26),0.90),
}

YAW,PITCH=-0.7,0.20
LIGHT=(-0.40,0.72,0.60); _l=math.sqrt(sum(c*c for c in LIGHT)); LIGHT=tuple(c/_l for c in LIGHT)

def radial_glow(R,rgb,boost=1.0):
    img=Image.new('RGB',(2*R,2*R),(0,0,0)); d=img.load()
    for y in range(2*R):
        for x in range(2*R):
            dx,dy=(x-R)/R,(y-R)/R; r=math.hypot(dx,dy)
            if r>=1: continue
            f=(1-r)**2.2*boost
            d[x,y]=(min(255,int(rgb[0]*f)),min(255,int(rgb[1]*f)),min(255,int(rgb[2]*f)))
    return img

def project(parts,scale,W,H,night=False,eyes=None):
    if night:
        img=Image.new('RGB',(W,H),(20,22,34)); d=ImageDraw.Draw(img,'RGBA')
        d.rectangle([0,int(H*0.62),W,H],fill=(14,14,20,255))
    else:
        img=Image.new('RGB',(W,H),(216,201,168)); d=ImageDraw.Draw(img,'RGBA')
        d.rectangle([0,int(H*0.62),W,H],fill=(150,140,110,255))
    tri=[]; allpts=[]
    for faces,col in parts:
        for verts,n in faces:
            vv=[]
            for v in verts:
                p=rotx(roty(mul(v,scale),YAW),PITCH); vv.append(p); allpts.append(p)
            tri.append((vv,rotx(roty(n,YAW),PITCH),col))
    xs=[p[0] for p in allpts]; ys=[p[1] for p in allpts]
    span=max(max(xs)-min(xs),max(ys)-min(ys))
    ppu=(min(W,H)*0.72)/span
    cx=W/2-(min(xs)+max(xs))/2*ppu; cy=H*0.56+(min(ys)+max(ys))/2*ppu
    def scr(p): return (cx+p[0]*ppu, cy-p[1]*ppu)
    base=rotx(roty(mul((0,0.05,0),scale),YAW),PITCH); bx,by=scr(base)
    d.ellipse([bx-ppu*1.7,by-ppu*0.42,bx+ppu*1.7,by+ppu*0.42],fill=(0,0,0,110 if night else 90))
    tri.sort(key=lambda t:sum(p[2] for p in t[0])/len(t[0]))
    amb=0.22 if night else 0.30
    for vv,nn,col in tri:
        nl=math.sqrt(sum(c*c for c in nn)) or 1; nu=tuple(c/nl for c in nn)
        sh=amb+(1-amb)*max(0.0,sum(a*b for a,b in zip(nu,LIGHT)))
        r,g,b=hexrgb(col); fill=(int(r*sh),int(g*sh),int(b*sh))
        d.polygon([scr(p) for p in vv],fill=fill,outline=(max(0,fill[0]-16),max(0,fill[1]-16),max(0,fill[2]-16)))
    # additive eye glow on top — sized to the in-game halo so it reads as
    # burning eyes, not a head-torch (brighter/larger at night).
    if eyes:
        rgb,inten=eyes; R=int(ppu*(0.42+inten*0.55)*(1.25 if night else 1.0))
        glow=radial_glow(R,rgb,boost=0.5+inten*0.7)
        layer=Image.new('RGB',(W,H),(0,0,0))
        for ex,ey,ez in EYE_LOCAL:
            sx,sy=scr(rotx(roty(mul((ex,ey,ez),scale),YAW),PITCH))
            layer.paste(glow,(int(sx-R),int(sy-R)))
            d.ellipse([sx-ppu*0.06,sy-ppu*0.06,sx+ppu*0.06,sy+ppu*0.06],fill=(255,250,235))  # hot core
        img=ImageChops.add(img,layer)
    return img

def font(sz):
    for p in ['/System/Library/Fonts/Helvetica.ttc','/System/Library/Fonts/Supplemental/Arial.ttf']:
        try: return ImageFont.truetype(p,sz)
        except: pass
    return ImageFont.load_default()

PW,PH=470,500
cells=[
 ('BEFORE  ·  basic',      old_gorilla(),                 False, None),
 ('AFTER  ·  roaming (day)',new_gorilla(POSES['roaming']), False, EYES['roaming']),
 ('AFTER  ·  perched (night)',new_gorilla(POSES['perched']),True, EYES['perched']),
 ('AFTER  ·  swiping',      new_gorilla(POSES['swiping']), False, EYES['swiping']),
 ('AFTER  ·  smashing (night)',new_gorilla(POSES['smashing']),True,EYES['smashing']),
 ('AFTER  ·  tree-grab (night)',new_gorilla(POSES['treegrab']),True,EYES['treegrab']),
]
cols,rows=3,2; title_h=64
sheet=Image.new('RGB',(PW*cols,title_h+PH*rows),(20,20,24))
d=ImageDraw.Draw(sheet)
d.text((20,18),'Lion Survival — gorilla: "make it cool"  (offline render of the actual mesh + animateGorilla eye-glow)',
       font=font(21),fill=(241,196,15))
for i,(label,(parts,scale),night,eyes) in enumerate(cells):
    c,r=i%cols,i//cols
    panel=project(parts,scale,PW,PH,night=night,eyes=eyes)
    dd=ImageDraw.Draw(panel)
    tag=(231,76,60) if label.startswith('BEFORE') else (46,160,90)
    dd.rectangle([0,0,PW-1,PH-1],outline=(60,60,66),width=2)
    dd.rectangle([12,12,22,36],fill=tag)
    dd.text((30,12),label,font=font(19),fill=(255,255,255))
    sheet.paste(panel,(c*PW,title_h+r*PH))
out='/Users/openclaw/Documents/lion-survival/dossiers/gorilla_render_upgrade.png'
sheet.save(out)
print('wrote',out,sheet.size)
