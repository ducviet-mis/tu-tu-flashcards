"""Rasterize the supplied card mark into PWA PNG sizes using only Python's standard library."""
from pathlib import Path
import math,struct,zlib
ROOT=Path(__file__).resolve().parents[1]/'assets'/'images'
def rounded_distance(x,y,cx,cy,w,h,r):
    qx=abs(x-cx)-(w/2-r);qy=abs(y-cy)-(h/2-r)
    return math.hypot(max(qx,0),max(qy,0))+min(max(qx,qy),0)-r
def unrotate(x,y,cx,cy,degrees):
    a=math.radians(-degrees);dx=x-cx;dy=y-cy
    return cx+dx*math.cos(a)-dy*math.sin(a),cy+dx*math.sin(a)+dy*math.cos(a)
def segment_distance(x,y,a,b):
    vx=b[0]-a[0];vy=b[1]-a[1];t=max(0,min(1,((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy)))
    return math.hypot(x-a[0]-t*vx,y-a[1]-t*vy)
def png(size,maskable=False):
    dark=(21,21,21);purple=(108,99,245);yellow=(247,201,72);white=(255,255,255)
    curve=[((1-t)**2*56+2*(1-t)*t*70+t*t*84,(1-t)**2*64+2*(1-t)*t*78+t*t*64)for t in[i/24 for i in range(25)]]
    raw=bytearray()
    for py in range(size):
        raw.append(0)
        for px in range(size):
            gx=(px+.5)*200/size;gy=(py+.5)*200/size
            alpha=255 if maskable or rounded_distance(gx,gy,100,100,200,200,52)<=0 else 0
            color=purple;x=(gx-36)/1.1;y=(gy-34)/1.1
            bx,by=unrotate(x,y,46,62,-14);distance=rounded_distance(bx,by,46,63,64,82,14)
            if distance<=2:color=dark if distance>-2 else yellow
            fx,fy=unrotate(x,y,72,58,8);distance=rounded_distance(fx,fy,70,55,64,82,14)
            if distance<=2:
                color=dark if distance>-2 else white
                if math.hypot(fx-58,fy-46)<=5.5 or math.hypot(fx-82,fy-46)<=5.5:color=dark
                if 53<=fx<=87 and 61<=fy<=74 and min(segment_distance(fx,fy,a,b)for a,b in zip(curve,curve[1:]))<=2:color=dark
            raw.extend((*color,alpha))
    def chunk(kind,data):return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
for size in [192,512]:(ROOT/f'icon-{size}.png').write_bytes(png(size))
(ROOT/'icon-maskable-512.png').write_bytes(png(512,True))
print('Generated 192px, 512px and maskable PNG icons.')
