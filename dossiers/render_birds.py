#!/usr/bin/env python3
"""Offline render of the THREE BIRDS — 🦅 martial eagle and 🦩 secretary bird, next to
the existing 🦅 sky vulture for scale — by projecting their exact makeMartialEagle() /
makeSecretaryBird() / makeSkyVulture() geometry with the same painter's rasteriser the
other creature dossiers use. The in-app WebGL pane composites blank/black from a headless
driver even while renderer.info.render reports ~2950 draw calls, so the mesh is rebuilt
offline instead (see the Tooling note in CONTEXT.md).

⚠ Shading model matches the app: renderer.outputEncoding is sRGBEncoding while colours go
in un-decoded, so the framebuffer is gamma-lifted on the way out and everything renders
~2× lighter than its hex. Reproduced here in shade() — an ungamma'd sheet would show the
birds far darker than the game does and you'd grade the colours wrong.

The point of the sheet is the SILHOUETTE TEST from the brief: three birds you can tell
apart at a glance. Vulture = small bald pale head on a long bare neck, hard-flapping,
mid altitude. Eagle = bigger, dark hood + white throat + pale spotted belly, wings held
DEAD LEVEL with four splayed primary fingers, highest altitude. Secretary bird = walks;
absurd legs, black quill crest, bare orange face, two long tail streamers.

⚠ Known artifact, offline only: a painter's rasteriser with no depth buffer sorts whole
polygons by centroid, so thin plates (wing fingers, crest quills) can bleed through a
body they are actually behind. In engine every material has depthTest+depthWrite on.
"""
import math
from PIL import Image, ImageDraw, ImageFont

# ---- vector helpers -------------------------------------------------------
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

# ---- local primitives (faces in local space) ------------------------------
def box(w,h,d,col,cx=0,cy=0,cz=0):
    hx,hy,hz=w/2,h/2,d/2
    V=[(cx-hx,cy-hy,cz-hz),(cx+hx,cy-hy,cz-hz),(cx+hx,cy+hy,cz-hz),(cx-hx,cy+hy,cz-hz),
       (cx-hx,cy-hy,cz+hz),(cx+hx,cy-hy,cz+hz),(cx+hx,cy+hy,cz+hz),(cx-hx,cy+hy,cz+hz)]
    F=[([0,1,2,3],(0,0,-1)),([5,4,7,6],(0,0,1)),([4,0,3,7],(-1,0,0)),
       ([1,5,6,2],(1,0,0)),([3,2,6,7],(0,1,0)),([4,5,1,0],(0,-1,0))]
    return [([V[i] for i in idx],n,col) for idx,n in F]
def cone(r,h,seg,col):
    """ConeGeometry(r,h,seg) — apex at +h/2, base at -h/2, axis Y (three's default)."""
    f=[]; apex=(0,h/2,0); slope=r/h
    for i in range(seg):
        a0=2*math.pi*i/seg; a1=2*math.pi*(i+1)/seg; am=(a0+a1)/2
        b0=(r*math.cos(a0),-h/2,r*math.sin(a0)); b1=(r*math.cos(a1),-h/2,r*math.sin(a1))
        f.append(([apex,b1,b0], norm((math.cos(am),slope,math.sin(am))), col))
        f.append(([(0,-h/2,0),b0,b1],(0,-1,0),col))
    return f
def cylY(rt,rb,h,seg,col):
    """CylinderGeometry(rt,rb,h,seg) in three's own orientation: axis Y, rt at +h/2."""
    f=[]
    for i in range(seg):
        a0=2*math.pi*i/seg; a1=2*math.pi*(i+1)/seg; am=(a0+a1)/2
        def P(r,y,a): return (r*math.sin(a), y, r*math.cos(a))
        b0=P(rb,-h/2,a0); b1=P(rb,-h/2,a1); t0=P(rt,h/2,a0); t1=P(rt,h/2,a1)
        n=(math.sin(am),0,math.cos(am))
        f.append(([b0,b1,t1,t0],n,col))
        f.append(([(0,h/2,0),t0,t1],(0,1,0),col)); f.append(([(0,-h/2,0),b1,b0],(0,-1,0),col))
    return f
