import {createDetailGrid,detailCellCenter,detailCellPolygon,worldToDetailCell,type DetailCell,type WorldPoint} from './detailGrid.ts';

/** A unit adapter over DETAIL1's single geometry implementation. View steps are
 * unchanged: PF2's twelve miles between vertices are not viewStep12. */
export type PhysicalUnit = Readonly<{length:number;unit:'mile';measurement:'opposite_vertices'|'across_flats';origin:WorldPoint;orientation:'pointy'}>;
export function physicalUnitWidth(unit:PhysicalUnit):number {
 if(!unit||unit.unit!=='mile'||unit.orientation!=='pointy'||!['opposite_vertices','across_flats'].includes(unit.measurement)
   ||!Number.isFinite(unit.length)||unit.length<=0||!unit.origin||!Number.isFinite(unit.origin.x)||!Number.isFinite(unit.origin.y))throw Error('Invalid physical unit');
 const width=unit.length*(unit.measurement==='opposite_vertices'?Math.sqrt(3)/2:1);
 if(!Number.isFinite(width)||width<=0)throw Error('Invalid physical width');return width;
}
const normalized=createDetailGrid(1);
export function physicalUnitCell(unit:PhysicalUnit,p:WorldPoint):DetailCell {
 const width=physicalUnitWidth(unit);return worldToDetailCell(normalized,{x:(p.x-unit.origin.x)/width,y:(p.y-unit.origin.y)/width});
}
export function physicalUnitCenter(unit:PhysicalUnit,c:DetailCell):WorldPoint {
 const width=physicalUnitWidth(unit),p=detailCellCenter(normalized,c);
 const result={x:unit.origin.x+p.x*width,y:unit.origin.y+p.y*width};
 if(!Number.isFinite(result.x)||!Number.isFinite(result.y))throw Error('Unsafe physical center');return result;
}
export function physicalUnitPolygon(unit:PhysicalUnit,c:DetailCell):WorldPoint[] {
 const width=physicalUnitWidth(unit);return detailCellPolygon(normalized,c).map(p=>{
  const result={x:unit.origin.x+p.x*width,y:unit.origin.y+p.y*width};
  if(!Number.isFinite(result.x)||!Number.isFinite(result.y))throw Error('Unsafe physical polygon');return result;
 });
}
