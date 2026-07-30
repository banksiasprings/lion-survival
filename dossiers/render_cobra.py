#!/usr/bin/env python3
"""Offline render of the BLACK COBRA — the third serpent variant — by projecting its
exact makeSnake(...,'cobra') geometry with the same painter's rasteriser the other
creature dossiers use. The in-app WebGL pane can't be screenshotted reliably from a
headless driver (it composites blank while renderer.info still reports ~1200 draw
calls), so we rebuild the real mesh offline instead.

Mirrors index.html exactly: snakeSegRadius()'s cobra branch, addSnakeSegment()'s
wrapped ventral-scute arc, the cobra head block in makeSnake(), the ShapeGeometry
hood membrane, and setSnakeHood()'s flare/jaw/fang/neck-flatten rig.

⚠ Shading model matches the app: renderer.outputEncoding is sRGBEncoding while
colours go in un-decoded, so the framebuffer is gamma-lifted on the way out and
everything renders ~2× lighter than its hex. We reproduce that here (see shade())
— otherwise the offline sheet lies about how dark the animal actually looks.

Four panels: hood FOLDED (cruising), hood FLARED head-on (the strike pose you
actually see), the same flared head in 3/4, and the whole body in an S-curve so
the ventral scutes and the slender taper read.

⚠ Known artifact, offline only: this is a painter's rasteriser with no depth
buffer, so it sorts whole polygons by centroid and the hood's dorsal keels bleed
through the membrane in the 3/4 panel. In engine they can't — the keels sit at
hood-local z -0.053..-0.027, entirely behind the dark backing plate at -0.026,
and every cobra material has depthTest+depthWrite on (verified by dumping
view-space depths of the whole hood subtree from a front-on camera)."""
import math, random
from PIL import Image, ImageDraw, ImageFont

random.seed(7)

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
def cone(r,h,seg,col):
    f=[]; apex=(0,h/2,0); slope=r/h
    for i in range(seg):
        a0=2*math.pi*i/seg; a1=2*math.pi*(i+1)/seg; am=(a0+a1)/2
        b0=(r*math.cos(a0),-h/2,r*math.sin(a0)); b1=(r*math.cos(a1),-h/2,r*math.sin(a1))
        f.append(([apex,b1,b0], norm((math.cos(am),slope,math.sin(am))), col))
        f.append(([(0,-h/2,0),b0,b1],(0,-1,0),col))
    return f
def cylZ(rt,rb,h,seg,col,th0=0.0,thlen=2*math.pi,capped=True):
    """CylinderGeometry(rt,rb,h,seg,1,open,th0,thlen) + rotateX(PI/2): length along +Z.
    three lays theta=0 on +Z, and rotateX(PI/2) maps that to -Y — which is why an arc
    centred on theta 0 comes out under the belly."""
    f=[]; full = abs(thlen-2*math.pi) < 1e-6
    for i in range(seg):
        a0=th0+thlen*i/seg; a1=th0+thlen*(i+1)/seg; am=(a0+a1)/2
        def P(r,y,a): return (r*math.sin(a), y, r*math.cos(a))   # three's cylinder param
        b0=P(rb,-h/2,a0); b1=P(rb,-h/2,a1); t0=P(rt,h/2,a0); t1=P(rt,h/2,a1)
        nrm=(math.sin(am),0,math.cos(am))
        f.append(([b0,b1,t1,t0],nrm,col))
        if full and capped:
            f.append(([(0,h/2,0),t0,t1],(0,1,0),col)); f.append(([(0,-h/2,0),b1,b0],(0,-1,0),col))
    # rotateX(PI/2): (x,y,z) -> (x,-z,y)
    return [([(v[0],-v[2],v[1]) for v in vs],(n[0],-n[2],n[1]),c) for vs,n,c in f]
def sph(r,col,seg=8):
    f=[]
    for i in range(seg):
        for j in range(seg):
            a0,a1=math.pi*i/seg,math.pi*(i+1)/seg
            b0,b1=2*math.pi*j/seg,2*math.pi*(j+1)/seg
            def P(a,b): return (r*math.sin(a)*math.cos(b), r*math.cos(a), r*math.sin(a)*math.sin(b))
            f.append(([P(a0,b0),P(a1,b0),P(a1,b1),P(a0,b1)], norm(P((a0+a1)/2,(b0+b1)/2)), col))
    return f