def cylZ(rt,rb,h,seg,col):
    """…the same cylinder with mesh.rotation.x = PI/2 applied: length along +Z, rt forward.
    rotateX(PI/2) maps (x,y,z) -> (x,-z,y)."""
    return [([(v[0],-v[2],v[1]) for v in vs],(n[0],-n[2],n[1]),c) for vs,n,c in cylY(rt,rb,h,seg,col)]
def sph(r,col,seg=8):
    f=[]
    for i in range(seg):
        for j in range(seg):
            a0,a1=math.pi*i/seg,math.pi*(i+1)/seg
            b0,b1=2*math.pi*j/seg,2*math.pi*(j+1)/seg
            def P(a,b): return (r*math.sin(a)*math.cos(b), r*math.cos(a), r*math.sin(a)*math.sin(b))
            f.append(([P(a0,b0),P(a1,b0),P(a1,b1),P(a0,b1)], norm(P((a0+a1)/2,(b0+b1)/2)), col))
    return f
def place(faces,pos=(0,0,0),rx=0.0,ry=0.0,rz=0.0,sc=None):
    """Local scale, then rotation X->Y->Z (three's default Euler 'XYZ'), then translate."""
    sx,sy,sz=(sc or (1,1,1)); inv=(1/sx,1/sy,1/sz)
    def T(v): return add(rotz(roty(rotx((v[0]*sx,v[1]*sy,v[2]*sz),rx),ry),rz),pos)
    def R(n): return norm(rotz(roty(rotx((n[0]*inv[0],n[1]*inv[1],n[2]*inv[2]),rx),ry),rz))
    return [([T(v) for v in vs],R(n),c) for vs,n,c in faces]

# ==================== MARTIAL EAGLE — colours straight from makeMartialEagle() ====
E_DARK, E_BLACK, E_HOOD = 0x1f1408, 0x0a0703, 0x0c0802
E_PALE, E_WHITE = 0xb8ab92, 0xdcd8ca
E_BEAK, E_CERA, E_EYE, E_PUP = 0x1e1e22, 0xa87c10, 0xbe9200, 0x080808

