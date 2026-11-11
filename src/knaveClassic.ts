import {validatePreparation,remapPreparation,type PreparationState} from './tags/tablePreparation.ts';
import {validateKnaveContent,type KnaveContentState} from './tags/knave.ts';
/** KNC-1.0 detached profile/annotation contracts. App v10 wiring is separate.
 * No ambient RNG, geography generation, source corpus, or UI side effects. */
export type KnaveProfile = {
  id: 'classic.knave2'; version: 1;
  physicalHex: {length: 6; unit: 'mile'; measurementConvention: null};
};
export type Difficulty = 'unspecified' | 'normal' | 'difficult';
export type Discovery = 'passage' | 'exploration' | 'interaction';
export type PoiDiscovery = {mode: Discovery; clueText: string};
export type KnaveLayer = {
  profile: KnaveProfile;
  difficultyByHex: Record<string, Exclude<Difficulty, 'unspecified'>>;
  discoveryByPoi: Record<string, PoiDiscovery>;
  content?: KnaveContentState|PreparationState;
};
/** Live sets come from the accepted candidate document, not the old map. */
export type KnaveContext = {hexes: ReadonlySet<string>; dryHexes: ReadonlySet<string>; pois: ReadonlySet<string>};
export class KnaveDataError extends Error {
  readonly code: string;
  constructor(code: string) {super(code); this.name = 'KnaveDataError'; this.code = code;}
}
const fail = (code: string): never => {throw new KnaveDataError(code);};
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value) &&
  Object.prototype.toString.call(value) === '[object Object]';
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => own(value, key));
const hexKey = (key: string) => /^-?\d+,-?\d+$/.test(key) && key.split(',').every(n => Number.isSafeInteger(Number(n)) && String(Number(n)) === n);
const poiKey = (key: string) => {
  const match = /^(?:poi:([1-9]\d*):|waterPoi:)(.+)$/.exec(key);
  return !!match && (!match[1] || Number.isSafeInteger(Number(match[1]))) && hexKey(match[2]);
};
const validClue = (value: unknown): value is string => typeof value === 'string' && value.length <= 512 && value === value.trim();

export function newKnaveLayer(): KnaveLayer {
  return {profile: {id: 'classic.knave2', version: 1, physicalHex: {length: 6, unit: 'mile', measurementConvention: null}}, difficultyByHex: {}, discoveryByPoi: {}};
}

/** Undefined means no profile, including legacy documents. Null is malformed.
 * Stored annotations belong to their map objects, independently of the next
 * generation mode. Legacy versions still cannot contain this layer. */
export function validateKnaveLayer(value: unknown, context: KnaveContext, saveVersion: number, mode: 'classic' | 'mythic'): asserts value is KnaveLayer | undefined {
  if (value === undefined) return;
  if ((saveVersion !== 10 && saveVersion !== 11 && saveVersion !== 12) || !['classic','mythic'].includes(mode)) fail('knave_profile_version_or_mode');
  if (!record(value) || !exactKeys(value, own(value??{},'content')?['profile','difficultyByHex','discoveryByPoi','content']:['profile','difficultyByHex','discoveryByPoi'])) fail('knave_layer');
  const layer = value as Record<string, unknown>;
  if(own(layer,'content'))try{if((layer.content as PreparationState)?.schemaVersion===2){if(saveVersion!==12)fail('knave_content_version');validatePreparation(layer.content,context.pois);}else validateKnaveContent(layer.content,context.pois);}catch{fail('knave_content');}
  const p = layer.profile;
  if (!record(p) || !exactKeys(p, ['id','version','physicalHex']) || p.id !== 'classic.knave2' || p.version !== 1) fail('knave_profile');
  const scale = (p as Record<string, unknown>).physicalHex;
  if (!record(scale) || !exactKeys(scale, ['length','unit','measurementConvention']) || scale.length !== 6 || scale.unit !== 'mile' || scale.measurementConvention !== null) fail('knave_scale');
  const difficulties = layer.difficultyByHex, discoveries = layer.discoveryByPoi;
  if (!record(difficulties) || !record(discoveries)) fail('knave_annotations');
  for (const [key, difficulty] of Object.entries(difficulties as Record<string, unknown>)) {
    // A submerged accepted dry flag remains present and may reappear later.
    if (!hexKey(key) || !context.hexes.has(key) || !['normal','difficult'].includes(String(difficulty)) || typeof difficulty !== 'string') fail('knave_difficulty');
  }
  for (const [key, discovery] of Object.entries(discoveries as Record<string, unknown>)) {
    if (!poiKey(key) || !context.pois.has(key) || !record(discovery) || !exactKeys(discovery, ['mode','clueText'])) fail('knave_discovery_owner');
    const d = discovery as Record<string, unknown>;
    if (!['passage','exploration','interaction'].includes(String(d.mode)) || typeof d.mode !== 'string' || !validClue(d.clueText)) fail('knave_discovery');
    if (d.mode === 'interaction' && d.clueText === '') fail('knave_secret_requires_clue');
  }
}

