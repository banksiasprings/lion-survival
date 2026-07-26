#!/usr/bin/env python3
"""Offline render of the BLACK COBRA — the third serpent variant — by projecting its
exact makeSnake(...,'cobra') geometry with the same painter's rasteriser the other
creature dossiers use. The in-app WebGL pane can't be screenshotted reliably from a
headless driver, so we rebuild the real mesh offline instead.

Three panels: hood FOLDED (cruising), hood FLARED (about to strike), and the whole
body in an S-curve so the blue belly strip and the slender taper read.
Mirrors index.html: snakeSegRadius() cobra branch, addSnakeSegment() belly box, and
the cobra head/hood block in makeSnake()."""
import math
from PIL import Image, ImageDraw, ImageFont

def rotx(v,a):
    c,s=math.cos(a),math.sin(a); x,y,z=v; return (x, y*c-z*s, y*s+z*c)
def roty(v,a):
    c,s=math.cos(a),math.sin(a); x,y,z=v; return (x*c+z*s, y, -x*s+z*c)
def rotz(v,a):
    c,s=math.cos(a),math.sin(a); x,y,z=v; return (x*c-y*s, x*s+y*c, z)
def add(a,b): return (a[0]+b[0],a[1]+b[1],a[2]+b[2])
def norm(v):
    l=math.sqrt(sum(c*c for c in v)) or 1; return (v[0]/l,v[1]/l,v[2]/l)
def hexrgb(h): return ((h>>16)&255,(h>>8)&255,h&255)

# ---- local primitives (faces in local space) ----
def box(w,h,d,col,cx=0,cy=0,cz=0):
    hx,hy,hz=w/2,h/2,d/2
    V=[(cx-hx,cy-hy,cz-hz),(cx+hx,cy-hy,cz-hz),(cx+hx,cy+hy,cz-hz),(cx-hx,cy+hy,cz-hz),
       (cx-hx,cy-hy,cz+hz),(cx+hx,cy-hy,cz+hz),(cx+hx,cy+hy,cz+hz),(cx-hx,cy+hy,cz+hz)]
    F=[([0,1,2,3],(0,0,-1)),([5,4,7,6],(0,0,1)),([4,0,3,7],(-1,0,0)),
       ([1,5,6,2],(1,0,0)),([3,2,6,7],(0,1,0)),([4,5,1,0],(0,-1,0))]
    return [([V[i] for i in idx],n,col) for idx,n in F]
def cone(r,h,seg,col,rx=0.0):
    f=[]; apex=(0,h/2,0); slope=r/h
    for i in range(seg):
        a0=2*math.pi*i/seg; a1=2*math.pi*(i+1)/seg; am=(a0+a1)/2
        b0=(r*math.cos(a0),-h/2,r*math.sin(a0)); b1=(r*math.cos(a1),-h/2,r*math.sin(a1))
        f.append(([apex,b1,b0], norm((math.cos(am),slope,math.sin(am))), col))
        f.append(([(0,-h/2,0),b0,b1],(0,-1,0),col))
    return [([rotx(v,rx) for v in vs], rotx(n,rx), c) for vs,n,c in f]
def cylZ(rt,rb,h,seg,col):
    """cylinder whose LENGTH lies along local +Z (== three's CylinderGeometry + rotateX(PI/2))"""
    f=[]
    for i in range(seg):
        a0=2*math.pi*i/seg; a1=2*math.pi*(i+1)/seg; am=(a0+a1)/2
        def P(r,z,a): return (r*math.cos(a), r*math.sin(a), z)
        b0=P(rb,-h/2,a0); b1=P(rb,-h/2,a1); t0=P(rt,h/2,a0); t1=P(rt,h/2,a1)
        nrm=(math.cos(am),math.sin(am),0)
        f.append(([b0,b1,t1,t0],nrm,col))
        f.append(([(0,0,h/2),t0,t1],(0,0,1),col)); f.append(([(0,0,-h/2),b1,b0],(0,0,-1),col))
    return f
