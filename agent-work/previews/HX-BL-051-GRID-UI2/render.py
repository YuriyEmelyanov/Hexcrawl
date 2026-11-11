from PIL import Image,ImageDraw,ImageFont
import math,textwrap
from pathlib import Path
f='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(n):return ImageFont.truetype(f,n)
def poly(x,y,s):return [(x+math.cos(math.radians(30+i*60))*s/math.sqrt(3),y+math.sin(math.radians(30+i*60))*s/math.sqrt(3))for i in range(6)]
for width in [1500,390,320]:
 narrow=width<600; cw=width-24 if narrow else (width-72)//2; ch=390; rows=4 if narrow else 2
 out=Image.new('RGB',(width,150+rows*(ch+16)), '#0f1521');d=ImageDraw.Draw(out)
 d.text((12,12),'GRID-UI2 · Предложение',font=font(18),fill='#e8ecf2');d.text((12,42),'Не реализация. Одна карта, одна сетка.',font=font(13),fill='#b5c6dc')
 d.text((12,68),'Камера меняется вместе с размером гекса.',font=font(12),fill='#b5c6dc')
 for i,s in enumerate([6,1,12,24]):
  x=12 if narrow else 24+(i%2)*(cw+24);y=112+(i if narrow else i//2)*(ch+16)
  d.rounded_rectangle((x,y,x+cw,y+ch),radius=9,fill='#0c1423',outline='#375386');d.text((x+12,y+10),f'Гекс {s} '+('миля' if s==1 else 'миль'),font=font(15),fill='white')
  m=Image.new('RGB',(cw-2,235),'#0c1423');a=ImageDraw.Draw(m);unit=48;scale=unit/s;cx=(cw-2)/2;cy=110
  xy=lambda wx,wy:(cx+wx*scale,cy+wy*scale)
  for j,(q,r)in enumerate([(-1,0),(0,0),(1,0),(0,1),(1,-1),(-1,1),(0,-1)]):
   px,py=xy(6*(q+r/2),6*math.sqrt(3)/2*r);a.polygon(poly(px,py,6*scale),fill='#627c4c' if j in [0,1,5,6] else '#ad9557')
  for r in range(-5,6):
   for q in range(-9,10):a.line(poly(cx+unit*(q+r/2),cy+unit*math.sqrt(3)/2*r,unit)+[poly(cx+unit*(q+r/2),cy+unit*math.sqrt(3)/2*r,unit)[0]],fill='#6d8197',width=1)
  a.line([xy(-3,-10),xy(-2,-3),xy(1,2),xy(4,9)],fill='#63b7ff',width=3)
  for wx,wy,t in [(0,0,'Город'),(5,1,'Башня'),(-4,4,'Мельница')]:
   px,py=xy(wx,wy);a.ellipse((px-4,py-4,px+4,py+4),fill='#ffdb8c');
   if s<=6:a.text((px+7,py-17),t,font=font(11),fill='white')
  if s>=12:a.text((cx+10,cy-22),'3 места',font=font(12),fill='white')
  if s==1:
   # Illustrative shared outer footprint, without internal POI boundary.
   a.line([(cx-24,cy-14),(cx,cy-28),(cx+24,cy-14),(cx+48,cy-28),(cx+72,cy-14),(cx+72,cy+14),(cx+48,cy+28),(cx+24,cy+14),(cx,cy+28),(cx-24,cy+14),(cx-24,cy-14)],fill='#ffdb8c',width=3)
  a.polygon(poly(cx+48,cy+41.6,48),fill=None,outline='#a2d7ff',width=3)
  out.paste(m,(x+1,y+36));d.rectangle((x+1,y+272,x+cw-1,y+ch-1),fill='#0f1726')
  d.text((x+12,y+282),'Расположение · 0, 0',font=font(12),fill='#c3d0e1');d.rounded_rectangle((x+12,y+304,x+min(cw-12,190),y+348),radius=6,fill='#17253c',outline='#375386');d.text((x+22,y+317),f'Гекс {s} '+('миля' if s==1 else 'миль')+'  ▾',font=font(14),fill='white')
  message='Город · только местная часть' if s==1 else 'Лес, равнина · 3 места' if s>=12 else 'Стандартная карточка'
  d.text((x+12,y+360),message,font=font(12),fill='#b5c6dc')
 out.save(f'/tmp/detail-grid-amendment/proposal-{width}.png')
print('Rendered proposal PNGs: 1500,390,320; Python/Pillow fallback, not browser screenshots')
