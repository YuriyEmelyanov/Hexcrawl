import type { ToponymModel } from './types.ts';

// One internally consistent, Germanic-inspired fantasy naming tradition.
// Paired Russian forms are curated, never transliterated at runtime.
export const GERMANIC_MODEL: ToponymModel = {
  id: 'germanic',
  qualifiers: [['Nord', 'Норд'], ['Syd', 'Сюд'], ['Ost', 'Ост'], ['Vest', 'Вест'], ['Stor', 'Стор'], ['Lit', 'Лит'], ['Gam', 'Гам']],
  roots: [
    ['Ald', 'Альд'], ['Ask', 'Аск'], ['Birk', 'Бирк'], ['Bjorn', 'Бьорн'],
    ['Eik', 'Эйк'], ['Eld', 'Эльд'], ['Falk', 'Фальк'], ['Frost', 'Фрост'],
    ['Grim', 'Грим'], ['Hav', 'Хав'], ['Hrafn', 'Храфн'], ['Kald', 'Кальд'],
    ['Kvern', 'Кверн'], ['Lind', 'Линд'], ['Orm', 'Орм'], ['Osp', 'Осп'],
    ['Ravn', 'Равн'], ['Skald', 'Скальд'], ['Skar', 'Скар'], ['Sol', 'Соль'],
    ['Sten', 'Стен'], ['Storm', 'Сторм'], ['Sund', 'Сунд'], ['Thor', 'Тор'],
    ['Ulv', 'Ульв'], ['Varg', 'Варг'], ['Vind', 'Винд'], ['Huld', 'Хульд'],
    ['Nord', 'Норд'], ['Svan', 'Сван'], ['Jarn', 'Ярн'], ['Hjalm', 'Хьяльм']
  ],
  endings: {
    region: [['land', 'ланд'], ['mark', 'марк'], ['dal', 'даль']],
    settlement: [['by', 'бю'], ['vik', 'вик'], ['heim', 'хейм'], ['stad', 'стад'], ['havn', 'хавн']],
    river: [['elv', 'эльв'], ['bekk', 'бекк']],
    lake: [['vatn', 'ватн'], ['tjern', 'тьерн']],
    forest: [['skog', 'ског'], ['lund', 'лунд']],
    mountain: [['fjell', 'фьелль'], ['haug', 'хауг']],
    swamp: [['myr', 'мюр']]
  }
};
