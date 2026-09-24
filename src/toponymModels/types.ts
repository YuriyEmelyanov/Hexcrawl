export type ToponymKind = 'region' | 'settlement' | 'river' | 'lake' | 'forest' | 'mountain' | 'swamp';
export type ToponymModelId = 'germanic';

export type Word = readonly [en: string, ru: string];

export type ToponymModel = {
  id: ToponymModelId;
  roots: readonly Word[];
  qualifiers: readonly Word[];
  endings: Record<ToponymKind, readonly Word[]>;
};
