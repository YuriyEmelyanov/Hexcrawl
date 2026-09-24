import { GERMANIC_MODEL } from './toponymModels/germanic.ts';
import type { ToponymKind, ToponymModel, ToponymModelId } from './toponymModels/types.ts';

export type { ToponymKind, ToponymModelId } from './toponymModels/types.ts';
export type NamePair = { en: string; ru: string };
export type Toponym = NamePair & { kind: ToponymKind; model: ToponymModelId; revision: number };
export type ToponymEntity = { key: string; kind: ToponymKind };
export type ToponymRegistry = Record<string, Toponym>;

export const DEFAULT_TOPONYM_MODEL: ToponymModelId = 'germanic';
export const TOPONYM_MODEL_IDS: readonly ToponymModelId[] = [DEFAULT_TOPONYM_MODEL];
export const TOPONYM_KINDS: readonly ToponymKind[] = ['region', 'settlement', 'river', 'lake', 'forest', 'mountain', 'swamp'];

// Future language groups add a model file and one entry here. Map geometry,
// generation, persistence and UI continue to use the same engine.
const MODELS: Record<ToponymModelId, ToponymModel> = { germanic: GERMANIC_MODEL };

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  result ^= result >>> 16;
  result = Math.imul(result, 0x7feb352d);
  result ^= result >>> 15;
  result = Math.imul(result, 0x846ca68b);
  return (result ^ (result >>> 16)) >>> 0;
}

export function makeToponym(seed: number, key: string, kind: ToponymKind, model: ToponymModelId = DEFAULT_TOPONYM_MODEL, revision = 0, attempt = 0): Toponym {
  const { roots, endings, qualifiers } = MODELS[model];
  const suffixes = endings[kind];
  const tier = Math.floor(attempt / 512);
  const variant = attempt % 512;
  const rootIndex = hash(`${seed}:${key}:${revision}:${variant}:root`) % roots.length;
  const endingIndex = hash(`${seed}:${key}:${revision}:${variant}:ending`) % suffixes.length;
  const root = roots[rootIndex];
  const suffix = suffixes[endingIndex];
  const qualifier = tier === 0 ? null : qualifiers[(tier - 1) % qualifiers.length];
  const en = qualifier ? qualifier[0] + root[0][0].toLowerCase() + root[0].slice(1) + suffix[0] : root[0] + suffix[0];
  const ru = qualifier ? qualifier[1] + root[1][0].toLowerCase() + root[1].slice(1) + suffix[1] : root[1] + suffix[1];
  return { en, ru, kind, model, revision };
}

const normalize = (name: string): string => name.trim().toLocaleLowerCase();

export function synchronizeToponyms(
  current: ToponymRegistry, entities: readonly ToponymEntity[], seed: number, model: ToponymModelId = DEFAULT_TOPONYM_MODEL
): ToponymRegistry {
  const result: ToponymRegistry = {};
  const en = new Set<string>();
  const ru = new Set<string>();
  for (const { key, kind } of entities) {
    const previous = current[key];
    if (previous && !en.has(normalize(previous.en)) && !ru.has(normalize(previous.ru))) {
      result[key] = previous.kind === kind ? previous : { ...previous, kind };
      en.add(normalize(previous.en));
      ru.add(normalize(previous.ru));
    }
  }
  for (const { key, kind } of entities) {
    if (result[key]) continue;
    for (let attempt = 0; attempt < 4096; attempt += 1) {
      const candidate = makeToponym(seed, key, kind, model, 0, attempt);
      if (en.has(normalize(candidate.en)) || ru.has(normalize(candidate.ru))) continue;
      result[key] = candidate;
      en.add(normalize(candidate.en));
      ru.add(normalize(candidate.ru));
      break;
    }
    if (!result[key]) throw new Error(`Cannot find a unique name for ${key}`);
  }
  // Keep JSON snapshots stable regardless of entity discovery order.
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}

export function rerollToponym(current: ToponymRegistry, key: string, seed: number): ToponymRegistry {
  const previous = current[key];
  if (!previous) return current;
  const others = Object.entries(current).filter(([otherKey]) => otherKey !== key);
  for (let revision = previous.revision + 1; revision < previous.revision + 4096; revision += 1) {
    const candidate = makeToponym(seed, key, previous.kind, previous.model, revision);
    if (candidate.en === previous.en && candidate.ru === previous.ru) continue;
    if (others.some(([, name]) => normalize(name.en) === normalize(candidate.en) || normalize(name.ru) === normalize(candidate.ru))) continue;
    return { ...current, [key]: candidate };
  }
  return current;
}

export function renameToponym(current: ToponymRegistry, key: string, en: string, ru: string): ToponymRegistry | null {
  const previous = current[key];
  const nextEn = en.trim();
  const nextRu = ru.trim();
  if (!previous || !nextEn || !nextRu || nextEn.length > 80 || nextRu.length > 80) return null;
  if (Object.entries(current).some(([otherKey, name]) => otherKey !== key && (
    normalize(name.en) === normalize(nextEn) || normalize(name.ru) === normalize(nextRu)
  ))) return null;
  return { ...current, [key]: { ...previous, en: nextEn, ru: nextRu } };
}

export function isToponymRegistry(value: unknown): value is ToponymRegistry {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.entries(value).every(([key, name]) => (
    /^(region|river|lake):\d+$|^settlement:\d+:-?\d+,-?\d+$/.test(key)
    && typeof name === 'object' && name !== null
    && typeof (name as Toponym).en === 'string' && (name as Toponym).en.length > 0 && (name as Toponym).en.length <= 80
    && typeof (name as Toponym).ru === 'string' && (name as Toponym).ru.length > 0 && (name as Toponym).ru.length <= 80
    && TOPONYM_KINDS.includes((name as Toponym).kind)
    && TOPONYM_MODEL_IDS.includes((name as Toponym).model)
    && Number.isSafeInteger((name as Toponym).revision) && (name as Toponym).revision >= 0
  ));
}
