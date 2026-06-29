#!/usr/bin/env python3
"""Offline render of the elephant mesh (projects the exact makeElephant geometry)."""
import math
from PIL import Image, ImageDraw, ImageFont
def rotx(v,a):
    c,s=math.cos(a),math.sin(a);x,y,z=v;return (x,y*c-z*s,y*s+z*c)
def roty(v,a):
    c,s=math.cos(a),math.sin(a);x,y,z=v;return (x*c+z*s,y,-x*s+z*c)
def add(a,b):return(a[0]+b[0],a[1]+b[1],a[2]+b[2])
def norm(v):
    l=math.sqrt(sum(c*c for c in v))or 1;return(v[0]/l,v[1]/l,v[2]/l)
def hexrgb(h):return((h>>16)&255,(h>>8)&255,h&255)
def box(w,h,d,col,cx,cy,cz):
    hx,hy,hz=w/2,h/2,d/2
    V=[(cx-hx,cy-hy,cz-hz),(cx+hx,cy-hy,cz-hz),(cx+hx,cy+hy,cz-hz),(cx-hx,cy+hy,cz-hz),
       (cx-hx,cy-hy,cz+hz),(cx+hx,cy-hy,cz+hz),(cx+hx,cy+hy,cz+hz),(cx-hx,cy+hy,cz+hz)]
    F=[([0,1,2,3],(0,0,-1)),([5,4,7,6],(0,0,1)),([4,0,3,7],(-1,0,0)),([1,5,6,2],(1,0,0)),([3,2,6,7],(0,1,0)),([4,5,1,0],(0,-1,0))]
    return [([V[i] for i in idx],n,col) for idx,n in F]
def _pl(faces,rx,cx,cy,cz):
    return [([add(rotx(v,rx),(cx,cy,cz)) for v in vs],rotx(n,rx),col) for vs,n,col in faces]
def cone(r,h,seg,col,cx,cy,cz,rx=0.0):
    f=[];ap=(0,h/2,0);sl=r/h
    for i in range(seg):
        a0=2*math.pi*i/seg;a1=2*math.pi*(i+1)/seg;am=(a0+a1)/2
        b0=(r*math.cos(a0),-h/2,r*math.sin(a0));b1=(r*math.cos(a1),-h/2,r*math.sin(a1))
        f.append(([ap,b1,b0],norm((math.cos(am),sl,math.sin(am))),col));f.append(([(0,-h/2,0),b0,b1],(0,-1,0),col))
    return _pl(f,rx,cx,cy,cz)
def cyl(rt,rb,h,seg,col,cx,cy,cz,rx=0.0):
    f=[]
    for i in range(seg):
        a0=2*math.pi*i/seg;a1=2*math.pi*(i+1)/seg;am=(a0+a1)/2
        b0=(rb*math.cos(a0),-h/2,rb*math.sin(a0));b1=(rb*math.cos(a1),-h/2,rb*math.sin(a1))
        t0=(rt*math.cos(a0),h/2,rt*math.sin(a0));t1=(rt*math.cos(a1),h/2,rt*math.sin(a1))
        f.append(([b0,b1,t1,t0],(math.cos(am),0,math.sin(am)),col))
        f.append(([(0,h/2,0),t0,t1],(0,1,0),col));f.append(([(0,-h/2,0),b1,b0],(0,-1,0),col))
    return _pl(f,rx,cx,cy,cz)