def eagle(flap=0.0, foot=0.0, sweep=0.0, phase=0.0):
    """The whole group. animateEagle()'s rig: wings roll about Z (level = ±0.06 plus a
    barely-breathing sine) and yaw about Y to sweep back; feet tuck at -1.5*(1-foot)."""
    f=[]
    f+=place(cylZ(0.42,0.22,2.05,10,E_DARK))                      # fuselage
    f+=box(0.60,0.44,1.05,E_DARK, 0,0.03,0.10)                    # chest
    f+=box(0.50,0.16,1.22,E_PALE, 0,-0.26,0.02)                   # PALE MOTTLED BELLY
    for sx,sz in [(-0.13,0.30),(0.12,0.10),(-0.04,-0.13),(0.15,-0.34),(-0.16,-0.02)]:
        f+=box(0.08,0.045,0.08,E_HOOD, sx,-0.335,sz)              # …its dark spotting
    f+=box(0.38,0.36,0.34,E_HOOD, 0,0.16,1.02)                    # short thick neck
    f+=box(0.40,0.40,0.48,E_HOOD, 0,0.31,1.30)                    # near-black hood/skull
    f+=box(0.30,0.17,0.28,E_WHITE, 0,0.145,1.36)                  # WHITE THROAT
    f+=place(cone(0.075,0.22,7,E_HOOD),(0,0.55,1.18),rx=-0.35)    # nape crest
    f+=place(cone(0.06,0.17,7,E_HOOD),(-0.11,0.53,1.14),rx=-0.35)
    f+=place(cone(0.06,0.17,7,E_HOOD),( 0.11,0.53,1.14),rx=-0.35)
    for s in (-1,1):                                              # BIG YELLOW EYES
        f+=place(sph(0.095,E_EYE,8),(s*0.155,0.35,1.47))
        f+=place(sph(0.046,E_PUP,6),(s*0.168,0.35,1.55))
    f+=box(0.42,0.07,0.22,E_HOOD, 0,0.46,1.47)                    # brow ridge
    f+=box(0.18,0.15,0.12,E_CERA, 0,0.25,1.50)                    # yellow cere
    f+=place(cone(0.115,0.40,7,E_BEAK),(0,0.22,1.68),rx=math.pi/2+0.30)
    f+=place(cone(0.065,0.21,7,E_BEAK),(0,0.11,1.85),rx=math.pi)  # the hook
    f+=box(0.86,0.06,1.10,E_BLACK, 0,0.02,-1.56)                  # wedge tail
    a = math.sin(phase)*flap if flap>0.02 else math.sin(phase)*0.035
    for s in (1,-1):                                              # WINGS
        w=[]
        w+=box(1.45,0.08,0.92,E_DARK, s*0.80,0,0.02)
        w+=box(1.30,0.05,0.70,E_PALE, s*0.80,-0.055,0.04)         # pale under-coverts
        w+=place(box(1.60,0.06,0.70,E_BLACK),(s*2.05,0,-0.10),ry=s*-0.12)
        for k in range(4):                                        # four splayed primaries — one HAND
            w+=place(box(0.86,0.045,0.15,E_BLACK),(s*(2.86+k*0.05), 0.01*k, -0.20-k*0.15),
                     ry=s*(-0.14-k*0.10), rz=s*(0.03+k*0.035))
        rollz = (0.06+a) if s==1 else -(0.06+a)
        f+=place(w,(s*0.30,0.16,0.06), ry=s*sweep*1.15, rz=rollz)
    tuck=-1.5*(1-foot)
    for s in (1,-1):                                              # FEET / talons
        g=[]
        g+=place(cylY(0.07,0.06,0.50,6,E_CERA),(0,-0.25,0))
        for tx in (-0.11,0,0.11):
            g+=place(cone(0.045,0.26,5,E_PUP),(tx,-0.54,0.09),rx=math.pi-0.45)
        g+=place(cone(0.04,0.22,5,E_PUP),(0,-0.54,-0.09),rx=math.pi+0.45)
        f+=place(g,(s*0.16,-0.16,-0.05),rx=tuck)
    return place(f,sc=(1.15,1.15,1.15))                           # group.scale 1.15

# ==================== SECRETARY BIRD — from makeSecretaryBird() ==================
S_GREY, S_WHITE, S_BLACK = 0x8a8f96, 0xd2d0c8, 0x0a0a0a
S_ORANGE, S_BEAK, S_LEG, S_EYE = 0xa8380c, 0x3a4048, 0x9c968a, 0x080808

