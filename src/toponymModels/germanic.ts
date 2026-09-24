import type { ToponymModel, Word } from './types.ts';

// Curated pairs keep Latin and Cyrillic forms aligned without transliteration
// heuristics. No spaces inside a name element.
const words = (list: string): Word[] => list.trim().split(/\s+/).map((entry) => {
  const [en, ru] = entry.split('=');
  if (!en || !ru) throw new Error(`Invalid place-name element: ${entry}`);
  return [en, ru];
});

// A single model contains several coherent formation traditions. They are
// internal vocabulary, not public "styles" and never combine within one name.
// All outputs are fictional; these lists are not historical reconstructions.
export const GERMANIC_MODEL: ToponymModel = {
  id: 'germanic',
  registers: [
    {
      // Northern Germanic inspired: by/heim/stad and elv/vatn/fjell/myr.
      roots: words('Ald=Альд Ask=Аск Berg=Берг Bjor=Бьор Eik=Эйк Falk=Фальк Hrafn=Храфн Huld=Хульд Is=Ис Jarn=Ярн Kald=Кальд Lind=Линд Orm=Орм Ravn=Равн Skar=Скар Svan=Сван Tor=Тор Ulv=Ульв Varg=Варг Vind=Винд'),
      founders: words('Einars=Эйнарс Alriks=Альрикс Brynhilds=Брюнхильдс Toruns=Торунс'),
      endings: {
        region: words('land=ланд mark=марк dal=даль rike=рике vang=ванг'),
        settlement: words('by=бю heim=хейм stad=стад gard=гард set=сет tun=тун'),
        river: words('elv=эльв bekk=бекк å=о straum=страум'),
        lake: words('vatn=ватн tjern=тьерн sjø=шё tarn=тарн'),
        forest: words('skog=ског lund=лунд holt=хольт ved=вед'),
        mountain: words('fjell=фьелль berg=берг haug=хауг skar=скар'),
        swamp: words('myr=мюр mos=мос fen=фен sump=сумп')
      },
      independent: {
        region: words('Vardalen=Вардален Eyrmark=Эйрмарк Rostland=Ростланд'),
        settlement: words('Skjolde=Шьольде Kjerun=Кьерун Austren=Аустрен'),
        river: words('Eira=Эйра Lyså=Люсо Vestren=Вестрен'),
        lake: words('Tjerva=Тьерва Vannor=Ваннор Isrun=Исрун'),
        forest: words('Hedlund=Хедлунд Ravnskog=Равнског Eikholt=Эйкхольт'),
        mountain: words('Hegrafjell=Хеграфьелль Vardskar=Вардскар Rosthaug=Ростхауг'),
        swamp: words('Dimmyr=Диммюр Fenra=Фенра Mørmos=Мёрмос')
      },
      qualifiers: words('Nord=Норд Aust=Ауст Gamle=Гамле Ytre=Ютре')
    },
    {
      // English / Old English inspired: ton/ham/bury and brook/mere/wood/fen.
      roots: words('Alder=Олдер Ash=Эш Bram=Брам Brindle=Бриндл Cran=Кран Dun=Дан Elder=Элдер Fern=Ферн Glen=Глен Hart=Харт Hazel=Хейзел Hollow=Холлоу Oak=Оук Red=Ред Rook=Рук Thorn=Торн Wend=Уэнд Wych=Уич Yarrow=Ярроу White=Уайт'),
      founders: words('Edric=Эдрик Oswin=Освин Wulfric=Вульфрик Cenred=Кенред'),
      endings: {
        region: words('shire=шир vale=вейл land=ленд reach=рич wold=уолд'),
        settlement: words('ton=тон ham=хем bury=бери stead=стед wick=уик ley=ли'),
        river: words('burn=берн brook=брук water=уотер beck=бек'),
        lake: words('mere=мир pool=пул water=уотер lake=лейк'),
        forest: words('wood=вуд grove=гроув holt=холт shaw=шо'),
        mountain: words('fell=фелл ridge=ридж crag=крэг peak=пик'),
        swamp: words('fen=фен marsh=марш moor=мур mire=майр')
      },
      independent: {
        region: words('Harrowvale=Харроувейл Fenreach=Фенрич Morrowshire=Морроушир'),
        settlement: words('Harrow=Харроу Breckin=Брекин Wenbury=Уэнбери'),
        river: words('Avel=Авел Harrowbeck=Харроубек Wendle=Уэндл'),
        lake: words('Dunmere=Данмир Eldpool=Элдпул Mistmere=Мистмир'),
        forest: words('Hawthorn=Хоторн Briarswood=Брайарсвуд Brackenholt=Брекенхолт'),
        mountain: words('Dunfell=Данфелл Greycrag=Грейкрэг Rookridge=Рукридж'),
        swamp: words('Mireholt=Майрхолт Rookfen=Рукфен Brammarsh=Браммарш')
      },
      qualifiers: words('Old=Олд North=Норт Little=Литл Upper=Аппер')
    },
    {
      // High German inspired: dorf/heim/burg and bach/see/wald/berg.
      roots: words('Adler=Адлер Birken=Биркен Dunkel=Дункель Eichen=Айхен Falken=Фалькен Felsen=Фельзен Grün=Грюн Hirsch=Хирш Kalten=Кальтен Linden=Линден Morgen=Морген Raben=Рабен Rosen=Розен Rot=Рот Schatten=Шаттен Silber=Зильбер Sonnen=Зоннен Tannen=Таннен Wolfs=Вольфс Zinn=Цинн'),
      founders: words('Gerwins=Гервинс Rudolfs=Рудольфс Adelberts=Адельбертс Wilhelms=Вильгельмс'),
      endings: {
        region: words('mark=марк gau=гау land=ланд tal=таль grund=грунд'),
        settlement: words('dorf=дорф heim=хайм burg=бург hausen=хаузен stadt=штадт hof=хоф'),
        river: words('bach=бах ach=ах fluss=флусс wasser=вассер'),
        lake: words('see=зе weiher=вайер teich=тайх wasser=вассер'),
        forest: words('wald=вальд forst=форст hain=хайн holz=хольц'),
        mountain: words('berg=берг fels=фельс horn=хорн kamm=камм'),
        swamp: words('moor=мор bruch=брух ried=рид sumpf=зумпф')
      },
      independent: {
        region: words('Wendelgau=Вендельгау Dämmermark=Деммермарк Hirtenland=Хиртенланд'),
        settlement: words('Kranzenau=Кранценау Wolfsried=Вольфсрид Felsenhof=Фельзенхоф'),
        river: words('Wendra=Вендра Eisach=Айзах Tiefbach=Тифбах'),
        lake: words('Silbersee=Зильберзе Dämmerweiher=Деммервайер Hirschsee=Хиршзе'),
        forest: words('Eichenhain=Айхенхайн Tannenforst=Танненфорст Rabenwald=Рабенвальд'),
        mountain: words('Dunkelhorn=Дункельхорн Wolfsfels=Вольфсфельс Falkenberg=Фалькенберг'),
        swamp: words('Kaltmoor=Кальтмор Torfried=Торфрид Dämmerbruch=Деммербрух')
      },
      qualifiers: words('Alt=Альт Neu=Ной Ober=Обер Nieder=Нидер')
    },
    {
      // Dutch / Low German inspired: dorp/wijk/dam and beek/meer/woud/veen.
      roots: words('Blauw=Блау Doorn=Дорн Eiken=Эйкен Goud=Гауд Groen=Грун Hoog=Хог Klein=Клейн Koper=Копер Laag=Лаг Ooster=Остер Riet=Рит Schaar=Схар Valk=Вальк Wester=Вестер Wilgen=Вилген Wolven=Вольвен Zand=Занд Zilver=Зилвер Zwart=Зварт Zwenk=Звенк'),
      founders: words('Willems=Виллемс Dirks=Диркс Floris=Флорис Hendriks=Хендрикс'),
      endings: {
        region: words('land=ланд waard=вард streek=стрек mark=марк veld=велд'),
        settlement: words('dorp=дорп wijk=вейк dam=дам huizen=хаузен burg=бург veld=велд'),
        river: words('stroom=стром beek=бек vliet=влит diep=дип'),
        lake: words('meer=мер plas=плас ven=фен water=ватер'),
        forest: words('woud=вауд bos=бос lo=ло hout=хаут'),
        mountain: words('berg=берг heuvel=хёвел kam=кам rug=рюх'),
        swamp: words('veen=фен broek=брук moer=мур riet=рит')
      },
      independent: {
        region: words('Koperwaard=Копервард Zilvermark=Зилвермарк Oostveen=Остфен'),
        settlement: words('Lagewijk=Лагевейк Oosterhuizen=Остерхаузен Zandendam=Зандендам'),
        river: words('Rietvliet=Ритвлит Krombeek=Кромбек Zilverstroom=Зилверстром'),
        lake: words('Blauwmeer=Блаумер Valkenplas=Валькенплас Kleineven=Клейневен'),
        forest: words('Eikenbos=Эйкенбос Wilgenwoud=Вилгенвауд Wolvenlo=Вольвенло'),
        mountain: words('Hoogberg=Хогберг Zwartheuvel=Звартхёвел Steenkam=Стенкам'),
        swamp: words('Rietbroek=Ритбрук Zwartveen=Звартфен Laagmoer=Лагмур')
      },
      qualifiers: words('Oud=Ауд Nieuw=Нью Ooster=Остер Wester=Вестер')
    }
  ]
};
