from pathlib import Path
from html import escape
import math

OUT=Path(__file__).parent
BG='#0c1423'; PANEL='#101b2d'; BORDER='#304b72'; TEXT='#e5eaf3'; MUTED='#a9b8ce'
def rect(x,y,w,h,fill=PANEL,stroke=BORDER,r=10,extra=''):
 return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" {extra}/>'
def text(x,y,s,size=16,color=TEXT,weight=400):
 return f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" font-weight="{weight}">{escape(s)}</text>'
def button(x,y,w,label,disabled=False):
 return rect(x,y,w,44,'#0e1829')+text(x+12,y+28,label,15,'#6d7a8e' if disabled else TEXT)
def select(x,y,w,label):
 return rect(x,y,w,44,'#0e1829',BORDER,8)+text(x+12,y+28,label,16)+text(x+w-23,y+28,'⌄',19)
def field(x,y,w,label):
 return rect(x,y,w,44,'#0e1829',BORDER,8)+text(x+12,y+28,label,16)
def frame(w,h):
 caption='ПРЕДЛОЖЕНИЕ · ONE-MILE1 UI1 · не реализация' if w>500 else 'МАКЕТ · 1 миля · не реализация'
 return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="100%" height="100%" fill="{BG}"/><g font-family="DejaVu Sans, sans-serif">'+rect(0,0,w,38,'#293756','#617ca9',0)+text(14,25,caption,14,'#ffffff',700)
def hexes(cx,cy,size,narrow=False):
 out=''; coords=[]
 radius=1 if narrow else 2
 def pos(q,r):return cx+size*math.sqrt(3)*(q+r/2),cy+size*1.5*r
 def pts(q,r):
  x,y=pos(q,r);return ' '.join(f'{x+size*math.cos(math.radians(60*i-30)):.2f},{y+size*math.sin(math.radians(60*i-30)):.2f}' for i in range(6))
 def dist(q,r):return max(abs(q),abs(r),abs(q+r))
 for q in range(-radius-1,radius+2):
  for r in range(-radius-1,radius+2):
   d=dist(q,r)
   if d>radius+1:continue
   x,y=pos(q,r);p=pts(q,r)
   if d==radius+1:
    out+=f'<polygon points="{p}" fill="none" stroke="#70829a" stroke-width="1.3" stroke-dasharray="5 4"/>'
    continue
   kind=(q-r)%3;fill=['#bfd884','#83ad76','#bba66b'][kind]
   if q==0 and r==0:fill='#83ad76';kind=1
   out+=f'<polygon points="{p}" fill="{fill}" stroke="#5b6c72" stroke-width="1.3"/>'
   if kind==1:
    for dx,dy in [(-size*.25,size*.1),(size*.18,size*.2),(0,-size*.24)]:
     xx=x+dx; yy=y+dy;s=size*.2
     out+=f'<path d="M{xx-s},{yy+s} L{xx},{yy-s} L{xx+s},{yy+s} Z" fill="#3c673d"/><path d="M{xx},{yy+s}v{size*.09}" stroke="#455838" stroke-width="2"/>'
   elif kind==2:
    out+=f'<path d="M{x-size*.5},{y+size*.3} L{x-size*.1},{y-size*.32} L{x+size*.12},{y+size*.12} L{x+size*.35},{y-size*.15} L{x+size*.55},{y+size*.3} Z" fill="#736737"/>'
   else:
    for dx in [-.3,0,.3]:out+=f'<path d="M{x+size*dx-4},{y+8}l4,-11l4,11M{x+size*dx},{y+8}v-17" fill="none" stroke="#79914b" stroke-width="2"/>'
 x1,y1=pos(-radius,0);x2,y2=pos(radius,0)
 out+=f'<path d="M{x1},{y1} L{x2},{y2}" fill="none" stroke="#6d512f" stroke-width="4"/>'
 out+=f'<path d="M{cx-12},{cy-size*radius*1.55} Q{cx+size*.6},{cy-size*.7} {cx-4},{cy} Q{cx-size*.5},{cy+size*.7} {cx+12},{cy+size*radius*1.55}" fill="none" stroke="#477b9c" stroke-width="8"/>'
 out+=f'<path d="M{cx-12},{cy-size*radius*1.55} Q{cx+size*.6},{cy-size*.7} {cx-4},{cy} Q{cx-size*.5},{cy+size*.7} {cx+12},{cy+size*radius*1.55}" fill="none" stroke="#96cce1" stroke-width="3"/>'
 out+=f'<path d="M{x1},{y1+size*.45} Q{cx-size*.5},{cy+size*.8} {x2},{y2+size*.45}" fill="none" stroke="#725c37" stroke-width="2" stroke-dasharray="5 4"/>'
 out+=f'<polygon points="{pts(0,0)}" fill="none" stroke="#f3c455" stroke-width="4"/>'
 out+=f'<path d="M{cx-14},{cy-6}h25M{cx-14},{cy+6}h25" stroke="#f1e3bf" stroke-width="3"/>'
 hx,hy=cx+size*.35,cy-size*.33;out+=rect(hx-9,hy-6,18,14,'#efe0b3','#5e4b36',1)+f'<path d="M{hx-13},{hy-6}l13,-13l13,13" fill="#714f3a"/>'
 return out
