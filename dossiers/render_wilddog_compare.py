#!/usr/bin/env python3
"""Offline render of the African wild dog mesh — BEFORE vs AFTER the body-shape pass.
Projects the exact makeWildDog geometry with a painter's rasteriser (the in-app WebGL
compositor was wedged this session, so we render the mesh offline instead). ONLY the
body torso changes: three near-uniform circular cylinders (a barrel) -> a deep-chested,
narrow-waisted, tapered torso with an oval (deeper-than-wide) cross-section."""
import math
from PIL import Image, ImageDraw, ImageFont

def rotx(v,a):
    c,s=math.cos(a),math.sin(a); x,y,z=v; return (x, y*c-z*s, y*s+z*c)
def roty(v,a):
    c,s=math.cos(a),math.sin(a); x,y,z=v; return (x*c+z*s, y, -x*s+z*c)
def add(a,b): return (a[0]+b[0],a[1]+b[1],a[2]+b[2])
def norm(v):
    l=math.sqrt(sum(c*c for c in v)) or 1; return (v[0]/l,v[1]/l,v[2]/l)
def hexrgb(h): return ((h>>16)&255,(h>>8)&255,h&255)

def box(w,h,d,col,cx,cy,cz):
    hx,hy,hz=w/2,h/2,d/2
    V=[(cx-hx,cy-hy,cz-hz),(cx+hx,cy-hy,cz-hz),(cx+hx,cy+hy,cz-hz),(cx-hx,cy+hy,cz-hz),
       (cx-hx,cy-hy,cz+hz),(cx+hx,cy-hy,cz+hz),(cx+hx,cy+hy,cz+hz),(cx-hx,cy+hy,cz+hz)]
    F=[([0,1,2,3],(0,0,-1)),([5,4,7,6],(0,0,1)),([4,0,3,7],(-1,0,0)),
       ([1,5,6,2],(1,0,0)),([3,2,6,7],(0,1,0)),([4,5,1,0],(0,-1,0))]
    return [([V[i] for i in idx],n,col) for idx,n in F]
def _placed(faces,rx,cx,cy,cz):
    out=[]
    for verts,n,col in faces:
        out.append(([add(rotx(v,rx),(cx,cy,cz)) for v in verts], rotx(n,rx), col))
    return out
def cone(r,h,seg,col,cx,cy,cz,rx=0.0):
    f=[]; apex=(0,h/2,0); slope=r/h
    for i in range(seg):
        a0=2*math.pi*i/seg; a1=2*math.pi*(i+1)/seg; am=(a0+a1)/2
        b0=(r*math.cos(a0),-h/2,r*math.sin(a0)); b1=(r*math.cos(a1),-h/2,r*math.sin(a1))
        f.append(([apex,b1,b0], norm((math.cos(am),slope,math.sin(am))), col))
        f.append(([(0,-h/2,0),b0,b1],(0,-1,0),col))
    return _placed(f,rx,cx,cy,cz)
def cyl(rt,rb,h,seg,col,cx,cy,cz,rx=0.0):
    return segcyl(rt,rb,h,seg,col,cx,cy,cz,rx,1.0,1.0)
def segcyl(rt,rb,h,seg,col,cx,cy,cz,rx=0.0,sx=1.0,sz=1.0):
    """Cylinder with a local cross-section scale (sx on X, sz on Z) applied BEFORE the
    rx tilt — mirrors the game's mesh.scale.set(sx,1,sz) then rotation.x. After the
    body's rx=PI/2, local Z -> world height, so sz>1 = a deep, oval (taller) chest."""
    f=[]
    for i in range(seg):
        a0=2*math.pi*i/seg; a1=2*math.pi*(i+1)/seg; am=(a0+a1)/2
        def P(r,y,a): return (r*math.cos(a)*sx, y, r*math.sin(a)*sz)
        b0=P(rb,-h/2,a0); b1=P(rb,-h/2,a1); t0=P(rt,h/2,a0); t1=P(rt,h/2,a1)
        nrm=(math.cos(am)/sx,0,math.sin(am)/sz)
        f.append(([b0,b1,t1,t0],nrm,col))
        f.append(([(0,h/2,0),t0,t1],(0,1,0),col)); f.append(([(0,-h/2,0),b1,b0],(0,-1,0),col))
    return _placed(f,rx,cx,cy,cz)