def circle(r,seg,col):
    f=[]
    for i in range(seg):
        a0=2*math.pi*i/seg; a1=2*math.pi*(i+1)/seg
        f.append(([(0,0,0),(r*math.cos(a0),r*math.sin(a0),0),(r*math.cos(a1),r*math.sin(a1),0)],(0,0,1),col))
    return f
def bez(p0,c1,c2,p3,n):
    out=[]
    for k in range(1,n+1):
        t=k/n; u=1-t
        out.append((u*u*u*p0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*p3[0],
                    u*u*u*p0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*p3[1]))
    return out
def shape_fan(pts,col):
    """ShapeGeometry equivalent: triangle fan from the outline's centroid, normal +Z."""
    cx=sum(p[0] for p in pts)/len(pts); cy=sum(p[1] for p in pts)/len(pts)
    return [([(cx,cy,0),(pts[i][0],pts[i][1],0),(pts[(i+1)%len(pts)][0],pts[(i+1)%len(pts)][1],0)],
             (0,0,1),col) for i in range(len(pts))]
def place(faces,pos=(0,0,0),rx=0.0,ry=0.0,rz=0.0,sc=None):
    """Local scale, then rotation X->Y->Z (three's default Euler 'XYZ'), then translate."""
    sx,sy,sz=(sc or (1,1,1)); inv=(1/sx,1/sy,1/sz)
    def T(v): return add(rotz(roty(rotx((v[0]*sx,v[1]*sy,v[2]*sz),rx),ry),rz),pos)
    def R(n): return norm(rotz(roty(rotx((n[0]*inv[0],n[1]*inv[1],n[2]*inv[2]),rx),ry),rz))
    return [([T(v) for v in vs],R(n),c) for vs,n,c in faces]

# ==================== COBRA COLOURS — straight from COBRA_COLORS in index.html ====================
# One entry per colour morph (2026-07-30f). texMid/tint/belly/spot are copied verbatim
# from the JS table; SKIN_A/SKIN_B are DERIVED the same way the original constants were:
# cobraScaleTex()'s MEAN tone is about HALF its texMid stop, because most of the canvas
# is the near-black bottom of each scale gradient (using texMid flat makes the animal
# look twice as pale as it does in engine), then x the matA / matB tints.
# 2026-07-30h: every texMid is now NEAR-BLACK (3.8-5.4% luminance) with the hue carried
# as a channel ratio only, so the animal reads black from above; belly/spot stay fully
# saturated. midnight is the reference the other four were derived from.
PALETTES = [
    # id,         texMid,     tint,     belly,    spot
    ('acid',     0x081303, 0x97a88f, 0x2c5c04, 0x081204),
    ('midnight', 0x0a0b13, 0x8790a8, 0x020b46, 0x44290a),
    ('crimson',  0x130505, 0xa88f90, 0x520208, 0x3a1204),
    ('violet',   0x0e0813, 0x9c8fa8, 0x300650, 0x46280c),
    ('gold',     0x130f04, 0xa8a18f, 0x8a6408, 0x4a3402),
]
def _mul(col, tint):
    r=((col>>16)&255)*((tint>>16)&255)//255; g=((col>>8)&255)*((tint>>8)&255)//255
    b=(col&255)*(tint&255)//255; return (r<<16)|(g<<8)|b
