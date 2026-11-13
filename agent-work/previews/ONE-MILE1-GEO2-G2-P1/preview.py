import math,json,pathlib
import subprocess
p=pathlib.Path(__file__).parent
def text(x,y,s,size=15,color='#e5edf7'):
 return f'<text x="{x}" y="{y}" fill="{color}" font-family="DejaVu Sans" font-size="{size}">{s}</text>'
def rect(x,y,w,h,fill='#182538',stroke='#3d536d'):
 return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}"/>'
def scene(x,y,scale,after):
 out=[f'<g transform="translate({x} {y}) scale({scale})"><defs><clipPath id="crop{x}{y}"><rect x="-1.8" y="-1.6" width="3.6" height="3.2"/></clipPath></defs><g clip-path="url(#crop{x}{y})">']
 for q in range(-3,4):
  for r in range(-3,4):
   cx=q+r/2;cy=math.sqrt(3)/2*r
   pts=[(cx+.5,cy-1/(2*math.sqrt(3))),(cx+.5,cy+1/(2*math.sqrt(3))),(cx,cy+1/math.sqrt(3)),(cx-.5,cy+1/(2*math.sqrt(3))),(cx-.5,cy-1/(2*math.sqrt(3))),(cx,cy-1/math.sqrt(3))]
   out.append('<polygon points="'+ ' '.join(f'{a},{b}' for a,b in pts)+'" fill="#c1d99b" stroke="#687f53" stroke-width=".018"/>')
 route='M0,-1.154700538 L0,-.577350269 L-.5,-.288675135 L-.5,.288675135 L0,.577350269 L0,1.154700538' if after else 'M0,-1.154700538 L0,1.154700538'
 out.append(f'<path d="{route}" fill="none" stroke="#159dac" stroke-width=".15" stroke-linejoin="round"/>')
 if after:
  out.append('<polygon points=".5,-.288675 .5,.288675 0,.577350 -.5,.288675 -.5,-.288675 0,-.577350" fill="#d7ad63" fill-opacity=".5" stroke="#7a4a20" stroke-width=".04"/>')
  out.append('<path d="M1.8,0 L.5,0" stroke="#8a4c21" stroke-width=".05" fill="none"/>')
 else:
  out.append('<path d="M1.8,0 L1.2,0" stroke="#8a4c21" stroke-width=".05"/><circle cx="1.2" cy="0" r=".12" fill="#a96825"/>')
 out.append('</g></g>');return ''.join(out)
for narrow in [False,True]:
 w,h=(390,1060) if narrow else (1180,740)
 s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">',rect(0,0,w,h,'#0f1728')]
 s += [text(18,28,'GEO2 · предложение G2-P1',18),text(18,51,'Схема, не готовая реализация',12,'#e3bd73')]
 if not narrow:
  s += [rect(16,70,245,650),text(30,100,'Классический режим'),rect(28,120,220,40),text(40,146,'Размер гекса: 1 миля'),rect(28,178,220,40),text(40,204,'Уточнить геометрию'),text(30,251,'План изменений',17),text(30,277,'Пример: 1 POI · 1 дорога',13),text(30,303,'Сетка остаётся прежней',13),text(30,329,'Сторона обхода сохранится',12),rect(28,357,100,40,'#235b57'),text(37,383,'Применить',13),rect(140,357,108,40),text(163,383,'Отмена',13)]
  s += [rect(278,70,886,440),text(300,103,'До: русло через центр',17),text(747,103,'После: обход слева',17),scene(490,290,105,False),scene(940,290,105,True)]
  s += [text(300,493,'POI и дорога показаны условно; это не размер Айхенхайма.',12,'#bacbdb'),text(285,548,'Река по рёбрам → POI у нужной реки → дорога к POI',17),text(285,580,'Внутри целого гекса POI дорога скрыта. Связь сохранена.',14),rect(280,610,875,48),text(294,638,'Расчёт…    ·    Нечего менять    ·    Нет безопасного пути — карта сохранена',13)]
 else:
  s += [rect(12,68,366,42),text(26,95,'1 миля   ·   Уточнить геометрию',15),rect(12,122,366,330),text(26,148,'До: русло через центр',16),scene(176,292,80,False),rect(12,466,366,330),text(26,492,'После: обход слева',16),scene(176,635,80,True),text(20,823,'Условный POI занимает целый гекс.',13),text(20,847,'Внутри него дорога не видна.',13),text(20,871,'Размер Айхенхайма не утверждён.',12,'#e3bd73'),rect(12,891,177,42,'#235b57'),text(48,918,'Применить'),rect(201,891,177,42),text(253,918,'Отмена'),text(20,961,'Расчёт… / Нечего менять',13),text(20,989,'Нет безопасного пути:',13),text(20,1013,'карта сохранена, применить нельзя.',12)]
 s.append('</svg>');name='narrow' if narrow else 'desktop';(p/f'{name}.svg').write_text(''.join(s));subprocess.run(['inkscape',str(p/f'{name}.svg'),'--export-type=png','--export-filename='+str(p/f'{name}.png')],check=True,capture_output=True)
# Local analytical witness only, no runtime/model certification.
left=[(0,-1/math.sqrt(3)),(-.5,-1/(2*math.sqrt(3))),(-.5,1/(2*math.sqrt(3))),(0,1/math.sqrt(3))]
right=[(-x,y) for x,y in left]
assert all(abs(math.dist(a,b)-1/math.sqrt(3))<1e-12 for pts in [left,right] for a,b in zip(pts,pts[1:]))
(p/'preview-evidence.json').write_text(json.dumps({'kind':'conditional_code_native_proposal','grid':'actual detailGrid corner convention','source_control_cell':{'q':-3,'r':0},'left_local':left,'right_local':right,'same_ports':left[0]==right[0] and left[-1]==right[-1],'axis_on_polygon_edges':True,'display_width':'schematic; not physical calibration','POI':'conditional whole-cell example, not town-size finding','runtime_checks':False},indent=2))
