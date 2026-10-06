import type { GenerationMode } from './kingdoms.ts';
export function modeRegionSize(mode: GenerationMode, classic: () => number, first = false, random = Math.random): number {
  return mode === 'classic' ? classic() : first ? 11 + Math.floor(random()*2) : 1 + Math.floor(random()*12);
}
