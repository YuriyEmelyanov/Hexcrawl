export const MANUAL_BIOMES = {
  desert: {
    ru: 'Пустыня', en: 'Desert', height: 1,
    terrain: 'sand', neighborProfile: 'semi_desert', emoji: '🏜️', secondaryEmojis: [],
  },
  dunes: {
    ru: 'Дюны', en: 'Dunes', height: 1,
    terrain: 'sand', neighborProfile: 'semi_desert', emoji: '🏜️', secondaryEmojis: [],
  },
  lowland_jungle: {
    ru: 'Равнинные джунгли', en: 'Lowland jungle', height: 1,
    terrain: 'forest', neighborProfile: 'plain_deciduous_forest', emoji: '🌴', secondaryEmojis: [],
  },
  jungle_hills: {
    ru: 'Джунгли на холмах', en: 'Jungle hills', height: 2,
    terrain: 'forest', neighborProfile: 'deciduous_forested_hills', emoji: '〰️', secondaryEmojis: ['🌴'],
  },
  jungle_mountains: {
    ru: 'Горные джунгли', en: 'Mountain jungle', height: 3,
    terrain: 'forest', neighborProfile: 'deciduous_mountain_forest', emoji: '⛰', secondaryEmojis: ['🌴'],
  },
  savanna: {
    ru: 'Саванна', en: 'Savanna', height: 1,
    terrain: 'open', neighborProfile: 'open_plains', emoji: '🌾', secondaryEmojis: [],
  },
  mushroom_forest: {
    ru: 'Грибной лес', en: 'Mushroom forest', height: 1,
    terrain: 'forest', neighborProfile: 'plain_deciduous_forest', emoji: '🍄', secondaryEmojis: [],
  },
  snow_plains: {
    ru: 'Снежно-ледяная равнина', en: 'Snow and ice plains', height: 1,
    terrain: 'snow_ice', neighborProfile: 'open_plains', emoji: '❄️', secondaryEmojis: [],
  },
  snow_hills: {
    ru: 'Снежные холмы', en: 'Snow hills', height: 2,
    terrain: 'snow_ice', neighborProfile: 'open_hills', emoji: '〰️', secondaryEmojis: ['❄️'],
  },
  snow_mountains: {
    ru: 'Снежные горы', en: 'Snow mountains', height: 3,
    terrain: 'snow_ice', neighborProfile: 'mountains', emoji: '⛰', secondaryEmojis: ['❄️'],
  },
} as const;

export type ManualBiomeId = keyof typeof MANUAL_BIOMES;

export function manualBiome(id: string) {
  return Object.prototype.hasOwnProperty.call(MANUAL_BIOMES, id) ? MANUAL_BIOMES[id as ManualBiomeId] : undefined;
}
