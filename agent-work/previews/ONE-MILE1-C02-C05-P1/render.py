from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
P=Path(__file__).parent
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def make(w,narrow):
 h=1010 if narrow else 660
 im=Image.new('RGB',(w,h),'#0c1423');d=ImageDraw.Draw(im)
 def text(x,y,s,size=17,color='#eef4ff'):d.text((x,y),s,font=ImageFont.truetype(FONT,size),fill=color)
 def panel(x,y,pw,title,label):
  d.rounded_rectangle((x,y,x+pw,y+205),12,fill='#101b2d',outline='#375386')
  text(x+14,y+12,title,15,'#9eafc6');text(x+14,y+45,'0/0',18)
  text(x+14,y+78,'Лиственное редколесье',16)
  text(x+14,y+108,'Дорога 1 · Тропа 3',16)
  text(x+14,y+143,label,17)
  d.rounded_rectangle((x+pw-48,y+40,x+pw-8,y+80),7,outline='#375386');text(x+pw-38,y+46,'✎',21)
 def crossing(x,y,cw,kind):
  text(x,y,kind,18);cy=y+63;cx=x+cw/2
  d.rectangle((cx-13,cy-28,cx+13,cy+28),fill='#11a6b4')
  color='#c6b38c'
  d.line((x+8,cy,cx-15,cy),fill=color,width=5);d.line((cx+15,cy,x+cw-8,cy),fill=color,width=5)
  if kind=='Мост':
   d.line((cx-19,cy,cx+19,cy),fill=color,width=5)
   for dy in [-8,8]:d.line((cx-20,cy+dy,cx+20,cy+dy),fill='#eedaa6',width=2)
  elif kind=='Брод':d.line((cx-14,cy,cx+14,cy),fill='#658c88',width=5)
  else:
   d.line((cx-14,cy-7,cx-14,cy+7),fill=color,width=2);d.line((cx+14,cy-7,cx+14,cy+7),fill=color,width=2)
 text(18,16,'ПРЕДЛОЖЕНИЕ C02/C05',19,'#9dd7f6')
 text(18,48,'Не реализация и не новая география',14,'#9eafc6')
 if narrow:
  panel(16,90,w-32,'Сейчас · карточка 1 мили','Айхенхайм')
  panel(16,315,w-32,'Предлагается · та же карточка','Городок Айхенхайм')
  for y,k in zip([554,686,818],['Мост','Брод','Переправа']):crossing(24,y,w-48,k)
  text(18,960,'Читается без новой панели настроек',14)
 else:
  panel(20,100,480,'Сейчас · карточка 1 мили','Айхенхайм')
  panel(540,100,480,'Предлагается · та же карточка','Городок Айхенхайм')
  text(20,335,'На карте: три типа перехода вместо одинаковых кружков',20)
  for x,k in zip([30,370,710],['Мост','Брод','Переправа']):crossing(x,392,280,k)
  text(20,520,'Символы условно увеличены для сравнения.',16,'#9eafc6')
  text(20,550,'Это не предложение физической ширины реки или размера городка.',16,'#9eafc6')
  text(20,602,'Карандаш и локальный редактор сохраняются; новых элементов управления нет.',16)
 im.save(P/('narrow.png' if narrow else 'desktop.png'))
make(1040,False);make(390,True)
