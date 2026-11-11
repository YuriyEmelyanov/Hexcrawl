from pathlib import Path
import json,math,html,textwrap
ROOT=Path(__file__).parent
BG='#0c1423'; PANEL='#0f1726'; INK='#e8ecf2'; MUTED='#aebbd4'; BORDER='#375386'; BLUE='#365792'; GREEN='#a7d6bb'
def rect(x,y,w,h,fill=PANEL,stroke=BORDER,rx=10):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}"/>'
def txt(x,y,s,size=16,fill=INK,weight=400):return f'<text x="{x}" y="{y}" fill="{fill}" font-family="DejaVu Sans,sans-serif" font-size="{size}" font-weight="{weight}">{html.escape(s)}</text>'
def lines(x,y,s,width=42,size=15,fill=MUTED,lh=23):return ''.join(txt(x,y+i*lh,t,size,fill) for i,t in enumerate(textwrap.wrap(s,width=width)))
def button(x,y,w,s,primary=False):return rect(x,y,w,44,BLUE if primary else BG)+txt(x+12,y+28,s,14)
def check(x,y,s,on=False):return rect(x,y,20,20,BLUE if on else BG,rx=4)+(txt(x+3,y+16,'✓',17) if on else '')+txt(x+32,y+17,s,16)
def wrap_svg(w,h,body):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'+rect(0,0,w,h,BG,BG,0)+body+'</svg>'
def header(w,title):return rect(0,0,w,64,PANEL,PANEL,0)+txt(16,25,title,17,INK,700)+txt(16,48,'PF2-UI1 · предложение, не реализация',12,MUTED)
def map_art(x,y,w,h):
 b=rect(x,y,w,h,BG,BG,0)
 step=44
 for r in range(-1,int(h/38)+2):
  for q in range(-2,int(w/44)+2):
   cx=x+q*step+(r%2)*step/2;cy=y+r*38
   if cx<x+12 or cx>x+w-12 or cy<y+12 or cy>y+h-12:continue
   pts=' '.join(f'{cx+25*math.cos(math.pi/3*i+math.pi/6):.2f},{cy+25*math.sin(math.pi/3*i+math.pi/6):.2f}' for i in range(6))
   color=['#273b31','#304738','#364938','#283f35','#4d4b36'][(q*7+r*3)%5]
   b+=f'<polygon points="{pts}" fill="{color}" stroke="#62756b" stroke-width=".6"/>'
 b+=f'<path d="M{x+w*.2},{y+12} C{x+w*.9},{y+h*.3} {x+w*.1},{y+h*.7} {x+w*.8},{y+h-5}" fill="none" stroke="#3ea2ff" stroke-width="5"/>'
 b+=f'<path d="M{x+20},{y+h*.7} Q{x+w*.45},{y+h*.35} {x+w-20},{y+h*.6}" fill="none" stroke="#c5a772" stroke-width="3" stroke-dasharray="5 4"/>'
 for px,py,s in [(x+w*.32,y+h*.4,'◆'),(x+w*.64,y+h*.62,'●'),(x+w*.75,y+h*.25,'◇')]:
  b+=f'<circle cx="{px}" cy="{py-6}" r="15" fill="#0f1726" stroke="#a7d6bb"/>'+txt(px-7,py,s,17,GREEN)
 return b
def controls(x,y,w,narrow=False):
 b=rect(x,y,w,64)+txt(x+12,y+22,'Режим',13,MUTED)+rect(x+94,y+12,w-106,40,BG,rx=7)+txt(x+105,y+38,'Классический',14)
 b+=check(x+12,y+92,'Knave 2e',False)
 b+=check(x+12,y+140,'PF2',True)
 b+=txt(x+105,y+156,'12 миль · между вершинами',12,MUTED)
 yy=y+184
 b+=rect(x,yy,w,262)+txt(x+12,yy+28,'Наполнение PF2',17,INK,700)
 b+=lines(x+12,yy+54,'Ориентиры 15% · секреты 15% · ресурсы 15% · обычные 55%',width=34 if narrow else 45,size=13,lh=21)
 b+=txt(x+12,yy+117,'Новых единиц: 300',16)+txt(x+12,yy+142,'Защищено: 18 · уже обработано: 0',12,MUTED)
 b+=button(x+12,yy+164,w-24,'Заполнить новые · 300',True)
 b+=txt(x+12,yy+238,'Существующие места сохраняются',12,GREEN)
 return b,yy+262
