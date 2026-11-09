import {TableResultRow} from './TableResultRow';
import {knaveResultText,type KnavePoiContent} from './knave';

type Props={content:KnavePoiContent;owner:string;language:string;disabled:boolean;animation?:{slot?:number;revision:number;expiresAt:number};onRoll:(part:'primary'|'trait'|'both')=>boolean};
const labels={locations:{ru:'Место',en:'Location'},structures:{ru:'Постройка',en:'Structure'},dungeons:{ru:'Подземелье',en:'Dungeon'},place_traits:{ru:'Особенность места',en:'Place trait'}};
export function KnaveContentRow({content,owner,language,disabled,animation,onRoll}:Props){
 const ru=language==='ru',lang=ru?'ru':'en';
 const render=(part:'primary'|'trait')=>{
   const result=part==='primary'?content.site:content.trait;if(!result)return null;
   const table=part==='primary'?content.site!.table:'place_traits',slot=part==='primary'?0:1,label=labels[table][lang];
   const value=knaveResultText(result,table,language);
   const active=!!animation&&animation.expiresAt>Date.now()&&(animation.slot===undefined||animation.slot===slot);
   return <div className="knave-result" data-knave-part={part} key={part}>
     <TableResultRow label={label} language={language} owner={owner} disabled={disabled}
       components={[{actions:[{slot,current:value,purpose:part==='primary'?(ru?'Бросок':'Roll'):'d100',pick:part==='primary',values:part==='trait'?[content.trait.roll]:undefined,sides:part==='trait'?100:undefined,active,animationKey:animation?.revision}],result:value}]}
       onRoll={()=>onRoll(part)} onRollAll={()=>onRoll(content.site?'both':'trait')} allLabel={content.site?(ru?'Перебросить оба':'Reroll both'):(ru?'Перебросить':'Reroll')}/>
   </div>;
 };
 return <>{render('primary')}{render('trait')}</>;
}
