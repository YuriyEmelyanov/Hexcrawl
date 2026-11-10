from pathlib import Path
from html import escape
import subprocess
p=Path('/tmp/tables1-spec')
f=p/'spec.md';f.write_text(f.read_text().replace('S05-C02(25)','S05-C02(35)'))
def make(w,n):
 H=1080 if n else 680;a=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{H}"><rect width="100%" height="100%" fill="#0c1423"/>']
 def rect(x,y,w,h):a.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="#101c2f" stroke="#304c73"/>')
 def text(x,y,t,s=14,c='#e4eaf2'):a.append(f'<text x="{x}" y="{y}" font-family="DejaVu Sans" font-size="{s}" fill="{c}">{escape(t)}</text>')
 def btn(x,y,w,t):rect(x,y,w,44);text(x+9,y+28,t,13)
 text(16,26,'TABLES1 · предложение TBL-UI1',16,'#a8c9fa');text(16,49,'Макет, не готовая реализация',13,'#b3bfd2')
 x=12;y=66;pw=w-24 if n else 472;rect(x,y,pw,550);text(x+12,y+30,'Место 2/0 · Подземелье',18);text(x+12,y+56,'RU · Подсказки места',14,'#a6b8d3');btn(x+pw-54,y+9,42,'＋')
 text(x+12,y+96,'Постройка:',14);btn(x+114,y+68,48,'#27');text(x+174,y+96,'Подземелье',14);btn(x+pw-50,y+68,38,'⋯')
 text(x+22,y+144,'↳ Подземелье:',13);btn(x+142,y+116,48,'⬡4');text(x+201,y+144,'Тихий зал',14);text(x+25,y+166,'Уточнение выбранной постройки',12,'#92a5c0')
 for yy in [206,256]:
  text(x+12,y+yy,'Свойство:',14);btn(x+108,y+yy-28,44,'#1');text(x+166,y+yy,'Пепельный',14);btn(x+pw-50,y+yy-28,38,'⋯')
 btn(x+12,y+281,194,'＋ Добавить подсказку');text(x+12,y+350,'Описание места',15);rect(x+12,y+363,pw-24,98);text(x+22,y+390,'Старый зал под башней.');text(x+22,y+414,'Здесь всё покрыто пеплом.')
 btn(x+12,y+475,104,'Сохранить');btn(x+124,y+475,88,'Отмена');text(x+12,y+538,'Одинаковые результаты сохраняются отдельно',11,'#92a5c0')
 xx=12 if n else 510;yy=636 if n else 66;ww=w-24 if n else w-524;rect(xx,yy,ww,350);text(xx+14,yy+29,'Выбрать строку · Постройки',16);btn(xx+ww-46,yy+7,34,'×');rect(xx+12,yy+57,ww-24,40);text(xx+24,yy+83,'Поиск или номер строки…',14,'#aab8cc')
 text(xx+18,yy+126,'27   Подземелье',15);text(xx+18,yy+151,'Связанная таблица доступна',12,'#9ecdb8');text(xx+18,yy+186,'100 (00)   Последняя строка',14);text(xx+18,yy+223,'Номер: 101',14);text(xx+18,yy+246,'Выберите строку от 1 до 100',13,'#f4acac');rect(xx+12,yy+264,116,44);text(xx+21,yy+292,'Применить',13,'#6d7d94');btn(xx+136,yy+264,86,'Отмена');text(xx+14,yy+333,'Ошибка не меняет принятые подсказки',11,'#92a5c0')
 for i,t in enumerate(['Стиль — по панели9aa. Меню открыто.','Тексты синтетические, не строки книги.','Дубликаты — независимые обращения.']):text(16,H-55+18*i,t,11,'#9aaeca')
 return ''.join(a)+'</svg>'
for name,w,n in [('preview-desktop',1000,False),('preview-narrow',390,True)]:
 f=p/(name+'.svg');f.write_text(make(w,n));subprocess.run(['inkscape',str(f),'--export-type=png','--export-filename='+str(p/(name+'.png'))],check=True,capture_output=True)
