from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from html import escape
import math

OUT=Path(__file__).parent
BG='#0d1525'; PANEL='#101a2b'; CARD='#111d2e'; LINE='#30425e'; TEXT='#e5eaf2'; MUTED='#a5b1c4'; GOLD='#dac26e'; BLUE='#4a76a5'
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
class Canvas:
 def __init__(self,w,h):
  self.im=Image.new('RGB',(w,h),BG); self.d=ImageDraw.Draw(self.im); self.svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="100%" height="100%" fill="{BG}"/>']
 def rect(self,box,fill=CARD,stroke=LINE,r=8):
  self.d.rounded_rectangle(box,r,fill=fill,outline=stroke,width=1);x,y,x2,y2=box;self.svg.append(f'<rect x="{x}" y="{y}" width="{x2-x}" height="{y2-y}" rx="{r}" fill="{fill}" stroke="{stroke}"/>')
 def text(self,x,y,s,size=14,fill=TEXT):
  f=ImageFont.truetype(FONT,size);self.d.text((x,y),s,font=f,fill=fill);self.svg.append(f'<text x="{x}" y="{y+size}" font-family="DejaVu Sans, sans-serif" font-size="{size}" fill="{fill}">{escape(s)}</text>')
 def line(self,coords,fill=LINE,width=1):
  self.d.line(coords,fill=fill,width=width); pts=' '.join(f'{x},{y}' for x,y in coords); self.svg.append(f'<polyline points="{pts}" fill="none" stroke="{fill}" stroke-width="{width}"/>')
 def poly(self,points,fill,stroke):
  self.d.polygon(points,fill=fill,outline=stroke);self.svg.append('<polygon points="'+' '.join(f'{x:.1f},{y:.1f}' for x,y in points)+f'" fill="{fill}" stroke="{stroke}"/>')
 def save(self,name):
  self.im.save(OUT/(name+'.png'));(OUT/(name+'.svg')).write_text('\n'.join(self.svg+['</svg>']),encoding='utf-8')

def field(c,x,y,w,label,value):
 c.text(x,y,label,11,MUTED);c.rect((x,y+20,x+w,y+52),BG);c.text(x+10,y+28,value,13);c.text(x+w-20,y+28,'⌄',13,MUTED)
def check(c,x,y,label,on=True):
 c.rect((x,y,x+16,y+16),BLUE if on else BG,r=3)
 if on:c.text(x+2,y-3,'✓',16)
 c.text(x+25,y-1,label,13)
def controls(c,x,y,w,compact=False):
 c.rect((x,y,x+w,y+44),'#38311a',GOLD);c.text(x+12,y+12,'Нажми на стартовый гекс',14,GOLD)
 c.rect((x,y+55,x+w,y+169));field(c,x+12,y+66,w-24,'Режим','Классический режим')
 check(c,x+13,y+137,'Knave 2e');c.text(x+w-135,y+137,'6 миль / гекс',12,MUTED)
 c.rect((x,y+181,x+w,y+270));
 labels=[('РАЗМЕР','Авто'),('ТИП','Авто'),('БИОМ','Авто'),('БЕРЕГ','Материк')]
 cell=(w-36)/4
 for i,(a,b) in enumerate(labels):field(c,x+9+i*(cell+6),y+195,cell,a,b)
 c.rect((x,y+282,x+w,y+369)); c.text(x+16,y+296,'Гексы  Тайлы',13);c.text(x+w/2,y+296,'POI  Значки',13);c.text(x+16,y+337,'Повернуть',13,MUTED);c.text(x+w/2,y+337,'# Координаты',13,MUTED)
 c.rect((x,y+380,x+w,y+429));c.text(x+16,y+395,'Отменить     Повторить',13,MUTED)
 c.rect((x,y+440,x+w,y+489));c.text(x+16,y+456,'Выгрузить ▾    Загрузить JSON',13)
 c.rect((x,y+500,x+w,y+550));c.text(x+12,y+516,'Seed мира',12,MUTED);c.text(x+116,y+514,'20261108',14)