def _half(col):
    return (((col>>16)&255)//2<<16) | (((col>>8)&255)//2<<8) | ((col&255)//2)

# Live palette globals — cobra_head()/cobra_body() read these at CALL time, so
# set_palette() before building each panel is all the parameterisation needed.
SKIN_A, SKIN_B, BELLY, SPOT = 0, 0, 0, 0
EYE, FANG, MOUTH = 0x7d4402, 0x6b6352, 0x0a0a0a      # shared by every morph
def set_palette(entry):
    global SKIN_A, SKIN_B, BELLY, SPOT
    _id, tex_mid, tint, belly, spot = entry
    SKIN_A = _half(tex_mid)
    SKIN_B = _mul(SKIN_A, tint)
    BELLY, SPOT = belly, spot
set_palette(PALETTES[1])                             # default = 'midnight', the original
SEGS, SPACING = 14, 0.72

def seg_radius(i):                        # snakeSegRadius() cobra branch
    t=min(1.0,i/max(1,SEGS-1)); return 0.32+(0.085-0.32)*t

def cobra_head(h):
    """The head Group at flare h (0..1) — setSnakeHood() drives the hood scale, the
    jaw's rotation.x and the fang group's y-scale off exactly this number."""
    f=[]
    f+=place(sph(0.26,SKIN_A,10),(0,0,0),sc=(0.92,0.55,1.20))                    # skull
    for s in (-1,1):                                                             # venom-gland cheeks
        f+=place(sph(0.125,SKIN_A,8),(s*0.145,-0.015,-0.05),sc=(0.85,0.62,1.25))
    f+=place(sph(0.155,SKIN_A,9),(0,-0.03,0.29),sc=(0.80,0.60,1.45))             # blunt snout
    for s in (-1,1):                                                             # brow ridge / scowl
        f+=place(box(0.10,0.026,0.155,SKIN_B),(s*0.152,0.093,0.10),ry=s*0.14,rz=-s*0.30)
    f+=place(sph(0.17,BELLY,9),(0,-0.115,0.10),sc=(0.94,0.40,1.45))              # blue throat
    for s in (-1,1):                                                             # amber eye + pupil
        f+=place(sph(0.050,EYE,7),(s*0.175,0.055,0.13))
        f+=place(sph(0.024,SKIN_A,5),(s*0.196,0.058,0.152))
    # JAW — gapes with the flare
    jaw=[]
    jaw+=place(sph(0.145,SKIN_A,9),(0,-0.045,0.19),sc=(0.86,0.40,1.62))          # chin
    jaw+=place(sph(0.115,MOUTH,8),(0,0.015,0.17),sc=(0.88,0.36,1.55))            # dark gape
    f+=place(jaw,(0,-0.05,0.01),rx=h*0.55)
    # FANGS — swing down out of the roof as the hood opens
    fangs=[]
    for s in (-1,1):
        fangs+=place(cone(0.026,0.17,6,FANG),(s*0.075,-0.075,0),rx=math.pi-0.30,rz=-s*0.10)
    f+=place(fangs,(0,-0.085,0.30),sc=(1,0.10+h*0.90,1))
    # TONGUE — forked, flicked out
    tng=[]
    tng+=box(0.018,0.012,0.14,0x0d0508,0,0,0.07)
    for s in (-1,1):
        tng+=place(box(0.013,0.010,0.10,0x0d0508),(s*0.024,0,0.185),ry=-s*0.40)
    f+=place(tng,(0,-0.075,0.47))
    # HOOD — one continuous spade membrane (ShapeGeometry off a bezier outline)
    outline=[(0.0,0.0)]
    outline+=bez((0,0),(-0.34,0.05),(-0.66,0.30),(-0.52,0.56),8)
    outline+=bez((-0.52,0.56),(-0.38,0.80),(0.38,0.80),(0.52,0.56),12)
    outline+=bez((0.52,0.56),(0.66,0.30),(0.34,0.05),(0,0),8)
    hood=[]
    front=shape_fan(outline,BELLY)
    for s in (-1,1):                                                             # spectacle eyespots
        front+=place(circle(0.078,12,SPOT),(s*0.195,0.48,0.030))
    front+=box(0.62,0.070,0.012,SKIN_A,0,0.26,0.030)                             # dark throat band
    hood+=place(shape_fan(outline,SKIN_A),(0,0,0.014),sc=(1.09,1.06,1))              # dark rim, cut proud
    hood+=place(front,(0,0,0.026))
    hood+=place(shape_fan(outline,SKIN_A),(0,0,-0.026),ry=math.pi,sc=(1.09,1.06,1))  # dark dorsal skin
    for a in (-1.02,-0.68,-0.34,0,0.34,0.68,1.02):                               # keels on the BACK only
        ln=0.68*(0.52+0.48*math.cos(a*1.30))                                     # rib Group, hinged at the nape
        hood+=place(place(box(0.046,ln,0.026,SKIN_B),(0,ln*0.5+0.04,-0.040)),rz=a)
    hood+=box(0.19,0.11,0.30,SKIN_A,0,0,-0.06)                                   # nape spar
    f+=place(hood,(0,0.03,-0.15),rx=-0.30,sc=(0.24+h*0.84, 0.34+h*0.80, 0.55+h*0.45))
    return f

def cobra_body(h=0.0):
    """Head + 14 segments on an S-curve, each with its wrapped ventral scute arc.
    Segment 0..4 flatten with the flare exactly as setSnakeHood() scales them."""
    f=[]; pts=[]
    for k in range(80):
        z=k*0.30; pts.append(((math.sin(k*0.30)*1.9), 0.0, z))
    def at_arc(arc):
        acc=0
        for i in range(1,len(pts)):
            d=math.dist(pts[i-1],pts[i])
            if acc+d>=arc:
                t=(arc-acc)/(d or 1)
                p=tuple(pts[i-1][j]+(pts[i][j]-pts[i-1][j])*t for j in range(3))
                return p,(pts[i][0]-pts[i-1][0],0,pts[i][2]-pts[i-1][2])
            acc+=d
        return pts[-1],(0,0,1)
    # layoutSnake(): the HEAD sits at arc 0 and segment i trails at (i+1)*SPACING
    # behind it, so segment 0 — the thickest — is the one against the neck. (The
    # pre-2026-07-27 version of this script walked the arc backwards and drew the
    # snake tail-first, which put the whip-thin end under the head.)
    for i in range(SEGS):
        r=seg_radius(i); arc=(i+1)*SPACING
        p,fwd=at_arc(arc); hd=math.atan2(fwd[0],fwd[2])
        k = h*(1-i/5) if i<5 else 0.0
        sc=(1+k*0.55, 1-k*0.26, 1)
        col = SKIN_A if (i%2==0) else SKIN_B
        y = (0.5+(0.3-0.5)*i/SEGS) + 0.95*h*max(0.0,1-i/4.5)
        seg=cylZ(r,r*0.9,SPACING*1.55,12,col)
        seg+=cylZ(r*1.045,r*0.9*1.045,SPACING*1.5,7,BELLY,-0.65,1.30,capped=False)
        f+=place(seg,(p[0],y,p[2]),ry=hd,sc=sc)
    p,fwd=at_arc(0.0); hd=math.atan2(fwd[0],fwd[2])
    f+=place(cobra_head(h),(p[0],0.5+0.95*h,p[2]),rx=h*0.22,ry=hd)
    return f

# ---------------- rasteriser (gamma-matched to the app) ----------------
LIGHT=norm((-0.4,0.8,0.55)); AMB, SUN = 0.55, 1.25
def shade(col,n):
    """Same path as the app: linear diffuse x (ambient + sun.n·L), then the
    sRGB encode renderer.outputEncoding applies on output."""
    k=AMB+SUN*max(0.0,sum(a*b for a,b in zip(n,LIGHT)))
    out=[]
    for c in hexrgb(col):
        v=min(1.0,(c/255.0)*k)
        out.append(int(round(255*(v**(1/2.2)))))
    return tuple(out)
def project(parts,W,H,yaw,pitch,bg,ground,fit=0.80):
    img=Image.new('RGB',(W,H),bg); d=ImageDraw.Draw(img,'RGBA')
    d.rectangle([0,int(H*0.66),W,H],fill=ground+(255,))
    tri=[]; pts=[]
    for verts,n,col in parts:
        vv=[rotx(roty(v,yaw),pitch) for v in verts]
        pts+=vv; tri.append((vv,rotx(roty(n,yaw),pitch),col))
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    ppu=(W*fit)/max(0.001,(max(xs)-min(xs)))
    ppu=min(ppu,(H*fit)/max(0.001,(max(ys)-min(ys))))
    cx=W/2-(min(xs)+max(xs))/2*ppu; cy=H*0.52+(min(ys)+max(ys))/2*ppu
    scr=lambda p:(cx+p[0]*ppu, cy-p[1]*ppu)
    tri.sort(key=lambda t:sum(p[2] for p in t[0])/len(t[0]))
    for vv,nn,col in tri:
        fill=shade(col,norm(nn))
        d.polygon([scr(p) for p in vv],fill=fill,
                  outline=tuple(max(0,c-10) for c in fill))
    return img
def font(s):
    for p in ['/System/Library/Fonts/Helvetica.ttc','/System/Library/Fonts/Supplemental/Arial.ttf']:
        try: return ImageFont.truetype(p,s)
        except: pass
    return ImageFont.load_default()

PW,PH=620,470; th=54
panels=[('HOOD FOLDED — cruising',        place(cobra_head(0.0)), 0.80, 0.18, (206,196,172), 0.62),
        ('HOOD FLARED — head-on',         place(cobra_head(1.0)), 0.02, 0.06, (206,178,178), 0.80),
        ('HOOD FLARED — 3/4',             place(cobra_head(1.0)), 0.72, 0.20, (200,186,186), 0.78),
        ('REARED — ventral scutes, taper',cobra_body(0.85),       0.62, 0.42, (196,182,150), 0.86)]
sheet=Image.new('RGB',(PW*len(panels),th+PH),(24,24,28)); d=ImageDraw.Draw(sheet)
d.text((20,16),'Survive the Savannah — BLACK COBRA (offline render of the actual procedural mesh)',
       font=font(19),fill=(241,196,15))
for i,(label,parts,yaw,pitch,bg,fit) in enumerate(panels):
    panel=project(parts,PW,PH,yaw,pitch,bg,tuple(int(c*0.8) for c in bg),fit)
    dd=ImageDraw.Draw(panel)
    dd.rectangle([0,0,PW-1,PH-1],outline=(60,60,66),width=2)
    dd.rectangle([12,12,22,34],fill=(91,47,138))
    dd.text((30,12),label,font=font(16),fill=(20,20,20))
    sheet.paste(panel,(i*PW,th))
out='/Users/openclaw/Documents/lion-survival/dossiers/cobra_render.png'
sheet.save(out); print('wrote',out,sheet.size)

# ==================== SHEET 2: the five COLOUR MORPHS ====================
# Same mesh, same pose, same light — only the palette changes. Two rows: the flared
# head (where the hood membrane and the spectacle marking carry the colour) and the
# reared body (where the scale mass and the ventral scutes do).
MW,MH=430,400; mth=58
# Steven asked specifically for top + side, to confirm "black from above" holds while
# the belly/hood identity still reads. pitch ~1.30 rad is a near-top-down camera.
rows=[('TOP-DOWN (dorsal)', lambda: cobra_body(0.0),        0.00, 1.30, 0.88),
      ('SIDE',              lambda: cobra_body(0.85),       0.62, 0.22, 0.86),
      ('HOOD FLARED (front)', lambda: place(cobra_head(1.0)), 0.10, 0.08, 0.80)]
msheet=Image.new('RGB',(MW*len(PALETTES), mth+MH*len(rows)),(24,24,28))
md=ImageDraw.Draw(msheet)
md.text((20,10),'Survive the Savannah — BLACK COBRA colour morphs (offline render, gamma-matched to the app)',
        font=font(19),fill=(241,196,15))
md.text((20,34),'acid-green 23.75%   ·   black 23.75%   ·   crimson 23.75%   ·   dark-violet 23.75%   ·   GOLD 5%',
        font=font(15),fill=(170,170,178))
for ri,(rlabel,build,yaw,pitch,fit) in enumerate(rows):
    for ci,entry in enumerate(PALETTES):
        set_palette(entry)
        bg=[(198,190,172),(194,182,156),(200,192,176)][ri]
        panel=project(build(),MW,MH,yaw,pitch,bg,tuple(int(c*0.8) for c in bg),fit)
        dd=ImageDraw.Draw(panel)
        dd.rectangle([0,0,MW-1,MH-1],outline=(60,60,66),width=2)
        dd.rectangle([12,12,26,34],fill=hexrgb(entry[3]))          # belly swatch
        dd.rectangle([28,12,42,34],fill=hexrgb(_half(entry[1])))   # skin swatch
        dd.text((50,14),entry[0].upper()+'  ·  '+rlabel,font=font(15),fill=(20,20,20))
        msheet.paste(panel,(ci*MW, mth+ri*MH))
out2='/Users/openclaw/Documents/lion-survival/dossiers/cobra_morphs.png'
msheet.save(out2); print('wrote',out2,msheet.size)
