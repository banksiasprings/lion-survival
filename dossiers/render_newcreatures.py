#!/usr/bin/env python3
"""Offline render of the two NEW creatures — the sky vulture and the giant snake —
by projecting their exact makeSkyVulture / makeSnake geometry with a painter's
rasteriser. Used because the in-app WebGL compositor was wedged this session
(reset/freeze cycling), so we render the actual mesh offline instead of screenshotting.
Left panel: sky vulture, wings mid-flap, 3/4 view. Right panel: giant snake in an
S-curve, slightly elevated view to show the body undulation + carpet-python blotches."""
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
    # cone along +Y by default (apex up), then optional rx tilt
    f=[]; apex=(0,h/2,0); slope=r/h
    for i in range(seg):
        a0=2*math.pi*i/seg; a1=2*math.pi*(i+1)/seg; am=(a0+a1)/2
        b0=(r*math.cos(a0),-h/2,r*math.sin(a0)); b1=(r*math.cos(a1),-h/2,r*math.sin(a1))
        f.append(([apex,b1,b0], norm((math.cos(am),slope,math.sin(am))), col))
        f.append(([(0,-h/2,0),b0,b1],(0,-1,0),col))
    return [([rotx(v,rx) for v in vs], rotx(n,rx), c) for vs,n,c in f]
def cylZ(rt,rb,h,seg,col):
    # cylinder whose LENGTH lies along local +Z (== three's CylinderGeometry + rotateX(PI/2))
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
    """Apply local rotation (X then Y then Z) + translate. Good enough for a static pose."""
    def T(v): return add(rotz(roty(rotx(v,rx),ry),rz), pos)
    def R(n): return rotz(roty(rotx(n,rx),ry),rz)
    return [([T(v) for v in vs], R(n), c) for vs,n,c in faces]

# ============================ SKY VULTURE ============================
VD,VBLK,VPALE,VBEAK,VFOOT,VEYE = 0x241a10,0x120d07,0xcabfa6,0x2a2018,0x6b5a3e,0x0a0a0a
def vulture():
    f=[]
    f+=place(cylZ(0.34,0.20,1.8,10,VD))                       # fuselage body along Z
    f+=box(0.52,0.36,0.95,VD,0,0.02,0.05)                     # chest bulk
    f+=place(cone(0.15,0.5,7,VPALE), (0,0.14,0.9), rx=-0.5)   # neck
    f+=box(0.28,0.26,0.32,VPALE,0,0.32,1.12)                  # head
    f+=place(cone(0.09,0.28,7,VBEAK), (0,0.27,1.34), rx=math.pi/2+0.35)  # hooked beak
    f+=box(0.05,0.05,0.05,VEYE,-0.12,0.36,1.16); f+=box(0.05,0.05,0.05,VEYE,0.12,0.36,1.16)
    f+=box(0.75,0.05,0.8,VBLK,0,0,-1.35)                      # tail fan
    # wings — inner/outer/tip in wing frame, then rolled (rz) at the shoulder (mid-flap up)
    for side in (1,-1):
        a = 0.6 if side==1 else -0.6           # both tips up together
        roll = (0.12+a) if side==1 else (-0.12-a)
        w=[]
        w+=box(1.3,0.06,0.66,VD, side*0.72,0,0)
        w+=place(box(1.5,0.05,0.46,VBLK), (side*1.82,0,-0.08), ry=side*-0.16)
        w+=box(0.72,0.04,0.16,VBLK, side*2.66,0,-0.22)
        f+=place(w, (side*0.26,0.14,0.05), rz=roll)
    # feet — tucked up flush (flying pose)
    for side in (1,-1):
        ft=[]
        ft+=place(cylZ(0.05,0.05,0.44,6,VFOOT), (0,-0.22,0), rx=math.pi/2)
        for tx in (-0.09,0,0.09): ft+=place(cone(0.03,0.2,5,VFOOT), (tx,-0.46,0.07), rx=math.pi-0.5)
        f+=place(ft, (side*0.13,-0.14,-0.1), rx=-1.15)   # tucked
    return f

# ============================ GIANT SNAKE ============================
STAN,STAN2,SBLOT,SDARK,STONGUE = 0xc2a878,0xb0966a,0x6e5636,0x0a0a0a,0x8a2b2b
SEGS=14; SPACING=0.72
def snake():
    f=[]
    # S-curve spine in the XZ plane, head at the front (+Z)
    pts=[]
    for k in range(70):
        z = k*0.30
        x = math.sin(k*0.32)*2.2
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
    # segments (tail -> head so painter order roughly right; sort handles final order)
    for i in range(SEGS):
        t=i/(SEGS-1); r=0.42+(0.12-0.42)*t
        arc=(SEGS-1-i)*SPACING          # i=SEGS-1 -> arc 0 (front/head end)
        p,fwd=at_arc(arc)
        head=math.atan2(fwd[0],fwd[2])
        col= STAN if (i%2==0) else STAN2
        seg=place(cylZ(r, r*0.9, SPACING*1.55, 9, col), (p[0],r*0.75,p[2]), ry=head)
        f+=seg
        if i%2==0 and i>0:
            f+=place(box(r*1.4,r*0.5,SPACING*0.9,SBLOT), (p[0],r*0.75+r*0.72,p[2]), ry=head)
    # HEAD at the very front
    p,fwd=at_arc(0); head=math.atan2(fwd[0],fwd[2])
    hd=[]
    hd+=box(0.72,0.42,0.9,STAN,0,0,0)
    hd+=place(cone(0.3,0.55,7,STAN), (0,0,0.62), rx=math.pi/2)
    hd+=place(sph(0.09,SDARK), (-0.27,0.16,0.2)); hd+=place(sph(0.09,SDARK), (0.27,0.16,0.2))
    hd+=box(0.04,0.02,0.42,STONGUE,0,0,0.98)
    f+=place(hd, (p[0],0.42,p[2]), ry=head)
    return f

YAW_V,PITCH_V=0.9,0.22
YAW_S,PITCH_S=0.6,0.62   # snake: more top-down to read the S-curve
LIGHT=norm((-0.4,0.8,0.55))
def project(parts,W,H,yaw,pitch,bg=(150,180,210),ground=(150,150,160),fit=0.82,shadow=True):
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

PW,PH=760,500; th=54
sheet=Image.new('RGB',(PW*2,th+PH),(24,24,28)); d=ImageDraw.Draw(sheet)
d.text((20,16),'Lion Survival — new creatures (offline render of the actual procedural mesh)',font=font(19),fill=(241,196,15))
panels=[('🦅 SKY VULTURE — wings mid-flap, feet tucked', vulture(), YAW_V, PITCH_V, (140,175,215), (46,160,90)),
        ('🐍 GIANT SNAKE — S-curve body, carpet-python blotches', snake(), YAW_S, PITCH_S, (196,182,150), (120,175,90))]
for i,(label,parts,yaw,pitch,bg,tag) in enumerate(panels):
    panel=project(parts,PW,PH,yaw,pitch,bg=bg,ground=tuple(int(c*0.8) for c in bg))
    dd=ImageDraw.Draw(panel)
    dd.rectangle([0,0,PW-1,PH-1],outline=(60,60,66),width=2); dd.rectangle([12,12,22,34],fill=tag)
    dd.text((30,12),label,font=font(17),fill=(20,20,20)); sheet.paste(panel,(i*PW,th))
out='/Users/openclaw/Documents/lion-survival/dossiers/newcreatures_render.png'
sheet.save(out); print('wrote',out,sheet.size)
