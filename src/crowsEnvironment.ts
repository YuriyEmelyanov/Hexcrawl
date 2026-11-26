export const CROWS_ENVIRONMENTS = {
  coast: { ru: 'Побережье', en: 'Coast' },
  cold: { ru: 'Холодный климат', en: 'Cold climate' },
  desert: { ru: 'Пустыня', en: 'Desert' },
  forest: { ru: 'Лес', en: 'Forest' },
  plains: { ru: 'Равнины', en: 'Plains' },
  highlands: { ru: 'Холмы/горы', en: 'Hills and mountains' },
  swamp: { ru: 'Болото', en: 'Swamp' }
} as const;

export type CrowsEnvironment = keyof typeof CROWS_ENVIRONMENTS;
export type CrowsEnvironmentByHex = Record<string, CrowsEnvironment[]>;
export const CROWS_ENVIRONMENT_ORDER = Object.keys(CROWS_ENVIRONMENTS) as CrowsEnvironment[];

const isEnvironment = (value: unknown): value is CrowsEnvironment =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(CROWS_ENVIRONMENTS, value);

export function automaticCrowsEnvironment(biome: string, elevation: number, coast: boolean): CrowsEnvironment[] {
  const traits: Record<CrowsEnvironment, boolean> = {
    coast,
    cold: ['snow_plains', 'snow_hills', 'snow_mountains'].includes(biome),
    desert: ['desert', 'semi_desert', 'dunes'].includes(biome),
    forest: /forest|woodland|jungle/.test(biome) || biome === 'savanna',
    plains: biome === 'open_plains',
    highlands: elevation > 1,
    swamp: biome === 'swamp' || biome === 'swamp_forest'
  };
  return CROWS_ENVIRONMENT_ORDER.filter(trait => traits[trait]);
}

export function validCrowsEnvironmentByHex(layer: unknown, hexKeys: ReadonlySet<string>): boolean {
  return Boolean(layer && typeof layer === 'object' && !Array.isArray(layer) &&
    Object.entries(layer).every(([key, traits]) => hexKeys.has(key) && Array.isArray(traits) &&
      traits.length > 0 && traits.every(isEnvironment) && new Set(traits).size === traits.length));
}
