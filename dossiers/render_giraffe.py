#!/usr/bin/env python3
"""Offline render of the giraffe mesh (projects the exact makeGiraffe geometry)."""
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

COAT,PALE,SPOT,HORN,DARK,MANE=0xc79a52,0xe3d6b0,0x9a6a32,0x5b4a32,0x141014,0x6b4a26
def giraffe():
    f=[]
    legLen=1.8;bw=0.72;bh=0.78;bl=1.5;bodyY=legLen+bh*0.5
    f+=box(bw,bh,bl,COAT,0,bodyY,0)
    f+=box(bw*0.98,bh*0.7,bl*0.5,COAT,0,bodyY+0.22,bl*0.28)        # raised withers
    f+=box(bw*0.94,bh*0.74,bl*0.42,COAT,0,bodyY-0.16,-bl*0.46)     # dropped rump
    neckLen=2.15;th=0.40;c=math.cos(th);sn=math.sin(th);nbY=bodyY+bh*0.34;nbZ=bl*0.40
    f+=cyl(0.20,0.30,neckLen,8,COAT, 0,nbY+c*neckLen*0.5,nbZ+sn*neckLen*0.5, th)   # tapered neck
    f+=cyl(0.05,0.06,neckLen*0.9,5,MANE, 0,nbY+c*neckLen*0.5+0.02,nbZ+sn*neckLen*0.5-0.18, th)  # mane
    tipY=nbY+c*neckLen;tipZ=nbZ+sn*neckLen
    f+=box(0.34,0.36,0.46,COAT,0,tipY+0.06,tipZ+0.10)
    f+=box(0.26,0.24,0.34,PALE,0,tipY-0.04,tipZ+0.40)
    f+=box(0.20,0.10,0.06,DARK,0,tipY-0.10,tipZ+0.57)
    for d in(-1,1):
        f+=cyl(0.045,0.06,0.24,6,HORN,d*0.11,tipY+0.34,tipZ+0.02)
        f+=box(0.14,0.14,0.14,DARK,d*0.11,tipY+0.48,tipZ+0.02)
        f+=cone(0.085,0.26,5,COAT,d*0.26,tipY+0.20,tipZ-0.04,0)
        f+=box(0.06,0.08,0.05,DARK,d*0.15,tipY+0.06,tipZ+0.26)
    # legs posed mid-stride (pace: same-side legs together) — hip-pivot swing
    def leg(lx,lz,ln,a):
        cx=lx; cy=ln+(-math.cos(a))*ln/2; cz=lz+(-math.sin(a))*ln/2
        out=cyl(0.085,0.06,ln,6,PALE,cx,cy,cz,a)
        hx=lx; hy=ln+(-math.cos(a))*ln; hz=lz+(-math.sin(a))*ln
        out+=cyl(0.07,0.08,0.12,6,MANE,hx,hy+0.06,hz,a)
        return out
    f+=leg(-bw*0.40, bl*0.34, legLen,      0.42)   # left side forward...
    f+=leg(-bw*0.40,-bl*0.36, legLen*0.92, 0.42)
    f+=leg( bw*0.40, bl*0.34, legLen,     -0.42)   # ...right side back
    f+=leg( bw*0.40,-bl*0.36, legLen*0.92,-0.42)
    f+=cyl(0.03,0.03,0.8,4,PALE,0,bodyY-0.1,-bl*0.5-0.05,0.6)      # tail
    f+=box(0.16,0.16,0.16,DARK,0,bodyY-0.55,-bl*0.5-0.38)          # tuft
    # a few flush coat patches to hint the reticulated texture
    pts=[(bodyY+0.18,0.3,bw*0.5),(bodyY-0.06,-0.1,bw*0.5),(bodyY+0.14,-0.5,bw*0.48),
         (nbY+c*0.9,nbZ+sn*0.9,0.24),(nbY+c*1.5,nbZ+sn*1.5,0.21)]
    for py,pz,px in pts:
        for d in(-1,1): f+=box(0.05,0.22,0.22,SPOT,d*px,py,pz)
    return f

YAW,PITCH=-0.72,0.10;LIGHT=norm((-0.4,0.7,0.6))
def project(parts,W,H):
    img=Image.new('RGB',(W,H),(206,212,224));d=ImageDraw.Draw(img,'RGBA')
    d.rectangle([0,int(H*0.80),W,H],fill=(150,150,160,255))
    tri=[];pts=[]
    for vs,n,col in parts:
        vv=[rotx(roty(v,YAW),PITCH) for v in vs]
        for p in vv:pts.append(p)
        tri.append((vv,rotx(roty(n,YAW),PITCH),col))
    ys=[p[1] for p in pts];xs=[p[0] for p in pts]
    ppu=(H*0.86)/(max(ys)-min(ys))
    cx=W/2-(min(xs)+max(xs))/2*ppu;cy=H*0.52+(min(ys)+max(ys))/2*ppu
    scr=lambda p:(cx+p[0]*ppu,cy-p[1]*ppu)
    bx,by=scr(rotx(roty((0,0.02,0),YAW),PITCH))
    d.ellipse([bx-ppu*0.9,by-ppu*0.18,bx+ppu*0.9,by+ppu*0.18],fill=(0,0,0,70))
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
W,H,th=560,640,52;sheet=Image.new('RGB',(W,th+H),(24,24,28));d=ImageDraw.Draw(sheet)
d.text((18,16),'Lion Survival — giraffe (offline render of the actual makeGiraffe mesh)',font=font(18),fill=(241,196,15))
panel=project(giraffe(),W,H);dd=ImageDraw.Draw(panel)
dd.rectangle([0,0,W-1,H-1],outline=(60,60,66),width=2);dd.rectangle([12,12,22,34],fill=(46,160,90))
dd.text((30,12),'giraffe · hp 40 · faster than you · flees when hit',font=font(15),fill=(20,20,20))
sheet.paste(panel,(0,th))
out='/Users/openclaw/Documents/lion-survival/dossiers/giraffe_render.png';sheet.save(out);print('wrote',out,sheet.size)