export function setKnaveDifficulty(layer: KnaveLayer, context: KnaveContext, key: string, value: Difficulty): KnaveLayer {
  validateKnaveLayer(layer, context, layer.content?.schemaVersion===2?12:10, 'classic');
  if (!hexKey(key) || !context.dryHexes.has(key) || !context.hexes.has(key)) fail('knave_dry_hex_required');
  if (!['unspecified','normal','difficult'].includes(value)) fail('knave_difficulty');
  if ((layer.difficultyByHex[key] ?? 'unspecified') === value) return layer;
  const next = structuredClone(layer);
  if (value === 'unspecified') delete next.difficultyByHex[key]; else next.difficultyByHex[key] = value;
  return next;
}

export function setKnaveDiscovery(layer: KnaveLayer, context: KnaveContext, key: string, mode: Discovery, clueText?: string): KnaveLayer {
  validateKnaveLayer(layer, context, layer.content?.schemaVersion===2?12:10, 'classic');
  if (!poiKey(key) || !context.pois.has(key)) fail('knave_discovery_owner');
  const previous = layer.discoveryByPoi[key];
  // Switching away from interaction must not erase a previously authored clue.
  const nextValue = {mode, clueText: clueText === undefined ? previous?.clueText ?? '' : clueText.trim()};
  const next = structuredClone(layer);
  next.discoveryByPoi[key] = nextValue;
  validateKnaveLayer(next, context, layer.content?.schemaVersion===2?12:10, 'classic');
  if ((previous?.mode ?? 'passage') === nextValue.mode && (previous?.clueText ?? '') === nextValue.clueText) return layer;
  return next;
}

/** E7/E8 callers remap POI addresses after preparing geometry. Coordinate flags
 * do not follow POIs. Missing targets are a refusal, never a pruning command. */
export function remapKnavePois(layer: KnaveLayer, source: KnaveContext, target: KnaveContext, moves: ReadonlyMap<string, string>): KnaveLayer {
  validateKnaveLayer(layer, source, layer.content?.schemaVersion===2?12:10, 'classic');
  const destinations = new Set<string>();
  for (const [from, to] of moves) {
    if (!source.pois.has(from) || !poiKey(from) || !poiKey(to) || !target.pois.has(to) || destinations.has(to)) fail('knave_poi_move');
    if (from !== to && source.pois.has(to) && !moves.has(to)) fail('knave_poi_collision');
    destinations.add(to);
  }
  const entries = Object.entries(layer.discoveryByPoi).map(([key, value]) => [moves.get(key) ?? key, value] as const);
  if (new Set(entries.map(([key]) => key)).size !== entries.length) fail('knave_poi_collision');
  const next = {...structuredClone(layer), discoveryByPoi: Object.fromEntries(entries.map(([key, value]) => [key, {...value}]))};
  if(next.content){
    const remap=<T,>(values:Record<string,T>):Record<string,T>=>{const pairs=Object.entries(values).map(([k,v])=>[moves.get(k)??k,v]as const);if(new Set(pairs.map(([k])=>k)).size!==pairs.length)fail('knave_poi_collision');return Object.fromEntries(pairs);};
    next.content=next.content.schemaVersion===2?remapPreparation(next.content,moves,target.pois):{schemaVersion:1,byPoi:remap(next.content.byPoi),rollCounters:remap(next.content.rollCounters)};
  }
  validateKnaveLayer(next, target, next.content?.schemaVersion===2?12:10, 'classic');
  return next;
}

/** Explicit loss preview for candidate water/deletion operations. The caller
 * must obtain existing confirmation before dropping any listed payload. */
export type KnaveLoss={kind:'difficulty'|'discovery'|'content';key:string};
export function knaveLosses(layer: KnaveLayer, target: KnaveContext): KnaveLoss[] {
  return [
    ...Object.keys(layer.difficultyByHex).filter(key => !target.hexes.has(key)).map(key => ({kind: 'difficulty' as const, key})),
    ...Object.keys(layer.discoveryByPoi).filter(key => !target.pois.has(key)).map(key => ({kind: 'discovery' as const, key})),
    ...Object.keys(layer.content?.byPoi??{}).filter(key=>!target.pois.has(key)).map(key=>({kind:'content' as const,key}))
  ];
}
/** Only on an already detached candidate after the existing loss gate. */
export function knaveLossValue(layer:KnaveLayer,loss:KnaveLoss):unknown {
  return loss.kind==='difficulty'?layer.difficultyByHex[loss.key]:loss.kind==='discovery'?layer.discoveryByPoi[loss.key]:{snapshot:layer.content?.byPoi[loss.key],counters:layer.content?.schemaVersion===1?layer.content.rollCounters[loss.key]:undefined};
}
export function dropKnaveLoss(layer:KnaveLayer,loss:KnaveLoss):void {
  if(loss.kind==='difficulty')delete layer.difficultyByHex[loss.key];
  else if(loss.kind==='discovery')delete layer.discoveryByPoi[loss.key];
  else if(layer.content){delete layer.content.byPoi[loss.key];if(layer.content.schemaVersion===1)delete layer.content.rollCounters[loss.key];}
}