# Menacing dire-wolf palette (unchanged between before/after).
TAN,BROWN,BLACK,CREAM,DARK,BONE,SPIKE = 0x7a451c,0x3a2513,0x140c05,0x8f8262,0x0a0a0a,0xeae4d0,0x080808
PI=math.pi

def _shared_parts(legx=0.24):
    """Everything EXCEPT the torso segments — identical before & after (rear legs pull
    in slightly on the leaner AFTER rump)."""
    f=[]
    # neck + head
    f+=cyl(0.19,0.25,0.55,8,TAN,0,0.98,1.02,PI/2.3)
    f+=box(0.30,0.30,0.42,BROWN,0,1.12,1.35)
    f+=box(0.19,0.17,0.34,TAN,0,1.05,1.63)
    f+=box(0.12,0.10,0.10,DARK,0,1.03,1.83)
    f+=box(0.055,0.055,0.05,DARK,-0.10,1.19,1.5); f+=box(0.055,0.055,0.05,DARK,0.10,1.19,1.5)
    # ears (big round painted-dog signature)
    f+=cone(0.15,0.32,6,BLACK,-0.14,1.36,1.26,-0.12); f+=cone(0.15,0.32,6,BLACK,0.14,1.36,1.26,-0.12)
    # bared teeth
    f+=cone(0.035,0.20,5,BONE,-0.085,0.955,1.70,PI); f+=cone(0.035,0.20,5,BONE,0.085,0.955,1.70,PI)
    for tx in (-0.055,0.0,0.055): f+=cone(0.026,0.12,5,BONE,tx,0.965,1.735,PI)
    # spine crest spikes  [sz, sr, sh, sy]
    for sz,sr,sh,sy in [(0.62,0.050,0.30,1.34),(0.30,0.060,0.38,1.39),(-0.02,0.055,0.34,1.36),
                        (-0.36,0.045,0.26,1.30),(-0.68,0.035,0.20,1.24)]:
        f+=cone(sr,sh,6,SPIKE,0,sy,sz)
    # stump tail + white tip
    f+=cyl(0.08,0.05,0.42,7,BROWN,0,0.94,-1.06,-0.7)
    f+=cone(0.075,0.18,6,CREAM,0,0.86,-1.30,-0.9)
    # four slender cone legs (wide hip at top -> pointed foot; centre 0.22 => foot -0.21, hip 0.65)
    legmats=[BROWN,TAN,TAN,BROWN]
    for i,(lx,lz) in enumerate([(-legx,0.5),(legx,0.5),(-legx,-0.52),(legx,-0.52)]):
        f+=cone(0.12,0.86,6,legmats[i],lx,0.22,lz,PI)
    return f

def old_dog():
    f=[]
    # OLD torso — 3 near-uniform CIRCULAR cylinders => a barrel.
    f+=segcyl(0.34,0.32,0.72,8,TAN,  0,0.86, 0.55,PI/2,1.0,1.0)   # chest
    f+=segcyl(0.34,0.34,0.72,8,BROWN,0,0.86,-0.05,PI/2,1.0,1.0)   # mid
    f+=segcyl(0.32,0.26,0.72,8,TAN,  0,0.86,-0.66,PI/2,1.0,1.0)   # rump
    f+=box(0.34,0.30,0.5,BLACK,0.0,1.00,-0.15)   # dark saddle
    f+=box(0.30,0.24,0.42,CREAM,0.13,0.72,0.35)  # cream flank patch
    f+=_shared_parts()
    return f,1.0

