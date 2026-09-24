export type ToponymKind = 'region' | 'settlement' | 'river' | 'lake' | 'forest' | 'mountain' | 'swamp';
export type ToponymModelId = 'germanic';

export type Word = readonly [en: string, ru: string];

export type NamingRegister = {
  // A register keeps its own stems and generic elements together. Mixing them
  // across languages produces implausible compounds even within one family.
  roots: readonly Word[];
  // Personal-name stems are used only for settlements.
  founders: readonly Word[];
  independent: Record<ToponymKind, readonly Word[]>;
  endings: Record<ToponymKind, readonly Word[]>;
  qualifiers: readonly Word[];
};

export type ToponymModel = {
  id: ToponymModelId;
  registers: readonly NamingRegister[];
};