def sph(r,col,seg=6):
    f=[]
    for i in range(seg):
        for j in range(seg):
            a0,a1=math.pi*i/seg,math.pi*(i+1)/seg
            b0,b1=2*math.pi*j/seg,2*math.pi*(j+1)/seg
            def P(a,b): return (r*math.sin(a)*math.cos(b), r*math.cos(a), r*math.sin(a)*math.sin(b))
            p=[P(a0,b0),P(a1,b0),P(a1,b1),P(a0,b1)]
            f.append((p, norm(P((a0+a1)/2,(b0+b1)/2)), col))
    return f
def place(faces, pos=(0,0,0), rx=0.0, ry=0.0, rz=0.0):
    """Local rotation X→Y→Z (three's default Euler 'XYZ'), then translate."""
    def T(v): return add(rotz(roty(rotx(v,rx),ry),rz), pos)
    def R(n): return rotz(roty(rotx(n,rx),ry),rz)
    return [([T(v) for v in vs], R(n), c) for vs,n,c in faces]
def scale(faces, sx,sy,sz):
    """Group scale — applied to child vertices AFTER their own local transform,
    exactly like a THREE.Group whose .scale is animated (the hood flare)."""
    inv=(1/sx,1/sy,1/sz)
    return [([(v[0]*sx,v[1]*sy,v[2]*sz) for v in vs],
             norm((n[0]*inv[0],n[1]*inv[1],n[2]*inv[2])), c) for vs,n,c in faces]

# ============================ BLACK COBRA ============================
# Colours straight from makeSnake()'s cobra branch.
MATA, MATB, BELLY, YELLOW = 0x121218, 0x08080d, 0x2a6ae0, 0xd8c22a
SEGS, SPACING = 14, 0.72
def seg_radius(i):                       # snakeSegRadius() cobra branch
    t = min(1.0, i/max(1, SEGS-1)); return 0.30 + (0.09-0.30)*t

def cobra_head(hood_open):
    """The head Group. hood_open is S._hood, 0..1 — it drives the hood Group's scale
    exactly as tickSnakeHood() does: (0.30+h*0.82, 0.45+h*0.70, 1)."""
    hd=[]
    hd+=box(0.44,0.28,0.62, MATA, 0,0,0)                              # skull
    hd+=place(cone(0.2,0.34,6,MATA), (0,-0.02,0.44), rx=math.pi/2)    # snout
    hd+=box(0.34,0.10,0.50, BELLY, 0,-0.16,0.16)                      # blue throat
    hd+=place(sph(0.065,YELLOW), (-0.18,0.11,0.16))                   # yellow eyes
    hd+=place(sph(0.065,YELLOW), ( 0.18,0.11,0.16))
    hd+=box(0.035,0.02,0.34, YELLOW, 0,-0.04,0.70)                    # tongue
    # HOOD — an upright FAN of five plates hinged at the nape, each rotated about Z
    # so they radiate up and out; every plate carries a blue skin on its +Z face.
    hood=[]
    for a in (-0.86,-0.45,0.0,0.45,0.86):
        rib=[]
        rib+=box(0.155,0.42,0.05, MATA, 0,0.21,0)                     # plate, extends UP from the hinge
        rib+=box(0.125,0.36,0.022, BELLY, 0,0.20,0.038)               # blue forward face
        hood+=place(rib, (0,0,0), rz=a)                               # hinge at the nape
    hood+=box(0.17,0.10,0.30, MATA, 0,0,-0.06)                        # nape spar
    h=hood_open
    hd+=place(scale(hood, 0.30+h*0.82, 0.45+h*0.70, 1), (0,0.06,-0.20), rx=-0.26)
    return hd

