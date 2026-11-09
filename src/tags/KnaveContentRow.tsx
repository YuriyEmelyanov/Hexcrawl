import {TableResultRow} from './TableResultRow';
import type {KnavePoiContent} from './knave';

type Props={content:KnavePoiContent;owner:string;language:string;disabled:boolean;animation?:{slot?:number;revision:number;expiresAt:number};onRoll:(part:'primary'|'trait'|'both')=>boolean};
const labels={locations:{ru:'Место',en:'Location'},structures:{ru:'Постройка',en:'Structure'},dungeons:{ru:'Подземелье',en:'Dungeon'},place_traits:{ru:'Особенность места',en:'Place trait'}};
export function KnaveContentRow({content,owner,language,disabled,animation,onRoll}:Props){
 const ru=language==='ru',lang=ru?'ru':'en';
 const render=(part:'primary'|'trait')=>{
   const result=part==='primary'?content.site:content.trait;if(!result)return null;
   const table=part==='primary'?content.site!.table:'place_traits',slot=part==='primary'?0:1,label=labels[table][lang];
   const active=!!animation&&animation.expiresAt>Date.now()&&(animation.slot===undefined||animation.slot===slot);
   return <div className="knave-result" data-knave-part={part} key={part}>
     <TableResultRow label={label} language={language} owner={owner} disabled={disabled}
       components={[{actions:[{slot,current:result.ru,purpose:part==='primary'?(ru?'Совместимый выбор':'Compatible pick'):`d100: ${content.trait.roll===100?'00':content.trait.roll}`,pick:part==='primary',values:part==='trait'?[content.trait.roll]:undefined,sides:part==='trait'?100:undefined,active,animationKey:animation?.revision}],result:<>{result.ru}{!ru?<small lang="ru"> RU</small>:null}</>}]}
       onRoll={()=>onRoll(part)} onRollAll={()=>onRoll(content.site?'both':'trait')} allLabel={content.site?(ru?'Перебросить оба':'Reroll both'):(ru?'Перебросить':'Reroll')}/>
     <details className="knave-source"><summary>{ru?'Источник':'Source'}</summary><small>{`Knave 2e · Torbin RU1.0 · ${table} · ${ru?'строка':'row'} ${result.sourceRow}`}{part==='primary'?` · ${ru?'совместимый пул':'compatible pool'}`:''}{result.references.map((ref,i)=><span key={i}>{` · ${ru?'ссылка не разрешена: стр.':'unresolved reference: p.'} ${ref.printedPage}`}</span>)}</small></details>
   </div>;
 };
 return <>{render('primary')}{render('trait')}</>;
}