def new_dog():
    f=[]
    # NEW torso — deep oval chest -> tucked waist -> tapered rump (sx<1 lean, sz>1 deep).
    f+=segcyl(0.20,0.36,0.90,10,TAN,  0,0.78, 0.54,PI/2,0.86,1.40)   # deep chest, high withers, low brisket
    f+=segcyl(0.30,0.23,0.56,10,BROWN,0,0.85,-0.06,PI/2,0.80,1.12)   # tucked waist — sharply pinched
    f+=segcyl(0.30,0.15,0.80,10,TAN,  0,0.87,-0.66,PI/2,0.88,1.06)   # loin -> tapered rump toward the tail
    f+=box(0.34,0.30,0.5,BLACK,0.0,1.00,-0.15)   # dark saddle (unchanged)
    f+=box(0.30,0.24,0.42,CREAM,0.13,0.72,0.35)  # cream flank patch (unchanged)
    f+=_shared_parts(legx=0.22)
    return f,1.0

YAW,PITCH=1.28,0.15; LIGHT=norm((-0.4,0.7,0.6))
def project(parts,scale,W,H):
    img=Image.new('RGB',(W,H),(206,210,222)); d=ImageDraw.Draw(img,'RGBA')
    d.rectangle([0,int(H*0.66),W,H],fill=(150,150,160,255))
    tri=[]; pts=[]
    for verts,n,col in parts:
        vv=[rotx(roty((v[0]*scale,v[1]*scale,v[2]*scale),YAW),PITCH) for v in verts]
        for p in vv: pts.append(p)
        tri.append((vv,rotx(roty(n,YAW),PITCH),col))
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    ppu=(W*0.82)/(max(xs)-min(xs))
    cx=W/2-(min(xs)+max(xs))/2*ppu; cy=H*0.56+(min(ys)+max(ys))/2*ppu
    scr=lambda p:(cx+p[0]*ppu, cy-p[1]*ppu)
    bx,by=scr(rotx(roty((0,0.02,0),YAW),PITCH))
    d.ellipse([bx-ppu*1.7,by-ppu*0.28,bx+ppu*1.7,by+ppu*0.28],fill=(0,0,0,80))
    tri.sort(key=lambda t:sum(p[2] for p in t[0])/len(t[0]))
    for vv,nn,col in tri:
        nu=norm(nn); sh=0.30+0.70*max(0.0,sum(a*b for a,b in zip(nu,LIGHT)))
        r,g,b=hexrgb(col); fill=(int(r*sh),int(g*sh),int(b*sh))
        d.polygon([scr(p) for p in vv],fill=fill,outline=(max(0,fill[0]-14),max(0,fill[1]-14),max(0,fill[2]-14)))
    return img
def font(s):
    for p in ['/System/Library/Fonts/Helvetica.ttc','/System/Library/Fonts/Supplemental/Arial.ttf']:
        try: return ImageFont.truetype(p,s)
        except: pass
    return ImageFont.load_default()

PW,PH=720,460; th=52
sheet=Image.new('RGB',(PW*2,th+PH),(24,24,28)); d=ImageDraw.Draw(sheet)
d.text((20,15),'Lion Survival — African wild dog, body-shape pass (offline render of the actual mesh, profile)',font=font(18),fill=(241,196,15))
for i,(label,(parts,sc),tag) in enumerate([('BEFORE — barrel',old_dog(),(231,76,60)),('AFTER — deep chest / tucked waist',new_dog(),(46,160,90))]):
    panel=project(parts,sc,PW,PH); dd=ImageDraw.Draw(panel)
    dd.rectangle([0,0,PW-1,PH-1],outline=(60,60,66),width=2); dd.rectangle([12,12,22,34],fill=tag)
    dd.text((30,12),label,font=font(17),fill=(20,20,20)); sheet.paste(panel,(i*PW,th))
out='/Users/openclaw/Documents/lion-survival/dossiers/wilddog_render.png'
sheet.save(out); print('wrote',out,sheet.size)