def mapview(c,x,y,w,h):
 c.rect((x,y,x+w,y+h),BG,r=5)
 rad=38
 for row in range(5):
  for col in range(6):
   cx=x+48+col*66+(row%2)*33;cy=y+58+row*57
   if cx+rad>x+w:continue
   pts=[(cx+rad*math.cos(math.radians(60*i-30)),cy+rad*math.sin(math.radians(60*i-30))) for i in range(6)]
   c.poly(pts,['#355b47','#436753','#50735c'][(col+row)%3], '#708476')
   c.text(cx-7,cy-9,'♠' if (row+col)%3 else '⌂',17,'#d7e0c6')
 c.text(x+20,y+h-45,'Пример карты · география условная',12,MUTED)
def info(c,x,y,w,edit=False,secret=False):
 c.rect((x,y,x+w,y+560),PANEL)
 check(c,x+12,y+13,'Редактировать',edit)
 c.text(x+12,y+51,'Регион Ярнског',18)
 c.text(x+12,y+83,'Смешанный лес · 3 / 6',13,MUTED)
 if edit:field(c,x+12,y+112,w-24,'Проходимость','Трудная')
 else:
  c.text(x+12,y+112,'Проходимость',11,MUTED);c.text(x+12,y+138,'Не задана',14)
 c.line([(x+12,y+183),(x+w-12,y+183)])
 c.text(x+12,y+198,'⌂ Старая башня',18)
 c.text(x+12,y+230,'Постройки · 88   Башня',12,MUTED)
 c.text(x+12,y+254,'Описание ведущего',11,MUTED)
 c.text(x+12,y+276,'Башня на заросшей тропе.',13)
 if edit:field(c,x+12,y+311,w-24,'Обнаружение','Взаимодействие' if secret else 'Исследование')
 else:
  c.text(x+12,y+315,'Обнаружение',11,MUTED);c.text(x+12,y+339,'Исследование гекса',14)
 if secret:
  c.text(x+12,y+382,'Улика в этом гексе',11,MUTED);c.rect((x+12,y+402,x+w-12,y+437),BG);c.text(x+22,y+411,'Следы ведут к скрытому входу',12)
  c.text(x+12,y+448,'Улика обязательна для секрета',12,GOLD)
 else:
  c.text(x+12,y+388,'Заметки мастера',12,MUTED);c.rect((x+12,y+411,x+w-12,y+462),BG)
 if edit:
  c.rect((x+12,y+500,x+110,y+540),BLUE);c.text(x+28,y+511,'Готово',14);c.text(x+130,y+511,'Отмена',14,MUTED)
 else:c.text(x+12,y+508,'Найти объект',13,MUTED)

c=Canvas(1410,895);c.text(24,18,'Предложение UI · KNAVE2-CLASSIC-UI1',23);c.text(24,54,'На основе текущей панели HexCrawl. Макет, не готовая реализация.',14,MUTED)
c.text(24,95,'1. Новая карта',17,GOLD);controls(c,24,130,405);mapview(c,447,130,505,550)
c.text(980,95,'2. Выбранный объект',17,GOLD);info(c,980,130,405)
c.text(24,725,'Чекбокс добавляет одну строку под режимом. Размеры остальных элементов сохраняются.',15)
c.text(24,759,'В редакторе — проходимость гекса и способ обнаружения POI; секрет требует отдельную улику.',15)
c.text(24,800,'Заполненная карта: профиль закреплён. Новый профиль выбирается после явного сброса.',13,MUTED)
c.save('KNAVE2-CLASSIC-UI1-desktop')
c=Canvas(1230,935);c.text(24,18,'Предложение UI · узкий экран 390 px',23);c.text(24,54,'Та же панель, вертикальная прокрутка; основные состояния.',14,MUTED)
for i,(title,edit,secret) in enumerate([('1. Генерация',False,False),('2. Просмотр POI',False,False),('3. Редактирование секрета',True,True)]):
 x=18+i*405;c.text(x+9,97,title,16,GOLD);c.rect((x,130,x+390,836),PANEL)
 if i==0:controls(c,x+12,144,366,True);c.text(x+25,731,'Найти объект',13,MUTED)
 else:info(c,x+12,144,366,edit,secret)
 c.rect((x+380,150,x+384,798),LINE,r=2);c.rect((x+380,280 if i==2 else 164,x+384,495 if i==2 else 378),MUTED,r=2)
c.text(24,867,'Пример текста авторский. Длинные значения переносятся; горизонтальная прокрутка не нужна.',13,MUTED)
c.save('KNAVE2-CLASSIC-UI1-narrow')
