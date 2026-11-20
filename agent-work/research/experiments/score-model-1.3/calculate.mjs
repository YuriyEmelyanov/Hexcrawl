export function measure(rows) {
  const counts={full:0,partial:0,absent:0,unknown:0};
  let earned=0, possible=0;
  const ids=new Set();
  for (const row of rows) {
    if (ids.has(row.id)) throw Error('Duplicate scoring unit: '+row.id);
    ids.add(row.id);
    if (!Object.hasOwn(counts,row.status)) throw Error('Invalid status: '+row.id);
    counts[row.status]++;
    let credit={full:1,partial:0.5,absent:0,unknown:0}[row.status];
    if (row.cases) {
      if(!row.cases.length || row.cases.some(x=>!['pass','fail','unknown'].includes(x))) throw Error('Invalid cases');
      credit=row.cases.filter(x=>x==='pass').length/row.cases.length;
      possible+=row.cases.filter(x=>x==='unknown').length/row.cases.length;
    } else if(row.status==='unknown') possible++;
    earned+=credit;
  }
  const n=rows.length;
  return {n,...counts,earned,confirmed_pct:n?100*earned/n:null,upper_pct:n?100*(earned+possible)/n:null};
}
export function report(data) {
  const games=[...new Set([...data.top20,...data.rules.map(r=>r.game)])];
  return [1,2,3].map(level=>{
    const by_game=Object.fromEntries(games.map(g=>[g,measure(data.rules.filter(r=>r.game===g&&r.level===level))]));
    const cells=data.top20.map(g=>by_game[g]);
    const weighted=(upper)=>cells.reduce((sum,m)=>sum+(upper?(m.upper_pct??100):(m.confirmed_pct??0)),0)/cells.length;
    return {level,common:measure(data.common.filter(r=>r.level===level)),by_game,
      top20_confirmed_floor_pct:weighted(false),top20_open_ceiling_pct:weighted(true),
      top20_games_with_requirements:cells.filter(m=>m.n).length,
      top20_fully_supported:data.top20.filter(g=>data.closed_corpora[level]?.includes(g)&&by_game[g].n>0&&by_game[g].full===by_game[g].n)};
  });
}
if (typeof process!=='undefined' && process.argv[1]?.endsWith('calculate.mjs')){
  const fs=await import('node:fs/promises');
  const data=JSON.parse(await fs.readFile(new URL('./baseline.json',import.meta.url),'utf8'));
  console.log(JSON.stringify(report(data),null,2));
}