def secretary(gait=0.0, bristle=0.0, open_=0.0, phase=0.0):
    f=[]
    f+=place(cylZ(0.28,0.19,1.05,10,S_GREY),(0,1.46,0))            # torso, carried HIGH
    f+=box(0.36,0.30,0.70,S_WHITE, 0,1.40,0.26)                    # white breast
    f+=box(0.42,0.22,0.58,S_BLACK, 0,1.30,-0.30)                   # black rump
    for s in (1,-1):                                               # folded/opening wings
        w=[]
        w+=box(0.12,0.26,0.72,S_GREY,  s*0.05,-0.06,0.0)
        w+=box(0.10,0.20,0.86,S_BLACK, s*0.09,-0.18,-0.34)
        if open_>0.15:
            w+=box(1.15,0.06,0.62,S_GREY,  s*0.62,-0.02,0.0)
            w+=box(0.95,0.05,0.44,S_BLACK, s*1.62,-0.02,-0.14)
        f+=place(w,(s*0.28,1.52,0.02), rz=-s*open_*0.35)
    f+=place(cylY(0.085,0.115,0.76,8,S_WHITE),(0,1.87,0.36),rx=-0.46)   # long SLENDER neck
    f+=box(0.22,0.21,0.30,S_GREY, 0,2.20,0.62)                     # small skull
    f+=box(0.205,0.155,0.055,S_ORANGE, 0,2.185,0.775)              # BARE ORANGE FACE
    f+=box(0.045,0.15,0.20,S_ORANGE, -0.108,2.19,0.68)
    f+=box(0.045,0.15,0.20,S_ORANGE,  0.108,2.19,0.68)
    f+=box(0.05,0.05,0.045,S_EYE, -0.10,2.225,0.745)
    f+=box(0.05,0.05,0.045,S_EYE,  0.10,2.225,0.745)
    f+=place(cone(0.062,0.26,6,S_BEAK),(0,2.15,0.88),rx=math.pi/2+0.25)
    f+=place(cone(0.035,0.12,6,S_BEAK),(0,2.085,0.98),rx=math.pi)
    crest=[]                                                       # BLACK QUILL CREST
    for qx in (-0.10,-0.06,-0.02,0.02,0.06,0.10):
        ln=0.50-abs(qx)*1.4
        crest+=place(cone(0.016,ln,5,S_BLACK),
                     (qx, ln*0.30, -0.09-abs(qx)*0.5),
                     rx=(1.28+abs(qx)*0.6)-bristle*1.15,           # swings up off the nape
                     rz=qx*2.2*(1+bristle*1.6))                    # …and fans wider
    f+=place(crest,(0,2.27,0.51))
    f+=box(0.34,0.05,0.52,S_GREY, 0,1.28,-0.78)                    # short fan
    f+=place(box(0.055,0.045,1.35,S_BLACK),(-0.05,1.20,-1.42),rx=0.16)   # two long streamers
    f+=place(box(0.055,0.045,1.35,S_BLACK),( 0.05,1.18,-1.44),rx=0.18)
    for i,s in enumerate((1,-1)):                                  # VERY LONG LEGS
        l=[]
        l+=place(cylY(0.105,0.075,0.50,6,S_BLACK),(0,-0.25,0))     # feathered thigh
        l+=place(cylY(0.052,0.045,0.78,6,S_LEG),(0,-0.89,0))       # long bare shank
        l+=box(0.13,0.06,0.20,S_LEG, 0,-1.29,0.05)
        for tx in (-0.05,0.0,0.05):
            l+=place(cone(0.024,0.16,4,S_LEG),(tx,-1.30,0.17),rx=math.pi/2)
        f+=place(l,(s*0.17,1.26,-0.06), rx=math.sin(phase+i*math.pi)*(0.10+gait*0.55))
    return f

# ==================== SKY VULTURE — unchanged, for the scale comparison ==========
V_DARK, V_BLACK, V_PALE, V_BEAK, V_FOOT, V_EYE = 0x241a10,0x120d07,0xcabfa6,0x2a2018,0x6b5a3e,0x0a0a0a
def vulture(flap=0.55, phase=0.9):
    f=[]
    f+=place(cylZ(0.34,0.20,1.8,10,V_DARK))
    f+=box(0.52,0.36,0.95,V_DARK, 0,0.02,0.05)
    f+=place(cone(0.15,0.5,7,V_PALE),(0,0.14,0.9),rx=-0.5)          # long bare neck
    f+=box(0.28,0.26,0.32,V_PALE, 0,0.32,1.12)                      # small bald head
    f+=place(cone(0.09,0.28,7,V_BEAK),(0,0.27,1.34),rx=math.pi/2+0.35)
    f+=box(0.05,0.05,0.05,V_EYE, -0.12,0.36,1.16); f+=box(0.05,0.05,0.05,V_EYE, 0.12,0.36,1.16)
    f+=box(0.75,0.05,0.80,V_BLACK, 0,0,-1.35)
    a=math.sin(phase)*flap
    for s in (1,-1):
        w=[]
        w+=box(1.3,0.06,0.66,V_DARK, s*0.72,0,0)
        w+=place(box(1.5,0.05,0.46,V_BLACK),(s*1.82,0,-0.08),ry=s*-0.16)
        w+=box(0.72,0.04,0.16,V_BLACK, s*2.66,0,-0.22)
        f+=place(w,(s*0.26,0.14,0.05), rz=(0.12+a) if s==1 else -(0.12+a))
    for s in (1,-1):
        g=[]
        g+=place(cylY(0.05,0.05,0.44,6,V_FOOT),(0,-0.22,0))
        for tx in (-0.09,0,0.09):
            g+=place(cone(0.03,0.2,5,V_FOOT),(tx,-0.46,0.07),rx=math.pi-0.5)
        f+=place(g,(s*0.13,-0.14,-0.1),rx=-1.4)
    return f