HIDE,HIDE2,TUSK,DARK=0x8d8d88,0x6f6f6b,0xe8e0cf,0x141014
def elephant():
    f=[]
    legLen=1.5;bw=1.3;bh=1.5;bl=2.5;bodyY=legLen+bh*0.5
    f+=box(bw,bh,bl,HIDE,0,bodyY,0)
    f+=box(bw*0.92,bh*0.42,bl*0.82,HIDE,0,bodyY+bh*0.46,0)
    headZ=bl*0.5+0.18;headY=bodyY+bh*0.22
    f+=box(bw*0.82,bh*0.82,0.82,HIDE,0,headY,headZ)
    f+=box(bw*0.6,0.5,0.62,HIDE,0,headY+bh*0.45,headZ-0.06)
    for d in(-1,1): f+=box(0.14,1.05,0.95,HIDE2,d*bw*0.45,headY+0.08,headZ-0.22)   # ears (axis-aligned approx)
    cy=headY-0.05;cz=headZ+0.5
    for i in range(4):
        r=0.26-i*0.045;cy-=0.34;cz+=0.05
        f+=cyl(r,r-0.03,0.5,6,HIDE,0,cy,cz,0.55+i*0.18)
    for d in(-1,1): f+=cyl(0.05,0.09,0.85,6,TUSK,d*0.24,headY-0.34,headZ+0.5,1.15)
    for d in(-1,1): f+=box(0.08,0.1,0.06,DARK,d*0.32,headY+0.14,headZ+0.38)
    def leg(lx,lz,a):
        ln=legLen;cx=lx;cyl_y=ln+(-math.cos(a))*ln/2;cz2=lz+(-math.sin(a))*ln/2
        out=cyl(0.26,0.30,ln,7,HIDE,cx,cyl_y,cz2,a)
        hx=lx;hy=ln+(-math.cos(a))*ln;hz=lz+(-math.sin(a))*ln
        out+=cyl(0.31,0.28,0.16,7,HIDE2,hx,hy+0.08,hz,a)
        return out
    f+=leg(-bw*0.34, bl*0.34, 0.3); f+=leg(-bw*0.34,-bl*0.34, 0.3)   # left side forward
    f+=leg( bw*0.34, bl*0.34,-0.3); f+=leg( bw*0.34,-bl*0.34,-0.3)   # right side back
    f+=cyl(0.05,0.04,0.9,5,HIDE,0,bodyY-0.05,-bl*0.5-0.05,0.4)
    f+=box(0.18,0.18,0.18,DARK,0,bodyY-0.55,-bl*0.5-0.2)
    return f

YAW,PITCH=-0.82,0.14;LIGHT=norm((-0.4,0.7,0.6))
def project(parts,W,H):
    img=Image.new('RGB',(W,H),(206,212,224));d=ImageDraw.Draw(img,'RGBA')
    d.rectangle([0,int(H*0.74),W,H],fill=(150,150,160,255))
    tri=[];pts=[]
    for vs,n,col in parts:
        vv=[rotx(roty(v,YAW),PITCH) for v in vs]
        for p in vv:pts.append(p)
        tri.append((vv,rotx(roty(n,YAW),PITCH),col))
    xs=[p[0] for p in pts];ys=[p[1] for p in pts]
    ppu=(W*0.82)/(max(xs)-min(xs))
    cx=W/2-(min(xs)+max(xs))/2*ppu;cy=H*0.56+(min(ys)+max(ys))/2*ppu
    scr=lambda p:(cx+p[0]*ppu,cy-p[1]*ppu)
    bx,by=scr(rotx(roty((0,0.02,0),YAW),PITCH))
    d.ellipse([bx-ppu*1.6,by-ppu*0.3,bx+ppu*1.6,by+ppu*0.3],fill=(0,0,0,75))
    tri.sort(key=lambda t:sum(p[2] for p in t[0])/len(t[0]))
    for vv,nn,col in tri:
        nu=norm(nn);sh=0.32+0.68*max(0.0,sum(a*b for a,b in zip(nu,LIGHT)))
        r,g,b=hexrgb(col);fl=(int(r*sh),int(g*sh),int(b*sh))
        d.polygon([scr(p) for p in vv],fill=fl,outline=(max(0,fl[0]-14),max(0,fl[1]-14),max(0,fl[2]-14)))
    return img
def font(s):
    for p in['/System/Library/Fonts/Helvetica.ttc','/System/Library/Fonts/Supplemental/Arial.ttf']:
        try:return ImageFont.truetype(p,s)
        except:pass
    return ImageFont.load_default()
W,H,th=620,520,52;sheet=Image.new('RGB',(W,th+H),(24,24,28));d=ImageDraw.Draw(sheet)
d.text((18,16),'Lion Survival — elephant (offline render of the actual makeElephant mesh)',font=font(17),fill=(241,196,15))
panel=project(elephant(),W,H);dd=ImageDraw.Draw(panel)
dd.rectangle([0,0,W-1,H-1],outline=(60,60,66),width=2);dd.rectangle([12,12,22,34],fill=(46,160,90))
dd.text((30,12),'elephant · hp 90 · 4 spears · tanky prey that lumbers off',font=font(14),fill=(20,20,20))
sheet.paste(panel,(0,th))
out='/Users/openclaw/Documents/lion-survival/dossiers/elephant_render.png';sheet.save(out);print('wrote',out,sheet.size)
