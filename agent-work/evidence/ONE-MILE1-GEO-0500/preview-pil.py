import json,math,pathlib
from PIL import Image,ImageDraw,ImageFont
root=pathlib.Path(__file__).parent;scenes=json.loads((root/'plans.json').read_text())
names={'bridge':'Мост','ferry':'Переправа','ford':'Брод (явный F2-пример)'}
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def text(d,p,s,size=15,color='#e2e8f0'): d.text(p,s,font=ImageFont.truetype(font,size),fill=color)
def panel(s,k,w,h):
 im=Image.new('RGB',(w,h),'#172334');d=ImageDraw.Draw(im);text(d,(12,8),names[s['crossing']['kind']]+' · '+('сейчас' if k==0 else 'W1'),14)
 m=Image.new('RGBA',(w-16,h-42),'#879d5a');md=ImageDraw.Draw(m);c=s['crossing'];scale=min(m.width/32,m.height/18)
 def pt(x,y):return ((x-c['x'])*scale+m.width/2,(y-c['y'])*scale+m.height/2)
 polygons=[]
 for q in range(-5,6):
  for r in range(-5,6):
   cx=c['x']+math.sqrt(3)*28/6*(q+r/2);cy=c['y']+7*r
   polygons.append([pt(cx+28/6*math.cos(math.radians(30+60*i)),cy+28/6*math.sin(math.radians(30+60*i))) for i in range(6)])
 for v in s['states'][k]['rivers']:
  a,b=pt(v['x1'],v['y1']),pt(v['x2'],v['y2']);width=max(1,round(v['stroke']*scale));md.line([a,b],fill='#139cb4',width=width)
  for x,y in [a,b]:md.ellipse([x-width/2,y-width/2,x+width/2,y+width/2],fill='#139cb4')
 for road in s['states'][k]['roads']:
  for v in road['plan']['pieces']:
   lay=Image.new('RGBA',m.size);ld=ImageDraw.Draw(lay);a,b=pt(v['x1'],v['y1']),pt(v['x2'],v['y2']);ld.line([a,b],fill=(139,106,63,round(v['opacity']*255)),width=max(1,round((.25 if road['kind']=='trail' else .5)*scale)));m=Image.alpha_composite(m,lay)
  md=ImageDraw.Draw(m)
  for rail in road['plan']['rails']:
   points=[pt(*map(float,p.split(','))) for p in rail['points'].split()];md.line(points,fill='#4f3922',width=max(1,round(.183*scale)))
 for p in polygons:md.line(p+[p[0]],fill='#334155',width=1)
 im.paste(m.convert('RGB'),(8,34));return im
def render(narrow):
 W,H=(390,1300) if narrow else (1180,890);im=Image.new('RGB',(W,H),'#0e1625');d=ImageDraw.Draw(im)
 text(d,(20,14),'ПРЕДЛОЖЕНИЕ W1 · не реализация',17,'#f7dc6f');text(d,(20,44),'Та же карта. Меняется ширина, не русло.',14)
 if narrow:
  for i,s in enumerate(scenes):
   for k in [0,1]:im.paste(panel(s,k,362,132),(14,78+(i*2+k)*143))
  d=ImageDraw.Draw(im);y=970
  lines=['6 миль: без изменения ширины','1 миля: доля ширины воды ×6','F1: 7,5% → 45% ширины гекса','','45% — пересчёт прежнего рисунка,','не новая физическая норма F1.','','Рёбра, калибровка, устья, береговые','POI и размер городка остаются открыты.','','Схема, не новый стиль биомов.']
  for j,s in enumerate(lines):text(d,(20,y+j*25),s,14)
 else:
  for i,s in enumerate(scenes):
   for k in [0,1]:im.paste(panel(s,k,560,151),(20+k*580,88+i*163))
  d=ImageDraw.Draw(im);text(d,(25,600),'Доля той же полосы воды: 6-мильный гекс → 1-мильный гекс',18)
  for i,F in enumerate(range(1,6)):
   native=.04+F*.035;cx=130+i*225;cy=690;A=70
   d.rectangle([cx-85,cy-37,cx+85,cy+37],fill='#879d5a');d.rectangle([cx-native*6*A/2,cy-37,cx+native*6*A/2,cy+37],fill='#139cb4')
   poly=[(cx+A/math.sqrt(3)*math.cos(math.radians(30+60*j)),cy+A/math.sqrt(3)*math.sin(math.radians(30+60*j))) for j in range(6)];d.line(poly+[poly[0]],fill='#172334',width=2)
   text(d,(cx-80,cy+47),f'F{F}: {native*100:.1f}% → {native*600:.1f}%',15)
  text(d,(25,788),'Пересчёт прежнего рисунка — не утверждённая физическая таблица.',17)
  text(d,(25,820),'Полные C01/02/03/04/06/07/08 открыты. Панель и координаты объектов не меняются.',15)
  text(d,(25,850),'Геометрическая схема по исходному fixture; биом упрощён только в этом макете.',13)
 im.save(root/('narrow.png' if narrow else 'desktop.png'))
render(False);render(True)