def controls(x,y,w):
 o=rect(x,y,w,88)+text(x+12,y+22,'Режим',13,MUTED)+select(x+12,y+31,w-24,'Классический режим')
 y+=100;o+=text(x+4,y+22,'□  Knave 2e',16)
 y+=35;cw=(w-40)/4
 for i,(a,b) in enumerate([('РАЗМЕР','Авто'),('ТИП','Авто'),('БИОМ','Авто'),('БЕРЕГ','Авто')]):
  xx=x+8+i*(cw+8);o+=text(xx,y+15,a,10,MUTED)+select(xx,y+22,cw,b)
 y+=78;o+=rect(x,y,w,142)+button(x+12,y+12,(w-32)/2,'Гексы · Тайлы')+button(x+20+(w-32)/2,y+12,(w-32)/2,'Места · Значки')+select(x+12,y+82,w-24,'Гекс 1 миля')
 y+=154;bw=(w-32)/2;o+=button(x+12,y,bw,'Отменить')+button(x+20+bw,y,bw,'Повторить')
 y+=56;o+=button(x+12,y,bw,'Выгрузить')+button(x+20+bw,y,bw,'Загрузить JSON')
 y+=56;o+=rect(x,y,w,58)+text(x+12,y+35,'Seed мира',14,MUTED)+text(x+w-82,y+35,'42',16)
 return o,y+70
def card(x,y,w,edit=False,error=False,water=False):
 h=310 if not edit else (416 if error else 380)
 o=rect(x,y,w,h)+text(x+14,y+31,'Переправа',20,TEXT,700)+text(x+14,y+57,'12 / 0',14,MUTED)
 if not edit:
  o+=button(x+w-58,y+12,44,'✎')+text(x+14,y+91,'Лес',17)+text(x+14,y+125,'Дорога · Старая дорога',15)+text(x+14,y+153,'Тропа · Южная тропа',15)+text(x+14,y+181,'Река · Серебряная река',15)+text(x+14,y+215,'Места',16,TEXT,700)+text(x+14,y+243,'Таверна у переправы',15)+text(x+14,y+275,'Заметка: мост у большой сосны.',14)
 else:
  o+=text(x+14,y+87,'Название',13,MUTED)+field(x+14,y+96,w-28,'Переправа')+text(x+14,y+163,'Биом',13,MUTED)+select(x+14,y+172,w-28,'Лес')+text(x+14,y+238,'Заметка',13,MUTED)+rect(x+14,y+247,w-28,58,'#0e1829',BORDER,8)+text(x+23,y+274,'Мост у большой сосны.',14)
  yy=y+321
  if error:o+=text(x+14,yy,'Карта изменилась. Откройте правку снова.',12,'#ffbd9e');yy+=33
  bw=(w-42)/2;o+=button(x+14,yy,bw,'Сохранить',error)+button(x+28+bw,yy,bw,'Отмена')
 return o

svg=frame(1500,1000)+rect(0,38,500,962,'#101b2d','#304b72',0)
co,y=controls(16,54,468);svg+=co+card(16,y,468)+hexes(1000,472,59)
svg+=text(938,83,'RU',16)+text(1280,83,'↻    #    ⌕',20)
svg+='</g></svg>';(OUT/'proposed-desktop.svg').write_text(svg)
svg=frame(390,1430)+hexes(195,208,39,True)+rect(0,365,390,1065,'#101b2d',BORDER,0)
co,y=controls(12,378,366);svg+=co+card(12,y,366,True);svg+='</g></svg>';(OUT/'proposed-narrow.svg').write_text(svg)
svg=frame(1500,540)+text(20,70,'Основные состояния — та же карточка и компактные действия',17)
svg+=card(20,90,450,False)+card(490,90,450,True)+card(960,90,520,True,True)
svg+='</g></svg>';(OUT/'proposed-states.svg').write_text(svg)
