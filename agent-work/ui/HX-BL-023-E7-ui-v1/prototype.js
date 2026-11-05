(()=>{
if(window.__e7Initialized)return;window.__e7Initialized=true;
const card=document.querySelector('.info-block--hex');
const original=card.innerHTML;window.e7Original=original;const sourceName='Элдерфельд',targetName='Рошенвальд';
const ns='http://www.w3.org/2000/svg';
const panel=document.createElement('div');panel.className='e7-proposal';panel.innerHTML='<strong>Предложение E7 · UI-v1</strong><select aria-label="Состояние макета"><option value="read">Просмотр</option><option value="edit">Редактирование</option><option value="select-target">Выбор региона</option><option value="preview">Последствия</option><option value="height">Высота</option><option value="conflict">Совместимость</option><option value="error">Отказ</option><option value="after">После переноса</option></select>';document.body.prepend(panel);
const choose=panel.querySelector('select');choose.onchange=()=>show(choose.value);
function row(label,value,edit,action){const r=document.createElement('p');r.className='e7-row';r.innerHTML=label+(edit?'<button type="button" class="direct-value">'+value+'</button>':value);r.querySelector('button')?.addEventListener('click',action);return r;}
function notice(html,error=false){const n=document.createElement('div');n.className='e7-notice'+(error?' e7-error':'');n.setAttribute('role',error?'alert':'status');n.innerHTML=html;return n;}
function show(state){
 choose.value=state;card.innerHTML=!['read','after'].includes(state)?window.e7OriginalEdit??original:original;card.classList.toggle('is-editing',!['read','after'].includes(state));document.querySelectorAll('[data-e7-overlay]').forEach(e=>e.remove());
 const edit=!['read','after'].includes(state),mode=card.querySelector('.direct-mode');mode.setAttribute('aria-label',edit?'Готово':'Редактировать');mode.setAttribute('title',edit?'Готово':'Редактировать');mode.innerHTML=edit?'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m5 12 4 4L19 6"/></svg>':'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/></svg>';
 mode.onclick=()=>show(edit?(state==='preview'?'after':state==='edit'?'read':'preview'):'edit');
 const paragraphs=[...card.children].filter(e=>e.tagName==='P');
 const title=paragraphs.find(e=>e.textContent.includes('Малый регион'));if(title)title.innerHTML='<strong>Малый регион</strong> '+(edit?'<button class="direct-value" type="button">'+sourceName+'</button>':state==='after'?targetName:sourceName);
 const firstLine=card.querySelector('.direct-line');if(firstLine)firstLine.innerHTML=state==='after'?'🌱🌳 Смешанное редколесье':edit?'<button class="direct-value" type="button">🌱 Открытые равнины</button>':'🌱 Открытые равнины';
 const height=row('Высота: ',state==='height'?'2 — холмы':'1 — равнины',edit,()=>show('height'));firstLine?.after(height);
 const hex=[...card.children].find(e=>e.textContent.includes('Координаты гекса'));const owner=row('Регион гекса: ',state==='after'?targetName:sourceName,edit,()=>show('select-target'));hex?.after(owner);
 if(state==='select-target'){
  owner.innerHTML='Регион гекса: <select aria-label="Новый регион гекса"><option>Выберите соседа…</option><option>'+targetName+' · 11 гексов</option><option>'+sourceName+' · без изменения</option></select>';
  owner.querySelector('select').onchange=()=>show('preview');owner.after(notice('Выберите соседний регион на карте или в строке. <span class="e7-small">Esc — сбросить.</span>'));
 }
 if(state==='preview'){
  owner.innerHTML='Регион гекса: <span style="color:#7dd3fc">'+sourceName+' → '+targetName+'</span>';
  owner.after(notice('<p><strong>Гекс 3/5 → '+targetName+'</strong></p><p>'+sourceName+': 11 → 10 · '+targetName+': 11 → 12</p><p>Местность: равнины → смешанное редколесье.</p><p class="e7-small">Высота 1. Королевство прежнее. Реки, дороги, заметки и POI сохранены.</p><p>✓ Готово — перенести · Esc — сбросить</p>'));
 }
 if(state==='height'||state==='conflict'){
  height.innerHTML='Высота: <select aria-label="Высота региона"><option>1 — равнины</option><option selected>2 — холмы</option><option>3 — горы</option></select>';
  const replacement=row('Местность региона: ','',false);replacement.innerHTML='Местность региона: <select aria-label="Совместимый биом региона"><option selected>Выберите для высоты 2…</option><option>Открытые холмы</option><option>Смешанные лесистые холмы</option><option>Холмистое редколесье</option></select>';height.after(replacement);
  replacement.after(notice(state==='conflict'?'<p>Равнинный биом не соответствует высоте 2.</p><p>Выберите местность для холмов. Локальные биомы сохранятся.</p>':'<p>Новый уровень: 2 — холмы.</p><p>Выберите совместимую местность региона; затем ✓ Готово.</p>',state==='conflict'));
  replacement.querySelector('select').onchange=()=>{replacement.after(notice('<p>Высота 1 → 2 · Открытые холмы.</p><p>Имена, локальные биомы и F рек сохранятся.</p><p>✓ Готово — применить вместе</p>'));};
 }
 if(state==='error')owner.after(notice('<p><strong>Перенос разорвёт '+sourceName+'.</strong></p><p>Выберите другой гекс. Карта не изменена.</p><p class="e7-small">Гекс-перемычку нельзя отделить одним переносом.</p>',true));
 if(state==='after')owner.after(notice('<span class="e7-success">Перенесён гекс 3/5.</span> <span class="e7-small">Отменить — вернуть всю операцию.</span>'));
 if(['select-target','preview','error','after'].includes(state)){
  const cells=[...document.querySelectorAll('polygon.hex[data-hex-key]')];const region3=new Set(['3,4','2,4','2,5','1,5','1,4','4,3','4,4','2,3','3,3','0,4','5,2']);
  if(state==='after')region3.add('3,5');
  const rect=document.querySelector('.map-viewport').getBoundingClientRect(),overlay=document.createElementNS(ns,'svg');overlay.setAttribute('data-e7-overlay','');Object.assign(overlay.style,{position:'fixed',left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px',pointerEvents:'none',background:'none',zIndex:'30'});overlay.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);document.body.append(overlay);
  const borders=new Map();let source;
  for(const cell of cells){const k=cell.dataset.hexKey;if(!region3.has(k)&&k!=='3,5')continue;const m=cell.getScreenCTM();if(!m)continue;const points=[...cell.points].map(p=>new DOMPoint(p.x,p.y).matrixTransform(m)).map(p=>[p.x-rect.x,p.y-rect.y]);if(k==='3,5'){source=points;if(state!=='after')continue;}for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],id=[a.map(n=>n.toFixed(2)).join(','),b.map(n=>n.toFixed(2)).join(',')].sort().join('|');if(borders.has(id))borders.delete(id);else borders.set(id,[a,b]);}}
  for(const [a,b]of borders.values()){const line=document.createElementNS(ns,'line');line.setAttribute('x1',a[0]);line.setAttribute('y1',a[1]);line.setAttribute('x2',b[0]);line.setAttribute('y2',b[1]);line.setAttribute('class','e7-outline');overlay.append(line);}
  if(source){const line=document.createElementNS(ns,'polygon');line.setAttribute('points',source.map(p=>p.join(',')).join(' '));line.setAttribute('class','e7-outline e7-source');overlay.append(line);}

 }
 if(state==='edit'){
  for(const e of card.querySelectorAll('.tag-die'))e.style.width=e.style.height='17px';
 }
}
window.e7Show=show;show('read');
})();
