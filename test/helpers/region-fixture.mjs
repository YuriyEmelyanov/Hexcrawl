import fs from 'node:fs';
// Small authored v7 map for E7 integration/DOM tests. No random search series.
export function regionFixture(mode='classic',options={}){
 const d=JSON.parse(fs.readFileSync(new URL('../fixtures/e6-water-editor.json',import.meta.url)));
 const h=(q,r=0)=>({q,r}),base=d.map.regions[0];
 const make=(id,hexes)=>({...base,id,generationMode:mode,hexes,centerHex:hexes[0],anchorHex:hexes[1],targetSize:18,finalSize:hexes.length,isTract:false,suppressCentralPoi:true,pointsOfInterest:[],pointOfInterestKinds:{}});
 const a=make(1,[h(0),h(1),h(2)]),b=make(2,[h(3),h(3,1)]);
 a.pointsOfInterest=[h(2)];a.pointOfInterestKinds={'2,0':'village'};
 d.map.regions=[a,b];d.map.candidateHexes=[];
 if(mode==='mythic'){
  a.kingdomId=1;b.kingdomId=1;
  d.map.kingdoms=[{id:1,origin:h(0),regionIds:[1,2],name:{ru:'Северное королевство',en:'Northern Kingdom'},color:'hsl(17 65% 68%)',anchor:h(0)}];
 }
 d.map.terrainByHexKey={};d.map.waterPoiByHexKey={};d.map.biomeOverrideByHexKey={'2,0':'mountains'};
 d.map.gmNotesByHexKey={'2,0':'Заметка мастера 🧭\nExact note'};
 d.map.toponyms.names={};d.ui={...d.ui,generationMode:mode,selectedHex:h(2)};
 if(options.river){
  const path=options.river==='directed'?[{key:'96.995,-28',x:96.9948452238571,y:-28},{key:'121.244,-14',x:121.2435565298214,y:-14},{key:'145.492,-28',x:145.4922678357857,y:-28}]:[{key:'121.244,-14',x:121.2435565298214,y:-14},{key:'121.244,14',x:121.2435565298214,y:14}];
  d.map.rivers=[{id:5,regionId:1,vertexPath:path,sectors:path.slice(1).map((v,i)=>({id:`e7-edge-${i}`,riverId:5,sectorIndex:i+1,vertexPath:[path[i],v],edgeKeys:[[path[i].key,v.key].sort().join('|')],startVertexKey:path[i].key,endVertexKey:v.key,startReason:i?'region_boundary':'river_start',endReason:i===path.length-2?'river_end':'region_boundary',fullness:1,assignedRegionId:options.river==='directed'?i+1:1}))}];d.counters.nextRiverId=6;
  d.map.toponyms.names['river:5']={ru:'Серебряная река',en:'Silver River',kind:'river',model:'germanic',revision:1};
 }
 if(options.duplicateTargets){
  const c=make(3,[h(2,1),h(1,2)]);if(mode==='mythic'){c.kingdomId=1;d.map.kingdoms[0].regionIds.push(3);}d.map.regions.push(c);
  for(const id of [1,2,3])d.map.toponyms.names[`region:${id}`]={ru:'Одинаковое имя',en:'Same Name',kind:'region',model:'germanic',revision:1};
 }
 return d;
}