# ---------------- rasteriser (gamma-matched to the app) ----------------------
LIGHT=norm((-0.4,0.8,0.55)); AMB, SUN = 0.55, 1.25
def shade(col,n):
    k=AMB+SUN*max(0.0,sum(a*b for a,b in zip(n,LIGHT)))
    out=[]
    for c in hexrgb(col):
        v=min(1.0,(c/255.0)*k)
        out.append(int(round(255*(v**(1/2.2)))))
    return tuple(out)
def project(parts,W,H,yaw,pitch,bg,ground,fit=0.80,horizon=0.66):
    img=Image.new('RGB',(W,H),bg); d=ImageDraw.Draw(img,'RGBA')
    d.rectangle([0,int(H*horizon),W,H],fill=ground+(255,))
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
        d.polygon([scr(p) for p in vv],fill=fill,outline=tuple(max(0,c-10) for c in fill))
    return img
def font(s):
    for p in ['/System/Library/Fonts/Helvetica.ttc','/System/Library/Fonts/Supplemental/Arial.ttf']:
        try: return ImageFont.truetype(p,s)
        except: pass
    return ImageFont.load_default()

# ---------------- the sheet ----------------
PW,PH=560,470; TH=54
SKY=(150,178,206); DUST=(196,182,150)
panels=[
  ('🦅 EAGLE — soaring, wings DEAD LEVEL', eagle(0,0,0,0.6),            0.72,0.24, SKY, 0.86),
  ('🦅 EAGLE — stoop: wings tucked, talons out', eagle(0,0.9,1.0,0.6),  0.62,0.30, SKY, 0.80),
  ('🦅 EAGLE — head: hood, white throat, yellow eye', eagle(0,0,0,0.6), 1.05,0.10, SKY, 2.40),
  ('🦩 SECRETARY BIRD — striding',        secretary(0.45,0,0,0.9),      0.72,0.14, DUST,0.88),
  ('🦩 SECRETARY BIRD — crest BRISTLED on the stomp', secretary(0.3,1.0,0,2.4), 0.72,0.14, DUST,0.88),
  ('🦅 SKY VULTURE (unchanged) — for scale', vulture(),                 0.72,0.24, SKY, 0.86),
]
sheet=Image.new('RGB',(PW*3, TH+PH*2),(24,24,28)); d=ImageDraw.Draw(sheet)
d.text((20,16),'Survive the Savannah — MARTIAL EAGLE + SECRETARY BIRD (offline render of the actual procedural meshes; vulture shown unchanged, for scale)',
       font=font(17),fill=(241,196,15))
for i,(label,parts,yaw,pitch,bg,fit) in enumerate(panels):
    panel=project(parts,PW,PH,yaw,pitch,bg,tuple(int(c*0.78) for c in bg),fit)
    dd=ImageDraw.Draw(panel)
    dd.rectangle([0,0,PW-1,PH-1],outline=(60,60,66),width=2)
    dd.text((14,12),label,font=font(15),fill=(16,16,16))
    sheet.paste(panel,((i%3)*PW, TH+(i//3)*PH))
out='/Users/openclaw/Documents/lion-survival/dossiers/birds_render.png'
sheet.save(out); print('wrote',out,sheet.size)