def feature(x,y,w):
 b=rect(x,y,w,220)+txt(x+12,y+27,'СЕКРЕТ · ПОИСК',12,GREEN,700)+txt(x+12,y+58,'Тайник под корнями',18,INK,700)
 b+=lines(x+12,y+89,'Под корнями старого дерева скрыт ларец. Место доступно для правки мастером.',width=31 if w<400 else 43,size=14,lh=22)
 b+=button(x+12,y+155,128,'Изменить')+button(x+150,y+155,100,'Удалить')
 return b
def desktop():
 b=header(1500,'HexCrawl · массовое наполнение')+rect(0,64,480,916,PANEL,PANEL,0)
 c,yy=controls(16,84,448);b+=c+feature(16,yy+24,448)
 b+=lines(28,yy+270,'Пример заданных входов. Результат случайной карты может иметь другие доли.',width=47,size=12,lh=19)
 b+=map_art(480,64,1020,916)
 for i,n in enumerate(['1','6','12','24']):b+=button(510+i*56,86,48,n,n=='12')
 b+=rect(520,760,540,124,PANEL)+txt(540,790,'Одна карта — разные уровни просмотра',17,INK,700)+lines(540,820,'Плотность PF2 считается один раз на физическую единицу. Просмотр 1/6/12/24 не добавляет места.',width=57,size=14)
 b+=txt(1000,948,'Иллюстрация карты · не runtime-снимок',12,MUTED)
 return wrap_svg(1500,980,b)
def narrow(w=390):
 b=header(w,'HexCrawl · PF2')+map_art(0,64,w,238)+txt(16,289,'Иллюстрация карты',11,INK)
 c,yy=controls(16,322,w-32,True);b+=c+feature(16,yy+18,w-32)
 b+=lines(16,yy+264,'Пример заданных входов; фактические доли случайного пакета могут отличаться.',width=39 if w==390 else 31,size=12,lh=19)
 return wrap_svg(w,1120,b)
