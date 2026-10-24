/** Saved world RNG. All arithmetic is modulo 2^32, outputs are in [0, 1). */
export const GENERATOR_VERSION = 'regions-2026-10-24-rng.1';
export const RNG_VERSION = 'mulberry32-v1';
export type GenerationState = {
  generatorVersion: string; rngVersion: typeof RNG_VERSION; masterSeed: number;
  streams: { geography: number; poi: number };
};
export type RandomStreams = { geography: () => number; poi: () => number };
// Compatibility for pure helper callers only. Production always supplies streams.
export const fallbackRandomStreams: RandomStreams = { geography: () => Math.random(), poi: () => Math.random() };
export const poiRandomStreams = (rng: RandomStreams): RandomStreams => ({ geography: rng.poi, poi: rng.poi });
export const isUint32 = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xFFFFFFFF;
export function createGenerationState(seed: number): GenerationState {
  if (!isUint32(seed)) throw new Error('Seed must be uint32');
  return {generatorVersion: GENERATOR_VERSION, rngVersion: RNG_VERSION, masterSeed: seed,
    streams: {geography: seed >>> 0, poi: (seed ^ 0x9E3779B9) >>> 0}};
}
export const cloneGenerationState = (state: GenerationState): GenerationState => ({...state, streams: {...state.streams}});
export function draw(state: GenerationState, stream: keyof GenerationState['streams']): number {
  const value = state.streams[stream] = (state.streams[stream] + 0x6D2B79F5) >>> 0;
  let t = Math.imul(value ^ (value >>> 15), value | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const streamsFor = (state: GenerationState): RandomStreams => ({geography: () => draw(state,'geography'), poi: () => draw(state,'poi')});
export const toponymSeedFor = (seed: number) => (seed ^ 0x85EBCA6B) >>> 0;
export function newWorldSeed(): number {
  // Entropy is only read on creation/reset, never while continuing a world.
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
export function generationValidationPath(value: unknown): string | null {
  const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!record(value)) return 'generation';
  if (value.generatorVersion !== GENERATOR_VERSION) return 'generation.generatorVersion';
  if (value.rngVersion !== RNG_VERSION) return 'generation.rngVersion';
  if (!isUint32(value.masterSeed)) return 'generation.masterSeed';
  if (!record(value.streams)) return 'generation.streams';
  for (const name of ['geography','poi']) if (!isUint32(value.streams[name])) return 'generation.streams.' + name;
  return null;
}
