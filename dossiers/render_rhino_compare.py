#!/usr/bin/env python3
"""Offline render of the rhino mesh — BEFORE vs AFTER the look pass. Projects the
exact makeRhino geometry (boxes + cones + cylinders) with a painter's rasteriser,
since the headless preview has no working WebGL backend."""
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
    f=[]
    for i in range(seg):
        a0=2*math.pi*i/seg; a1=2*math.pi*(i+1)/seg; am=(a0+a1)/2
        b0=(rb*math.cos(a0),-h/2,rb*math.sin(a0)); b1=(rb*math.cos(a1),-h/2,rb*math.sin(a1))
        t0=(rt*math.cos(a0),h/2,rt*math.sin(a0)); t1=(rt*math.cos(a1),h/2,rt*math.sin(a1))
        f.append(([b0,b1,t1,t0],(math.cos(am),0,math.sin(am)),col))
        f.append(([(0,h/2,0),t0,t1],(0,1,0),col)); f.append(([(0,-h/2,0),b1,b0],(0,-1,0),col))
    return _placed(f,rx,cx,cy,cz)

def new_rhino():
    H,H2,P,HORN,D = 0x8f8f86,0x6c6c64,0x7c7c73,0xd0c9b7,0x17171a
    f=[]
    f+=box(1.40,1.15,2.60,H,0,1.45,-0.10); f+=box(1.20,0.55,2.20,H,0,2.05,-0.10); f+=box(1.22,0.55,2.20,H2,0,1.00,-0.10)
    for px,py,pz in [(-0.73,1.55,0.55),(0.73,1.55,0.55),(-0.73,1.50,-0.85),(0.73,1.50,-0.85)]: f+=box(0.12,0.72,0.92,P,px,py,pz)
    f+=box(0.92,0.82,0.70,H,0,1.50,1.20); f+=box(0.96,0.80,1.00,H,0,1.30,1.95)
    f+=box(0.92,0.18,0.52,H2,0,1.64,2.12); f+=box(0.72,0.60,0.70,H,0,1.05,2.50)
    f+=box(0.14,0.12,0.10,D,-0.42,1.46,2.22); f+=box(0.14,0.12,0.10,D,0.42,1.46,2.22)
    f+=cone(0.25,1.05,7,HORN,0,1.62,2.78,-0.50); f+=cone(0.15,0.46,7,HORN,0,1.74,2.22,-0.32)
    f+=cone(0.13,0.26,5,H,-0.34,1.96,1.62,-0.3); f+=cone(0.13,0.26,5,H,0.34,1.96,1.62,-0.3)
    f+=cyl(0.05,0.04,0.7,5,H2,0,1.35,-1.55,0.5)
    for lx,lz in [(-0.56,0.95),(0.56,0.95),(-0.56,-1.00),(0.56,-1.00)]: f+=cyl(0.22,0.30,1.0,8,H2,lx,0.55,lz)
    return f,1.15
def old_rhino():
    H,H2,HORN,D=0x8a8a82,0x6f6f68,0xcfc8b6,0x17171a
    f=[]
    f+=box(1.30,1.20,3.00,H,0,1.50,0); f+=box(1.24,0.55,1.10,H,0,2.05,0.40)
    f+=box(0.92,0.85,1.00,H,0,1.28,1.70); f+=box(0.70,0.66,0.72,H,0,1.06,2.28)
    f+=cone(0.23,0.90,6,HORN,0,1.55,2.55,-0.45); f+=cone(0.15,0.42,6,HORN,0,1.66,2.02,-0.30)
    f+=cone(0.12,0.22,5,H,-0.34,2.00,1.46); f+=cone(0.12,0.22,5,H,0.34,2.00,1.46)
    f+=cyl(0.05,0.04,0.7,5,H2,0,1.30,-1.6,0.5)
    for lx,lz in [(-0.55,1.00),(0.55,1.00),(-0.55,-1.05),(0.55,-1.05)]: f+=cyl(0.20,0.24,1.0,7,H2,lx,0.55,lz)
    return f,1.1

YAW,PITCH=-0.8,0.26; LIGHT=norm((-0.4,0.7,0.6))
def project(parts,scale,W,H):
    img=Image.new('RGB',(W,H),(206,210,222)); d=ImageDraw.Draw(img,'RGBA')
    d.rectangle([0,int(H*0.66),W,H],fill=(150,150,160,255))
    tri=[]; pts=[]
    for verts,n,col in parts:
        vv=[rotx(roty((v[0]*scale,v[1]*scale,v[2]*scale),YAW),PITCH) for v in verts]
        for p in vv: pts.append(p)
        tri.append((vv,rotx(roty(n,YAW),PITCH),col))
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    ppu=(W*0.80)/(max(xs)-min(xs))
    cx=W/2-(min(xs)+max(xs))/2*ppu; cy=H*0.56+(min(ys)+max(ys))/2*ppu
    scr=lambda p:(cx+p[0]*ppu, cy-p[1]*ppu)
    bx,by=scr(rotx(roty((0,0.02,0),YAW),PITCH))
    d.ellipse([bx-ppu*1.9,by-ppu*0.3,bx+ppu*1.9,by+ppu*0.3],fill=(0,0,0,80))
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

PW,PH=720,440; th=52
sheet=Image.new('RGB',(PW*2,th+PH),(24,24,28)); d=ImageDraw.Draw(sheet)
d.text((20,15),'Lion Survival — rhino, before / after the look pass (offline render of the actual mesh)',font=font(19),fill=(241,196,15))
for i,(label,(parts,sc),tag) in enumerate([('BEFORE',old_rhino(),(231,76,60)),('AFTER',new_rhino(),(46,160,90))]):
    panel=project(parts,sc,PW,PH); dd=ImageDraw.Draw(panel)
    dd.rectangle([0,0,PW-1,PH-1],outline=(60,60,66),width=2); dd.rectangle([12,12,22,34],fill=tag)
    dd.text((30,12),label,font=font(18),fill=(20,20,20)); sheet.paste(panel,(i*PW,th))
out='/Users/openclaw/Documents/lion-survival/dossiers/rhino_render.png'
sheet.save(out); print('wrote',out,sheet.size)