def states():
 b=header(1200,'HexCrawl · состояния PF2-UI1')
 data=[('Выключено','PF2 не выбран. Старые принятые места остаются видимыми.','PF2',False),('Нет новых единиц','Все доступные единицы уже обработаны либо защищены.','Новых единиц нет',True),('Выполняется','Наполняем 300 единиц… Повторное действие недоступно.','Наполнение…',True),('Готово','Обработано 300. Добавлено 135 мест. Защищено 18.','Заполнить новые',True),('Ошибка без потери карты','Не найден контент для окружения. Карта не изменена.','Повторить после исправления',True),('Есть черновик','Завершить описание перед наполнением карты?','Завершить',True)]
 for i,(title,desc,label,on) in enumerate(data):
  x=20+(i%3)*395;y=90+(i//3)*365;w=370
  b+=rect(x,y,w,335)+txt(x+16,y+32,title,17,INK,700)+check(x+16,y+61,'PF2',on)
  b+=lines(x+16,y+116,desc,33,15,fill='#fca5a5' if i==4 else MUTED,lh=24)
  if i==5:
   b+=button(x+16,y+203,w-32,label,True)+button(x+16,y+255,158,'Отбросить')+button(x+184,y+255,170,'Остаться')
  elif i!=0:b+=button(x+16,y+236,w-32,label,i in [3,4])
 b+=lines(24,857,'Чекбокс не наполняет карту сам при переключении. При создании территории PF2 применяется к новым свободным единицам в общей транзакции. Конкретные числа в макете — контролируемый пример.',width=132,size=14,lh=22)
 return wrap_svg(1200,950,b)
for name,svg in [('preview-desktop',desktop()),('preview-narrow',narrow()),('preview-320',narrow(320)),('preview-states',states())]:
 (ROOT/(name+'.svg')).write_text(svg)

groups={
 'forest':['plain_deciduous_forest','plain_mixed_forest','plain_coniferous_forest','deciduous_forested_hills','mixed_forested_hills','coniferous_forested_hills','hilly_woodland','deciduous_woodland','mixed_woodland','coniferous_woodland'],
 'mountain':['coniferous_mountain_forest','mixed_mountain_forest','deciduous_mountain_forest','mountains','mountain_woodland','open_hills'],
 'deadwood':['dead_forest','dead_woodland','dead_forested_hills','dead_mountain_forest'],
 'swamp':['swamp','swamp_forest'],'desert':['semi_desert'],'plains':['open_plains']}
rows=[
 ('stone-outcrop','land','landmark','Приметная скала','Distinctive outcrop','Скала выделяется на фоне окружающей местности.','A distinct rock formation marks this part of the landscape.'),
 ('root-cache','forest','secret','Тайник под корнями','Cache beneath the roots','Под корнями старого дерева скрыт ларец.','A small chest lies concealed among the roots of an old tree.'),
 ('forest-plants','forest','resource','Полезные лесные растения','Useful forest plants','Здесь можно собрать растения для простых лечебных средств.','Plants useful in simple remedies grow here.'),
 ('hidden-cave','mountain','secret','Скрытая пещера','Hidden cave','За каменной осыпью находится вход в пещеру.','A scree slope conceals a cave entrance.'),
 ('mineral-vein','mountain','resource','Минеральная жила','Mineral vein','В обнажённой породе заметна жила полезного минерала.','A vein of useful mineral is visible in exposed rock.'),
 ('hollow-cache','deadwood','secret','Тайник в дупле','Hollow-tree cache','В дупле сухого дерева спрятан свёрток.','A wrapped bundle is concealed inside a dead tree.'),
 ('dry-timber','deadwood','resource','Сухая древесина','Usable dry timber','Несколько упавших стволов пригодны для заготовки древесины.','Several fallen trunks provide usable dry timber.'),
 ('raider-camp','swamp','secret','Скрытый лагерь налётчиков','Concealed raider camp','Лагерь скрыт в зарослях на сухом участке.','Thick vegetation conceals a camp on a patch of dry ground.'),
 ('swamp-plants','swamp','resource','Болотные лечебные растения','Medicinal swamp plants','В зарослях растут полезные для приготовления лекарств растения.','Plants with medicinal uses grow among the marsh vegetation.'),
 ('buried-ruins','desert','secret','Погребённые руины','Buried ruins','Под слоем песка сохранились остатки старой постройки.','Sand conceals the remains of an old structure.'),
 ('desert-minerals','desert','resource','Выход полезного минерала','Exposed mineral deposit','У поверхности залегает пригодный для добычи минерал.','A useful mineral deposit lies close to the surface.'),
 ('oasis','desert','resource','Оазис','Oasis','Небольшой источник поддерживает зелёный участок среди сухой земли.','A small spring sustains a patch of vegetation amid dry ground.'),
 ('buried-cache','plains','secret','Зарытый тайник','Buried cache','Неглубоко под землёй спрятан запас припасов.','A supply cache is buried just beneath the ground.'),
 ('fibre-plants','plains','resource','Волокнистые растения','Fibre plants','Здесь растут растения, пригодные для получения волокна.','Plants suitable for gathering fibre grow here.'),
 ('wreck-mast','aquatic','landmark','Мачта над водой','Mast above the water','Над поверхностью виднеется мачта старого судна.','The mast of an old vessel projects above the water.'),
 ('sunken-ruins','aquatic','secret','Затонувшие руины','Sunken ruins','Под водой сохранились остатки старой постройки.','The remains of an old structure lie beneath the water.'),
 ('fishing-ground','aquatic','resource','Рыбное место','Fishing ground','Здесь держится много рыбы.','Fish gather here in large numbers.')]
entries=[]
for id,g,c,ru,en,rut,ent in rows:
 entries.append({'id':id,'context':g,'category':c,'title':{'ru':ru,'en':en},'description':{'ru':rut,'en':ent},'authorship':'project_authored_seed_not_book_quotation','basis':'owner_acceptance_example' if id in ['stone-outcrop','root-cache','oasis'] else 'bounded_product_adaptation','source_context_ref':'PF2-RM-029-L1' if c!='landmark' and g!='deadwood' else 'PF2-RM-013-L1','source_url':'https://2e.aonprd.com/Rules.aspx?ID=3115' if c!='landmark' and g!='deadwood' else 'https://2e.aonprd.com/Rules.aspx?ID=3110','creates_geography':False,'mechanical_stats':None})
manifest={'schema_version':1,'artifact_kind':'analyst_content_contract_not_runtime','version':'pf2-gmc-feature-seeds-v1','task_id':'HX-BL-054','stage_id':'PF2-BATCH1','scope_version':2,'count':len(entries),'source_check_date':'2026-11-11','source_attribution':'PF2 GM Core optional profile/categories and terrain examples; concrete bilingual phrasing is original product seed text, not a copied PF2 table. No new book corpus.','contexts':groups,'water_context':'aquatic overrides land context at the unit center','landmark_reuse':'stone-outcrop is one shared entry for all land contexts','unsupported_source_contexts':['arctic: no corresponding current BiomeId; do not infer cold from height'],'entries':entries}
(ROOT/'PF2-BATCH1-content-v1.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
assert sum(map(len,groups.values()))==24
assert len(set(b for v in groups.values() for b in v))==24
assert len(entries)==17
for g in [*groups,'aquatic']:
 for c in ['landmark','secret','resource']:
  assert any(e['category']==c and e['context'] in [g,'land' if g!='aquatic' else g] for e in entries),(g,c)
print('Generated4 SVG mockups and17-entry analyst content contract;24 biome mappings complete.')
