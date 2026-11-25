export type MapWorld = {
  name?: string;
  description?: string;
};

export const WORLD_FIELD_LIMITS = { name: 200, description: 20000 } as const;

const CORNATH: Required<MapWorld> = {
  name: 'Корнат',
  description: 'Открытые пространства в Корнате окутаны полупрозрачной магической дымкой, именуемой «Миазмой». Каждому существу она видится по-своему, но в её пелене неизменно проступают самые сокровенные страхи наблюдателя. Она присутствуют повсюду под открытым небом, однако не могут проникнуть в помещения, полностью окружённые каменными или металлическими стенами. Это явление затуманивает разум и развращает человеческие души, побуждая людей к эгоистичным и злонамеренным поступкам. Длительное пребывание в Миазме может привести к необратимым изменениям.'
};

export function fillCornathWorld(world?: MapWorld): MapWorld {
  return {
    name: world?.name ?? CORNATH.name,
    description: world?.description ?? CORNATH.description
  };
}
