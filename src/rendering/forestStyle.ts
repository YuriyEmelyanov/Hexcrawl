// Canopy colours sampled from the Dolmenwood map's olive deciduous forest.
// Woodland shares the canopy palette and uses a light ground beneath islands.
export const FOREST_PALETTE = {
  deciduous: '#8FA72D', mixed: '#819A36', coniferous: '#728C3E',
  swamp: '#809447', dead: '#92916A'
} as const;
export type ForestFamily = keyof typeof FOREST_PALETTE;
export function forestFamily(biome:string):ForestFamily|null {
  if(biome.startsWith('dead_'))return 'dead';
  if(biome==='swamp_forest')return 'swamp';
  if(!biome.includes('forest')&&!biome.includes('woodland'))return null;
  if(biome.includes('coniferous')||biome==='mountain_woodland')return 'coniferous';
  if(biome.includes('mixed'))return 'mixed';
  return 'deciduous';
}
export const FOREST_EDGE = '#242A16';

export const FOREST_GROUND = '#EADCB8';
export const isWoodland = (biome:string) => biome.includes('woodland');
