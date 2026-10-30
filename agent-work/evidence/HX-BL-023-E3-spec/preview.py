import math,html,pathlib,cairosvg
p=pathlib.Path(__file__).parent
def make(mobile=False):
 w,h=(390,1050) if mobile else (1300,820)
 out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="100%" height="100%" fill="#0f1521"/>']
 def rect(x,y,w,h,fill,stroke='none',r=8):out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}"/>')
 def txt(x,y,t,size=16,color='#e8ecf2',weight='normal'):out.append(f'<text x="{x}" y="{y}" font-family="DejaVu Sans" font-size="{size}" font-weight="{weight}" fill="{color}">{html.escape(t)}</text>')
 def line(x1,y1,x2,y2,color,width=2,dash=''):out.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-dasharray="{dash}"/>')
 txt(16,26,'E3-UI1 · ПРЕДЛОЖЕНИЕ',16,'#7dd3fc','bold');txt(16,49,'Макет, не готовая реализация',13,'#a4b3ca')
 mx,my,mw,mh=(0,66,390,360) if mobile else (420,66,860,650)
 rect(mx,my,mw,mh,'#152332','#375386')
 out.append(f'<defs><clipPath id="map"><rect x="{mx}" y="{my}" width="{mw}" height="{mh}"/></clipPath></defs><g clip-path="url(#map)">')
 radius=36 if mobile else 53
 for row in range(6):
  for col in range(9):
   cx=mx+18+col*radius*1.73+(row%2)*radius*.86;cy=my+20+row*radius*1.5
   if cx>mx+mw-25 or cy>my+mh-25:continue
   pts=' '.join(f'{cx+radius*math.cos(math.radians(30+i*60)):.1f},{cy+radius*math.sin(math.radians(30+i*60)):.1f}' for i in range(6))
   color=['#48624b','#536f54','#617052'][(row+col)%3]
   out.append(f'<polygon points="{pts}" fill="{color}" stroke="#78846a" stroke-width="1"/>')
 # Schematic geography, not an assertion of exact road topology.
 x=mx+mw*.57
 out.append(f'<path d="M{x} {my+12} C{x-90} {my+mh*.4},{x+90} {my+mh*.6},{x-20} {my+mh-15}" stroke="#59b5dc" fill="none" stroke-width="13"/>')
 yy=my+mh*.52
 line(mx+45,yy,mx+mw-45,yy,'#edd38a',10)
 line(mx+45,yy,mx+mw-45,yy,'#735c39',4)
 line(mx+mw*.35,yy,mx+mw*.75,yy,'#7dd3fc',5)
 line(x-14,yy-13,x+14,yy-13,'#e6d9bd',4);line(x-14,yy+13,x+14,yy+13,'#e6d9bd',4)
 txt(mx+30,yy-35,'Деревня',14);txt(mx+mw-120,yy+45,'Старый лес',13)
 rect(mx+10,my+mh-55,mw-20,44,'#0f1726','#375386');txt(mx+20,my+mh-29,'Выбран участок · нажмите тип в информации',11 if mobile else 15,'#bae6fd')
 out.append('</g>')
 px,py,pw=(12,442,366) if mobile else (16,66,388)
 rect(px,py,pw,480,'#0f1726','#375386')
 txt(px+16,py+30,'Информация',19,weight='bold');rect(px+pw-100,py+10,84,44,'#365792');txt(px+pw-89,py+38,'Готово',15)
 txt(px+16,py+84,'Выбранный гекс  2 / −1',15,'#a4b3ca')
 txt(px+16,py+122,'Регион: Старый лес',16)
 txt(px+16,py+169,'Участок:',16);txt(px+110,py+169,'Дорога ▾',16,'#7dd3fc');line(px+110,py+172,px+199,py+172,'#7dd3fc',1,'3 3')
 txt(px+16,py+213,'Переправа:',16);txt(px+133,py+213,'Мост ▾',16,'#7dd3fc');line(px+133,py+216,px+203,py+216,'#7dd3fc',1,'3 3')
 txt(px+16,py+258,'Начать путь отсюда',16,'#7dd3fc')
 txt(px+16,py+302,'Удалить участок',15,'#f1a7a7')
 txt(px+16,py+346,'Удалить весь выделенный путь',14,'#f1a7a7')
 txt(px+16,py+389,'Заметки: дорога к старой мельнице',13,'#a4b3ca')
 txt(px+16,py+445,'Найти объект',15,'#7dd3fc')
 if mobile:
  txt(16,952,'Состояние ошибки — пример',13,'#a4b3ca')
  rect(12,967,366,66,'#342332','#bb6a76');txt(24,991,'Нельзя оставить путь без переправы.',12,'#ffc3c3');txt(24,1013,'Измените её тип или удалите участок.',12,'#ffc3c3')
 else:
  rect(16,565,388,150,'#152235','#375386');txt(32,594,'Черновик пути · другое состояние',15,'#7dd3fc');txt(32,627,'Тропа ▾   ·   3 участка   ·   1 мост',15);txt(32,658,'Нажимайте соседние гексы.',14);txt(32,686,'Завершить: Enter / повтор конца',14,'#a4b3ca')
  rect(16,736,1264,64,'#342332','#bb6a76');txt(32,763,'Пример отказа: этот путь пересекает реку.',16,'#ffc3c3');txt(32,787,'Измените тип переправы или удалите участок. Карта останется прежней.',14,'#ffc3c3')
 out.append('</svg>');name='narrow' if mobile else 'desktop';svg=''.join(out);(p/(name+'.svg')).write_text(svg);cairosvg.svg2png(bytestring=svg.encode(),write_to=str(p/(name+'.png')))
make();make(True)