def cobra_body(curve=True):
    """Head + 14 segments laid along an S-curve, each with its blue belly strip."""
    f=[]
    pts=[]
    for k in range(70):
        z=k*0.30
        x=(math.sin(k*0.30)*1.9 if curve else 0.0)
        pts.append((x,0.0,z))
    def at_arc(arc):
        acc=0
        for i in range(1,len(pts)):
            d=math.dist(pts[i-1],pts[i])
            if acc+d>=arc:
                t=(arc-acc)/(d or 1)
                p=tuple(pts[i-1][j]+(pts[i][j]-pts[i-1][j])*t for j in range(3))
                fwd=(pts[i][0]-pts[i-1][0],0,pts[i][2]-pts[i-1][2])
                return p,fwd
            acc+=d
        return pts[-1],(0,0,1)
    for i in range(SEGS):
        r=seg_radius(i); arc=(SEGS-1-i)*SPACING
        p,fwd=at_arc(arc); head=math.atan2(fwd[0],fwd[2])
        col = MATA if (i%2==0) else MATB
        y = r*0.85
        f+=place(cylZ(r, r*0.9, SPACING*1.55, 9, col), (p[0],y,p[2]), ry=head)
        f+=place(box(r*1.25, r*0.44, SPACING*1.5, BELLY), (p[0], y-r*0.76, p[2]), ry=head)
    p,fwd=at_arc(0.0); head=math.atan2(fwd[0],fwd[2])
    f+=place(cobra_head(0.0), (p[0],0.34,p[2]), ry=head)
    return f

LIGHT=norm((-0.4,0.8,0.55))
def project(parts,W,H,yaw,pitch,bg=(150,180,210),ground=(150,150,160),fit=0.82):
    img=Image.new('RGB',(W,H),bg); d=ImageDraw.Draw(img,'RGBA')
    d.rectangle([0,int(H*0.62),W,H],fill=ground+(255,))
    tri=[]; pts=[]
    for verts,n,col in parts:
        vv=[rotx(roty(v,yaw),pitch) for v in verts]
        pts+=vv
        tri.append((vv,rotx(roty(n,yaw),pitch),col))
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    ppu=(W*fit)/max(0.001,(max(xs)-min(xs)))
    ppu=min(ppu,(H*fit)/max(0.001,(max(ys)-min(ys))))
    cx=W/2-(min(xs)+max(xs))/2*ppu; cy=H*0.54+(min(ys)+max(ys))/2*ppu
    scr=lambda p:(cx+p[0]*ppu, cy-p[1]*ppu)
    tri.sort(key=lambda t:sum(p[2] for p in t[0])/len(t[0]))
    for vv,nn,col in tri:
        nu=norm(nn); sh=0.32+0.68*max(0.0,sum(a*b for a,b in zip(nu,LIGHT)))
        r,g,b=hexrgb(col); fill=(int(r*sh),int(g*sh),int(b*sh))
        d.polygon([scr(p) for p in vv],fill=fill,outline=(max(0,fill[0]-16),max(0,fill[1]-16),max(0,fill[2]-16)))
    return img
def font(s):
    for p in ['/System/Library/Fonts/Helvetica.ttc','/System/Library/Fonts/Supplemental/Arial.ttf']:
        try: return ImageFont.truetype(p,s)
        except: pass
    return ImageFont.load_default()

PW,PH=620,470; th=54
panels=[('HOOD FOLDED — cruising',            place(cobra_head(0.0), rx=0.0), 0.85, 0.20, (206,196,172)),
        ('HOOD FLARED — about to strike',     place(cobra_head(1.0), rx=0.0), 0.85, 0.20, (206,178,178)),
        ('FULL BODY — blue belly, black back',cobra_body(True),               0.55, 0.55, (196,182,150))]
sheet=Image.new('RGB',(PW*len(panels),th+PH),(24,24,28)); d=ImageDraw.Draw(sheet)
d.text((20,16),'Survive the Savannah — ☠️ BLACK COBRA (offline render of the actual procedural mesh)',
       font=font(19),fill=(241,196,15))
for i,(label,parts,yaw,pitch,bg) in enumerate(panels):
    panel=project(parts,PW,PH,yaw,pitch,bg=bg,ground=tuple(int(c*0.8) for c in bg))
    dd=ImageDraw.Draw(panel)
    dd.rectangle([0,0,PW-1,PH-1],outline=(60,60,66),width=2)
    dd.rectangle([12,12,22,34],fill=(91,47,138))
    dd.text((30,12),label,font=font(16),fill=(20,20,20))
    sheet.paste(panel,(i*PW,th))
out='/Users/openclaw/Documents/lion-survival/dossiers/cobra_render.png'
sheet.save(out); print('wrote',out,sheet.size)
