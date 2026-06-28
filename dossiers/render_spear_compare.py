#!/usr/bin/env python3
"""
Offline render of the thrown spear — BEFORE (thin stick + tiny cone, "looked like
a rock in flight") vs AFTER (wooden handle + leather grip + cord lashing + faceted
flint leaf-blade). Projects the exact buildSpearMesh() geometry (cylinders + cones
tessellated) with the same painter's rasteriser as the gorilla sheet, since the
headless preview has no working WebGL backend to screenshot the live scene.
"""
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

# --- primitives in local Y-up space → list of (verts, normal) ---
def cyl(rTop,rBot,h,seg,col):
    f=[]
    for i in range(seg):
        a0=2*math.pi*i/seg; a1=2*math.pi*(i+1)/seg; am=(a0+a1)/2
        b0=(rBot*math.cos(a0),-h/2,rBot*math.sin(a0)); b1=(rBot*math.cos(a1),-h/2,rBot*math.sin(a1))
        t0=(rTop*math.cos(a0), h/2,rTop*math.sin(a0)); t1=(rTop*math.cos(a1), h/2,rTop*math.sin(a1))
        f.append(([b0,b1,t1,t0],(math.cos(am),0,math.sin(am)),col))
        f.append(([(0,h/2,0),t0,t1],(0,1,0),col))       # top cap
        f.append(([(0,-h/2,0),b1,b0],(0,-1,0),col))     # bottom cap
    return f
def cone(r,h,seg,col):
    f=[]; apex=(0,h/2,0); slope=r/h
    for i in range(seg):
        a0=2*math.pi*i/seg; a1=2*math.pi*(i+1)/seg; am=(a0+a1)/2
        b0=(r*math.cos(a0),-h/2,r*math.sin(a0)); b1=(r*math.cos(a1),-h/2,r*math.sin(a1))
        f.append(([apex,b1,b0], norm((math.cos(am),slope,math.sin(am))), col))
        f.append(([(0,-h/2,0),b0,b1],(0,-1,0),col))     # base cap
    return f

def place(faces, z, rx):
    out=[]
    for verts,n,col in faces:
        out.append(([add(rotx(v,rx),(0,0,z)) for v in verts], rotx(n,rx), col))
    return out

WOOD,GRIP,CORD,FLINT,FLINTLO = 0x6e4a26,0x33241a,0x4a3a26,0xc2c5cf,0x888d99

def new_spear():
    f=[]
    f+=place(cyl(0.032,0.042,1.5,8,WOOD),  0.10, math.pi/2)   # shaft (handle)
    f+=place(cyl(0.055,0.055,0.26,8,GRIP), 0.55, math.pi/2)   # leather grip
    f+=place(cyl(0.05,0.028,0.09,8,GRIP),  0.86, math.pi/2)   # butt cap
    f+=place(cyl(0.062,0.062,0.14,8,CORD),-0.66, math.pi/2)   # lashing
    f+=place(cone(0.13,0.52,4,FLINT),     -0.96,-math.pi/2)   # blade point
    f+=place(cone(0.13,0.18,4,FLINTLO),   -0.61, math.pi/2)   # rear taper
    return f
def old_spear():
    f=[]
    f+=place(cyl(0.035,0.035,1.2,6,0x7a5230), 0.0, math.pi/2)
    f+=place(cone(0.09,0.30,6,0xb9bcc6),     -0.74,-math.pi/2)
    return f

YAW,PITCH=1.28,0.30
LIGHT=norm((-0.35,0.7,0.6))

def project(parts,W,H):
    img=Image.new('RGB',(W,H),(206,210,222)); d=ImageDraw.Draw(img,'RGBA')
    d.rectangle([0,int(H*0.70),W,H],fill=(150,150,160,255))
    tri=[]; pts=[]
    for verts,n,col in parts:
        vv=[]
        for v in verts:
            p=rotx(roty(v,YAW),PITCH); vv.append(p); pts.append(p)
        tri.append((vv,rotx(roty(n,YAW),PITCH),col))
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    span=max(max(xs)-min(xs),(max(ys)-min(ys)))
    ppu=(W*0.82)/ (max(xs)-min(xs))
    cx=W/2-(min(xs)+max(xs))/2*ppu; cy=H*0.5+(min(ys)+max(ys))/2*ppu
    scr=lambda p:(cx+p[0]*ppu, cy-p[1]*ppu)
    # contact shadow
    base=rotx(roty((0,-0.05,0.1),YAW),PITCH); bx,by=scr(base)
    d.ellipse([bx-ppu*0.9,by-ppu*0.12,bx+ppu*0.9,by+ppu*0.12],fill=(0,0,0,70))
    tri.sort(key=lambda t:sum(p[2] for p in t[0])/len(t[0]))
    for vv,nn,col in tri:
        nu=norm(nn); sh=0.32+0.68*max(0.0,sum(a*b for a,b in zip(nu,LIGHT)))
        r,g,b=hexrgb(col); fill=(int(r*sh),int(g*sh),int(b*sh))
        d.polygon([scr(p) for p in vv],fill=fill,outline=(max(0,fill[0]-14),max(0,fill[1]-14),max(0,fill[2]-14)))
    return img

def font(sz):
    for p in ['/System/Library/Fonts/Helvetica.ttc','/System/Library/Fonts/Supplemental/Arial.ttf']:
        try: return ImageFont.truetype(p,sz)
        except: pass
    return ImageFont.load_default()

PW,PH=1000,300; title_h=56
sheet=Image.new('RGB',(PW,title_h+PH*2),(24,24,28)); d=ImageDraw.Draw(sheet)
d.text((20,16),'Lion Survival — thrown spear, before / after  (offline render of the actual buildSpearMesh geometry)',font=font(20),fill=(241,196,15))
for i,(label,parts,tag) in enumerate([
   ('BEFORE · thin stick + tiny tip', old_spear(), (231,76,60)),
   ('AFTER · handle + grip + lashing + flint blade', new_spear(), (46,160,90))]):
    panel=project(parts,PW,PH); dd=ImageDraw.Draw(panel)
    dd.rectangle([0,0,PW-1,PH-1],outline=(60,60,66),width=2)
    dd.rectangle([12,12,22,34],fill=tag); dd.text((30,12),label,font=font(18),fill=(20,20,20))
    sheet.paste(panel,(0,title_h+i*PH))
out='/Users/openclaw/Documents/lion-survival/dossiers/spear_render.png'
sheet.save(out); print('wrote',out,sheet.size)
