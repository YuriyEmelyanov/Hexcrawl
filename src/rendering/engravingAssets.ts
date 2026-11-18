import catalog from './engravingCatalog.json';

export type TerrainKind = keyof typeof catalog;

export function engravingFor(id: string) {
  return Object.prototype.hasOwnProperty.call(catalog, id) ? catalog[id as TerrainKind] : undefined;
}

export function engravingUrl(id: TerrainKind, attempt?: number) {
  return `/terrain/engravings/${id}.png${attempt ? `?retry=${attempt}` : ''}`;
}
