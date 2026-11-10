import type {MythMaterialRecord} from './mythMaterial.ts';

// Supplied RU source, pp29–171; see docs/myth-material.md and source ledger.
// Reference text only. No special tables or executable effects are included.
export const mythMaterialRecords:readonly MythMaterialRecord[]=Object.freeze([
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:0",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 29,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:0:omen:1",
            "ordinal": 1,
            "text": "Старик кричит о видениях, в которых зловонный воздух душит людей во сне. Умоляет помочь распространить весть."
          },
          {
            "id": "mb.myth:0:omen:2",
            "ordinal": 2,
            "text": "Стон в тумане. Хижина в плюще, дом\nумирающей пары стариков. Их дочь ушла\nв поисках лекарства."
          },
          {
            "id": "mb.myth:0:omen:3",
            "ordinal": 3,
            "text": "Веселый охотник и его сын с легкими\nсимптомами преследуют улыбающуюся\nлису, забравшуюся на дерево. Не верят в\nчуму, но считают, что лиса – предвестник\nсмерти. Улыбающаяся лиса хочет стать\nсвидетелем смерти."
          },
          {
            "id": "mb.myth:0:omen:4",
            "ordinal": 4,
            "text": "Напыщенный рыцарь и два оруженосца,\nвозвращающиеся, чтобы доложить о чуме\nПрестолу. Требуют сопровождения от других рыцарей. Несут серую лампу, свет которой виден только носителю."
          },
          {
            "id": "mb.myth:0:omen:5",
            "ordinal": 5,
            "text": "Поляна, угли костра. Толпа больных, при\nсмерти, полных гнева. Клянутся кровью\nна пне красного дуба, с видениями о мести. Атакуют тех, кто за ними наблюдает."
          },
          {
            "id": "mb.myth:0:omen:6",
            "ordinal": 6,
            "text": "Зараженная деревня, источник чумы. Все\nявно заражены. Два Рыцаря Чистки,\nстремящиеся очистить все огнем."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:0:role:1",
            "title": "Злые зараженные",
            "text": "СИЛ 8, ЯСН 6, ДУХ 5, 2ЗЩ\nЛесорубный топор (d8 длин.)\nКонтакты должны пройти спасбросок СИЛ или\nзаболеть. Вызывает потерю d6 СИЛ ежедневно. Есть методы ухода, но нет исцеления."
          },
          {
            "id": "mb.myth:0:role:2",
            "title": "Веселый охотник, Маккан",
            "text": "СИЛ 14, ЯСН 12, ДУХ 15, 4ЗЩ\nКороткий лук (d6 длин.), топор (d6)"
          },
          {
            "id": "mb.myth:0:role:3",
            "title": "Рыцари Чистки, Дирмад и Дункас",
            "text": "СИЛ 12, ЯСН 10, ДУХ 7, 5ЗЩ\nБ3 (кольчуга, шлем, щит)\nЦеп (d8 тяж.), щит (d4)\n3 горшка огня (d6 взрыв, поджигает область)\nБлизнецы, ненавидят друг друга."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:0:omen:1",
            "ordinal": 1,
            "text": "An old man cries out about visions of foul air choking people in their sleep. He begs for help spreading the word."
          },
          {
            "id": "mb.myth:0:omen:2",
            "ordinal": 2,
            "text": "Moaning in the mist. An ivy-covered hut, home to a dying elderly couple. Their daughter has gone in search of a cure."
          },
          {
            "id": "mb.myth:0:omen:3",
            "ordinal": 3,
            "text": "A cheerful hunter and his son, both with mild symptoms, pursue a smiling fox that has climbed a tree. They do not believe in the plague, but think the fox is an omen of death. The smiling fox wants to witness a death."
          },
          {
            "id": "mb.myth:0:omen:4",
            "ordinal": 4,
            "text": "A pompous knight and two squires return to report the plague to the Seat. They demand an escort from other knights. They carry a grey lamp whose light only its bearer can see."
          },
          {
            "id": "mb.myth:0:omen:5",
            "ordinal": 5,
            "text": "A clearing, the embers of a fire. A crowd of sick people, dying and full of anger. They swear blood oaths on a red oak stump, with visions of revenge. They attack anyone watching them."
          },
          {
            "id": "mb.myth:0:omen:6",
            "ordinal": 6,
            "text": "An infected village, the source of the plague. Everyone is visibly infected. Two Purging Knights seek to purge everything with fire."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:0:role:1",
            "title": "Angry Infected",
            "text": "VIG 8, CLA 6, SPI 5, 2GD\nWoodcutting axe (d8 long)\nAnyone in contact must pass a VIG Save or become ill. The illness causes the loss of d6 VIG daily. Care is possible, but there is no cure."
          },
          {
            "id": "mb.myth:0:role:2",
            "title": "Cheerful Hunter, Maccan",
            "text": "VIG 14, CLA 12, SPI 15, 4GD\nShortbow (d6 long), axe (d6)"
          },
          {
            "id": "mb.myth:0:role:3",
            "title": "Purging Knights, Dirmad and Duncas",
            "text": "VIG 12, CLA 10, SPI 7, 5GD\nA3 (mail, helm, shield)\nFlail (d8 hefty), shield (d4)\n3 pots of fire (d6 blast, sets the area ablaze)\nTwins who hate each other."
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:1",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 31,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:1:omen:1",
            "ordinal": 1,
            "text": "Разрушающийся аванпост. Группа рабочих обедает в пути к началу работы по\nремонту Стены. Думают, что рыцарей отправили, чтобы остановить их."
          },
          {
            "id": "mb.myth:1:omen:2",
            "ordinal": 2,
            "text": "Две гигантские сороки, крадущие блестящие вещи. Гнездятся в деревьях, укоренившихся среди самых старых камней\nСтены."
          },
          {
            "id": "mb.myth:1:omen:3",
            "ordinal": 3,
            "text": "Одинокая рыцарь Стены, сидящая среди\nколоссальных корней деревьев. Отошла от\nСтены, скучая, в поисках компании."
          },
          {
            "id": "mb.myth:1:omen:4",
            "ordinal": 4,
            "text": "Пара дозорных, застрявших у подножья\nгрязного склона. Ищут бандита, который\nперелез через Стену. Один параноидален,\nест из горшка лунного меда, известного\nсвоей защитой от иллюзий."
          },
          {
            "id": "mb.myth:1:omen:5",
            "ordinal": 5,
            "text": "Пара разъяренных беженцев, направляющихся пробить Стену после того, как их\nвыгнали из дома. Пили масло из колодца\nскрытого гиганта, что дало им ужасную\nсилу. Не доверяют рыцарям."
          },
          {
            "id": "mb.myth:1:omen:6",
            "ordinal": 6,
            "text": "Вдали за стеной виднеется армия. Войско\nнаемников выдвигается, чтобы пробить\nдля них проход."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:1:role:1",
            "title": "Дозорные, Брин, Катрона и Элиш",
            "text": "СИЛ 11, ЯСН 8, ДУХ 7, 4ЗЩ\nБ1 (шлем с забралом)\nСтенной крюк (d8 длин., +d10 против целей ниже)"
          },
          {
            "id": "mb.myth:1:role:2",
            "title": "Рыцарь Стены, Анника",
            "text": "СИЛ 13, ЯСН 10, ДУХ 8, 5ЗЩ\nБ2 (старая кольчуга, шлем)\nДлинный топор (d10 длин.), лишнее любопытство"
          },
          {
            "id": "mb.myth:1:role:3",
            "title": "Гигантская сорока, Искатель серебра",
            "text": "СИЛ 6, ЯСН 14, ДУХ 5, 3ЗЩ\nКлюв и когти (2d6, раненные цели\nослеплены, пока не отдохнут)"
          },
          {
            "id": "mb.myth:1:role:4",
            "title": "Могучие беженцы, Мохан и Орла",
            "text": "СИЛ 18, ЯСН 8, ДУХ 9, 2ЗЩ\nУдары гиганта (2d10)"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:1:omen:1",
            "ordinal": 1,
            "text": "A crumbling outpost. A group of workers eat lunch on their way to begin repairing the Wall. They think the knights have been sent to stop them."
          },
          {
            "id": "mb.myth:1:omen:2",
            "ordinal": 2,
            "text": "Two giant magpies steal shiny things. They nest in trees rooted among the oldest stones of the Wall."
          },
          {
            "id": "mb.myth:1:omen:3",
            "ordinal": 3,
            "text": "A lone Wall Knight sits among colossal tree roots. Bored, she has wandered away from the Wall in search of company."
          },
          {
            "id": "mb.myth:1:omen:4",
            "ordinal": 4,
            "text": "A pair of sentries are stuck at the bottom of a muddy slope. They seek a bandit who climbed over the Wall. One is paranoid and eats from a pot of moon honey, known to protect against illusions."
          },
          {
            "id": "mb.myth:1:omen:5",
            "ordinal": 5,
            "text": "A pair of enraged refugees are on their way to breach the Wall after being driven from their home. They drank oil from the well of a hidden giant, which gave them terrible strength. They distrust knights."
          },
          {
            "id": "mb.myth:1:omen:6",
            "ordinal": 6,
            "text": "An army can be seen far beyond the Wall. A mercenary Warband moves forward to make a breach for them."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:1:role:1",
            "title": "Wall Wardens, Brin, Catrona and Elish",
            "text": "VIG 11, CLA 8, SPI 7, 4GD\nA1 (visored helm)\nWall hook (d8 long, +d10 against targets below)"
          },
          {
            "id": "mb.myth:1:role:2",
            "title": "Wall Knight, Annick",
            "text": "VIG 13, CLA 10, SPI 8, 5GD\nA2 (old mail, helm)\nLongaxe (d10 long), excessive curiosity"
          },
          {
            "id": "mb.myth:1:role:3",
            "title": "Giant Magpie, Silver Seeker",
            "text": "VIG 6, CLA 14, SPI 5, 3GD\nBeak and claws (2d6, Wounded targets are blinded until they rest)"
          },
          {
            "id": "mb.myth:1:role:4",
            "title": "Mighty Refugees, Mohan and Orla",
            "text": "VIG 18, CLA 8, SPI 9, 2GD\nGiant blows (2d10)"
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:2",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 33,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:2:omen:1",
            "ordinal": 1,
            "text": "Огромные плиты в полосах мха. Плачущие ветра. Слезы с небес, деревьев, некоторые образуются на вашей щеке."
          },
          {
            "id": "mb.myth:2:omen:2",
            "ordinal": 2,
            "text": "Изящный колодец, застоявшаяся вода.\nРыцарь Печали, безутешный, нападает\nна любого, кто не выказывает сочувствия."
          },
          {
            "id": "mb.myth:2:omen:3",
            "ordinal": 3,
            "text": "Идеалистичный молодой алхимик собирает слезы плачущих ветров. Пытается вызвать грусть у всех, кого встречает."
          },
          {
            "id": "mb.myth:2:omen:4",
            "ordinal": 4,
            "text": "Странная гнусавая флейта в тряпье. Игра\nна ней вызывает внезапную печаль. Потеряйте d6 ДУХ и узрите сны о Тени."
          },
          {
            "id": "mb.myth:2:omen:5",
            "ordinal": 5,
            "text": "Тень стоит у озера утопленников. Мучает\nстранников видениями скорби прошлого.\nВода шепчет от лица мертвых ответ на\nодин вопрос в сутки. Утром стадо серых\nоленей приходит выразить почтение."
          },
          {
            "id": "mb.myth:2:omen:6",
            "ordinal": 6,
            "text": "Отряд оказывается в мире Тени. Острова\nв тумане времен. Оплакиваемое прошлое\nвидно так же ясно, как настоящее. Здесь\nникто не может умереть, но все, кто покидают это место, теряют d12 ДУХ. Теней\nуспокаивают только проявления скорби."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:2:role:1",
            "title": "Скорбящая тень, останки печали",
            "text": "СИЛ 3, ЯСН 15, ДУХ 17, 2ЗЩ\nОтчаяние-во-плоти (d8 взрыв, раны\nвызывают потерю ДУХ вместо СИЛ)\nРанит ее только оружие, которое выковал\nтот, по ком скорбит носитель. Отталкивается\nземлей с курганов или похоронной\nсимволикой. Уничтожается, если захоронена."
          },
          {
            "id": "mb.myth:2:role:2",
            "title": "Рыцарь Печали, Орван",
            "text": "СИЛ 12, ЯСН 8, ДУХ 6, 2ЗЩ\nБ3 (кольчуга, латы с зеленым плащом, шлем)\nДвуручный меч с крюком (2d10 длинный),\nожерелье из дуба"
          },
          {
            "id": "mb.myth:2:role:3",
            "title": "Бродячий алхимик, Коалин",
            "text": "СИЛ 7, ЯСН 10, ДУХ 11, 1ЗЩ\nКинжал (d6), алхимические инструменты"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:2:omen:1",
            "ordinal": 1,
            "text": "Huge slabs striped with moss. Weeping winds. Tears fall from the sky and trees; some form upon your cheek."
          },
          {
            "id": "mb.myth:2:omen:2",
            "ordinal": 2,
            "text": "An elegant well, stagnant water. A Sorrowful Knight, inconsolable, attacks anyone who shows no sympathy."
          },
          {
            "id": "mb.myth:2:omen:3",
            "ordinal": 3,
            "text": "An idealistic young alchemist gathers tears from the weeping winds. Tries to make everyone they meet feel sad."
          },
          {
            "id": "mb.myth:2:omen:4",
            "ordinal": 4,
            "text": "A strange, nasal flute wrapped in rags. Playing it causes sudden sorrow. Lose d6 SPI and dream of the Shadow."
          },
          {
            "id": "mb.myth:2:omen:5",
            "ordinal": 5,
            "text": "The Shadow stands beside a lake of the drowned. Torments travellers with visions of past grief. The water speaks for the dead, whispering the answer to one question each day. In the morning a herd of grey deer comes to pay its respects."
          },
          {
            "id": "mb.myth:2:omen:6",
            "ordinal": 6,
            "text": "The company finds itself in the world of the Shadow. Islands in the mists of time. The mourned past is as clear as the present. Nobody can die here, but everyone who leaves loses d12 SPI. Only displays of grief can soothe the Shadows."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:2:role:1",
            "title": "Mourning Shadow, Remains of Sorrow",
            "text": "VIG 3, CLA 15, SPI 17, 2GD\nDespair made flesh (d8 blast, Wounds cause SPI loss instead of VIG loss)\nCan only be harmed by a weapon forged by someone its bearer mourns. Repelled by earth from burial mounds or funerary symbols. Destroyed if buried."
          },
          {
            "id": "mb.myth:2:role:2",
            "title": "Sorrowful Knight, Orwan",
            "text": "VIG 12, CLA 8, SPI 6, 2GD\nA3 (mail, plate with a green cloak, helm)\nHooked two-handed sword (2d10 long), oak necklace"
          },
          {
            "id": "mb.myth:2:role:3",
            "title": "Wandering Alchemist, Coalin",
            "text": "VIG 7, CLA 10, SPI 11, 1GD\nDagger (d6), alchemical tools"
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:3",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 35,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:3:omen:1",
            "ordinal": 1,
            "text": "Шесть монахов умиротворяют реку подношениями хлеба. Их лидер раздражающе\nоптимистичен в работе по уходу за рекой."
          },
          {
            "id": "mb.myth:3:omen:2",
            "ordinal": 2,
            "text": "Потерянный рыбак, выброшенный на берег. Могучий тритон обнюхивает потрясенного человека."
          },
          {
            "id": "mb.myth:3:omen:3",
            "ordinal": 3,
            "text": "Скальный выступ с одиноким мертвым деревом на вершине. Три монаха ищут кровавую жертву для Реки. Им нужно невинное животное или грешный человек."
          },
          {
            "id": "mb.myth:3:omen:4",
            "ordinal": 4,
            "text": "Паломники спорят с Рыцарем Моста, требующим плату. Рыцарь знает, что у одного\nиз паломников есть монета из Города, и\nзаберет ее силой, если потребуется."
          },
          {
            "id": "mb.myth:3:omen:5",
            "ordinal": 5,
            "text": "Река прорывается новым потоком. Если\nвы путешествуете, маршрут обрывается. В\nпервые несколько моментов вода из новорожденного потока может исцелить любое\nнедомогание."
          },
          {
            "id": "mb.myth:3:omen:6",
            "ordinal": 6,
            "text": "Великий потоп, где Река рождает новое\nозеро. Он захватывает весь гекс и распространяется на соседние гексы завтра. На\nследующие сутки из нового озера появляется потомство могучих тритонов."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:3:role:1",
            "title": "Могучий тритон, скользкий звездоспин",
            "text": "СИЛ 16, ЯСН 14, ДУХ 5, 5ЗЩ\nДавящий беззубый укус (d8, тянет под воду)\nУбегает при ранении, быстро регенерирует\nи ищет мелкого возмездия.\nЕго боятся все ядовитые твари."
          },
          {
            "id": "mb.myth:3:role:2",
            "title": "Речные монахи, Рефтон во главе",
            "text": "СИЛ 10, ЯСН 10, ДУХ 12, 2ЗЩ\nДубины (d8 тяж.), хлеб, бочки медовухи."
          },
          {
            "id": "mb.myth:3:role:3",
            "title": "Рыцарь Моста, Тог",
            "text": "СИЛ 15, ЯСН 15, ДУХ 6, 6ЗЩ\nБ2 (кольчуга, красный щит)\nМеч-крюк (2d6 тяж.), красный щит (d4),\nтяжелый сундук дорожных налогов."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:3:omen:1",
            "ordinal": 1,
            "text": "Six monks appease the river with offerings of bread. Their leader is irritatingly optimistic about their work tending the river."
          },
          {
            "id": "mb.myth:3:omen:2",
            "ordinal": 2,
            "text": "A lost fisher, washed ashore. A mighty newt sniffs the shaken person."
          },
          {
            "id": "mb.myth:3:omen:3",
            "ordinal": 3,
            "text": "A rocky outcrop with a lone dead tree on top. Three monks seek a blood sacrifice for the River. They need an innocent animal or a sinful human."
          },
          {
            "id": "mb.myth:3:omen:4",
            "ordinal": 4,
            "text": "Pilgrims argue with a Bridge Knight demanding a toll. The knight knows one pilgrim has a coin from the City and will take it by force if necessary."
          },
          {
            "id": "mb.myth:3:omen:5",
            "ordinal": 5,
            "text": "The River breaks into a new stream. If travelling, your route is cut off. During its first few moments, water from the newborn stream can cure any ailment."
          },
          {
            "id": "mb.myth:3:omen:6",
            "ordinal": 6,
            "text": "A great flood as the River births a new lake. It covers the whole hex and spreads to neighbouring hexes tomorrow. The following day, a brood of mighty newts emerges from the new lake."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:3:role:1",
            "title": "Mighty Newt, Slippery Starback",
            "text": "VIG 16, CLA 14, SPI 5, 5GD\nCrushing toothless bite (d8, drags underwater)\nFlees when Wounded, regenerates quickly and seeks petty revenge. Feared by all venomous creatures."
          },
          {
            "id": "mb.myth:3:role:2",
            "title": "River Monks, Led by Refton",
            "text": "VIG 10, CLA 10, SPI 12, 2GD\nClubs (d8 hefty), bread, barrels of mead."
          },
          {
            "id": "mb.myth:3:role:3",
            "title": "Bridge Knight, Tog",
            "text": "VIG 15, CLA 15, SPI 6, 6GD\nA2 (mail, red shield)\nHooked sword (2d6 hefty), red shield (d4), heavy chest of toll money."
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:4",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 37,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:4:omen:1",
            "ordinal": 1,
            "text": "Венценосный олень, ползущий, отравленный. Его рога известны тем, что обжигают\nчешуйчатых зверей."
          },
          {
            "id": "mb.myth:4:omen:2",
            "ordinal": 2,
            "text": "Курган, окруженный низкой каменной\nстеной. Многое из него было выкопано,\nмелкие сокровища разбросаны. Вдалеке\nраздается крик виверны."
          },
          {
            "id": "mb.myth:4:omen:3",
            "ordinal": 3,
            "text": "Раздутое тело отравленного рыцаря,\nвлюбленный оруженосец рыдает рядом."
          },
          {
            "id": "mb.myth:4:omen:4",
            "ordinal": 4,
            "text": "Два гадких яйца, отложены среди\nостанков битвы. Воздух кажется кислым.\nЯдовитые мальцы вылупляются во тьме,\nустраивают пир, а затем разбредаются.\nЗазубренный клинок, закаленный страданиями (2d6), лежит среди трупов."
          },
          {
            "id": "mb.myth:4:omen:5",
            "ordinal": 5,
            "text": "Виверна летит низко, ища мести за\nнеудачную атаку на ее гнездо. Нападавшие уже скрылись. Она держит в когтях\nодин из их серебряных щитов (d6, Б1),\nблагословленный железной ивой."
          },
          {
            "id": "mb.myth:4:omen:6",
            "ordinal": 6,
            "text": "Опасаясь за свое гнездо, виверна приземляется для боя. Если ситуация безнадежна, она улетает в соседнее королевство,\nзамышляя месть."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:4:role:1",
            "title": "Виверна, мерзкая кривая рептилия",
            "text": "СИЛ 17, ЯСН 17, ДУХ 5, 12ЗЩ\nБ2 в полете, Б4 на земле (укрытие от\nкрыльев) Укус и бросок (3d10, медленное\nна земле) или жало (d10, рана вызывает\nвздутие и смерть в течение часа, если не\nпромыть свежим молоком)\nОтвращение к звуку детского плача.\nБыстрая, но неуклюжая летунья."
          },
          {
            "id": "mb.myth:4:role:2",
            "title": "Ее ядовитые мальцы",
            "text": "СИЛ 5, ЯСН 10, ДУХ 2, 3ЗЩ\nБ1 (холодная шкура)\nТрепыхание (d8, несет яд матери)"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:4:omen:1",
            "ordinal": 1,
            "text": "A crowned stag crawls, poisoned. Its antlers are known to burn scaly beasts."
          },
          {
            "id": "mb.myth:4:omen:2",
            "ordinal": 2,
            "text": "A barrow surrounded by a low stone wall. Much has been dug out of it, with small treasures scattered around. A wyvern cries in the distance."
          },
          {
            "id": "mb.myth:4:omen:3",
            "ordinal": 3,
            "text": "The bloated body of a poisoned knight, with a lovestruck squire weeping beside it."
          },
          {
            "id": "mb.myth:4:omen:4",
            "ordinal": 4,
            "text": "Two foul eggs laid among the remains of a battle. The air seems sour. Venomous young hatch in darkness, feast, then scatter. A serrated blade tempered in suffering (2d6) lies among the corpses."
          },
          {
            "id": "mb.myth:4:omen:5",
            "ordinal": 5,
            "text": "The Wyvern flies low, seeking revenge for a failed attack on her nest. The attackers have already escaped. In her claws she carries one of their silver shields (d6, A1), blessed by an iron willow."
          },
          {
            "id": "mb.myth:4:omen:6",
            "ordinal": 6,
            "text": "Fearing for her nest, the Wyvern lands to fight. If the situation is hopeless, she flies to a neighbouring Realm, plotting revenge."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:4:role:1",
            "title": "Wyvern, Foul Crooked Reptile",
            "text": "VIG 17, CLA 17, SPI 5, 12GD\nA2 in flight, A4 on the ground (sheltering wings)\nBite and toss (3d10, slow on the ground) or sting (d10, a Wound causes swelling and death within an hour unless washed with fresh milk)\nRepulsed by the sound of a child crying. A fast but clumsy flier."
          },
          {
            "id": "mb.myth:4:role:2",
            "title": "Her Venomous Young",
            "text": "VIG 5, CLA 10, SPI 2, 3GD\nA1 (cold hide)\nThrashing (d8, carries their mother's venom)"
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:5",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 39,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:5:omen:1",
            "ordinal": 1,
            "text": "Плачущий охотник, проклинающий всех.\nИщет своего пса, который ухаживал за\nним после ранения."
          },
          {
            "id": "mb.myth:5:omen:2",
            "ordinal": 2,
            "text": "Потерявшийся мальчик, рассказывающий\nистории. Утверждает, что маленький\nстарик позвал его в лес"
          },
          {
            "id": "mb.myth:5:omen:3",
            "ordinal": 3,
            "text": "Давящие ветви, корни, за которые легко\nспоткнуться. Закутанный старик зовет на\nпомощь. Если его окликнуть, он кричит\nперед тем, как его утаскивают под землю,\nунося в царство потерянных."
          },
          {
            "id": "mb.myth:5:omen:4",
            "ordinal": 4,
            "text": "Потерянные питомцы на воле. Если их\nзаметить, они сразу бегут обратно к тайной\nдвери в царство потерянных. Один из них\nроняет странную металлическую кость,\nотпугивающую птиц."
          },
          {
            "id": "mb.myth:5:omen:5",
            "ordinal": 5,
            "text": "Темная поляна. Любые сделки,\nзаключенные здесь, связаны судьбой.\nГоблин предлагает обмен. Ценная\nпотерянная вещь в обмен на услугу,\nкоторую он может потребовать позже."
          },
          {
            "id": "mb.myth:5:omen:6",
            "ordinal": 6,
            "text": "Внезапно вас утаскивают в царство\nпотерянных вещей. Тоннели под грудами\nхлама. Гоблин злорадствует с вершины\nсвоей кучи. Свобода даруется только за\nуслугу, которую Гоблин будет требовать."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:5:role:1",
            "title": "Его Хитрейшество, Гоблин Повелитель всех потерянных вещей",
            "text": "СИЛ 7, ЯСН 16, ДУХ 15, 9ЗЩ\nКостяная игла (d6 +d10 по любому в долгу\nперед носителем), мешок любимых\nпотерянных вещей.\nМожет пострадать только от от предметов,\nпотерянных на девяносто лет или более.\nВладеет подвигом Фокус."
          },
          {
            "id": "mb.myth:5:role:2",
            "title": "Потерянные питомцы",
            "text": "СИЛ 5, ЯСН 10, ДУХ 5, 2ЗЩ\nЛай, укусы и царапанье (d6)"
          },
          {
            "id": "mb.myth:5:role:3",
            "title": "Потерявшийся мальчик, Рос",
            "text": "СИЛ 7, ЯСН 9, ДУХ 9, 3ЗЩ\nУчебный лук (d4, длинный)"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:5:omen:1",
            "ordinal": 1,
            "text": "A weeping hunter curses everyone. Seeks his dog, which cared for him after an injury."
          },
          {
            "id": "mb.myth:5:omen:2",
            "ordinal": 2,
            "text": "A lost boy tells stories. Claims a little old man called him into the woods."
          },
          {
            "id": "mb.myth:5:omen:3",
            "ordinal": 3,
            "text": "Oppressive branches and roots that trip you. A cloaked old man calls for help. If called to, he screams just before being dragged underground into the realm of the lost."
          },
          {
            "id": "mb.myth:5:omen:4",
            "ordinal": 4,
            "text": "Lost pets run wild. If spotted, they immediately run back towards a secret door into the realm of the lost. One drops a strange metal bone that repels birds."
          },
          {
            "id": "mb.myth:5:omen:5",
            "ordinal": 5,
            "text": "A dark clearing. Any bargains made here are bound by fate. The Goblin offers a trade: a valuable lost thing in exchange for a favour he can demand later."
          },
          {
            "id": "mb.myth:5:omen:6",
            "ordinal": 6,
            "text": "You are suddenly dragged into the realm of lost things. Tunnels beneath piles of junk. The Goblin gloats from the top of his heap. Freedom is granted only in return for a favour the Goblin will demand."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:5:role:1",
            "title": "Their Cleverness, the Goblin Lord of All Lost Things",
            "text": "VIG 7, CLA 16, SPI 15, 9GD\nBone needle (d6 +d10 against anyone indebted to the bearer), sack of favourite lost things.\nCan only be harmed by objects lost for ninety-nine years or more. Can Focus."
          },
          {
            "id": "mb.myth:5:role:2",
            "title": "Lost Pets",
            "text": "VIG 5, CLA 10, SPI 5, 2GD\nBarking, biting and scratching (d6)"
          },
          {
            "id": "mb.myth:5:role:3",
            "title": "Lost Lad, Roth",
            "text": "VIG 7, CLA 9, SPI 9, 3GD\nPractice bow (d4 long)"
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:6",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 41,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:6:omen:1",
            "ordinal": 1,
            "text": "Провидица, любимая селом, заточена,\nнеподвижна в железном дереве. Только\nСтрахолюд может разрушить эти узы."
          },
          {
            "id": "mb.myth:6:omen:2",
            "ordinal": 2,
            "text": "Извилистая тропа под певчими птицами.\nОни поют так яростно, что некоторые\nпадают без дыхания на землю. Тропа\nведет к дальнему лесному гексу."
          },
          {
            "id": "mb.myth:6:omen:3",
            "ordinal": 3,
            "text": "Материнское дерево. Шесть лесных\nстражей атакуют любого, кто на него\nпосмотрит. Лисы, волки и дикие кошки\nсражаются, как одно целое."
          },
          {
            "id": "mb.myth:6:omen:4",
            "ordinal": 4,
            "text": "Страхолюд в ужасной форме, смесь совы,\nкабана и мыши. Таится в тумане, бросает\nшиповое копье (d10, тяжелое, нельзя\nвынести из Леса) перед тем, как отступить\nна ветви."
          },
          {
            "id": "mb.myth:6:omen:5",
            "ordinal": 5,
            "text": "Круг почерневших пней. Внутри\nметаллическое оружие раскаляется, если\nего не бросить. Затем появляются три\nвеликих стража: олень, кабан и медведь.\nСтрахолюд охотится из тумана."
          },
          {
            "id": "mb.myth:6:omen:6",
            "ordinal": 6,
            "text": "Страхолюд показывает свою истинную,\nужасную форму живого, извивающегося\nдерева. Если его не усмирить, Лес\nпрорвется в остальную часть Королевства."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:6:role:1",
            "title": "Страхолюд в Лесу, Глейберн",
            "text": "СИЛ 17, ЯСН 16, ДУХ 12, 8ЗЩ\nБ2, Б4 против кованого оружия (рунное дерево)\nРубящий удар (d10 против двух целей), захват\n(2d10, медленный) или споры (все в радиусе\nВзрыва теряют дар речи, пока не покинут Лес)\nМожет Карать людей."
          },
          {
            "id": "mb.myth:6:role:2",
            "title": "Лесные стражи, Лиса, Волк и Кошка",
            "text": "СИЛ 10, ЯСН 13, ДУХ 5, 3ЗЩ\nКлыки и когти (2d6)"
          },
          {
            "id": "mb.myth:6:role:3",
            "title": "Великие стражи, Олень, Кабан и Медведь",
            "text": "СИЛ 14, ЯСН 10, ДУХ 5, 5ЗЩ\nБ1 (толстые шкуры)\nЗубы и копыта (2d8)"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:6:omen:1",
            "ordinal": 1,
            "text": "A Seer beloved by the village is imprisoned, motionless, in an iron tree. Only the Fearmonger can break these bonds."
          },
          {
            "id": "mb.myth:6:omen:2",
            "ordinal": 2,
            "text": "A winding trail beneath songbirds. They sing so fiercely that some fall breathless to the ground. The trail leads to a distant forest hex."
          },
          {
            "id": "mb.myth:6:omen:3",
            "ordinal": 3,
            "text": "A mother tree. Six woodland guardians attack anyone who looks at it. Foxes, wolves and wildcats fight as one."
          },
          {
            "id": "mb.myth:6:omen:4",
            "ordinal": 4,
            "text": "The Fearmonger in a terrible shape, a mixture of owl, boar and mouse. Lurks in the mist and throws a thorn spear (d10 hefty, cannot be taken out of the Forest), then retreats into the branches."
          },
          {
            "id": "mb.myth:6:omen:5",
            "ordinal": 5,
            "text": "A circle of blackened stumps. Metal weapons carried inside grow searing hot unless dropped. Then three great guardians appear: a stag, boar and bear. The Fearmonger hunts from the mist."
          },
          {
            "id": "mb.myth:6:omen:6",
            "ordinal": 6,
            "text": "The Fearmonger reveals its true, terrible form: a living, writhing tree. Unless it is subdued, the Forest will break out into the rest of the Realm."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:6:role:1",
            "title": "Fearmonger in the Forest, Glaiburn",
            "text": "VIG 17, CLA 16, SPI 12, 8GD\nA2, A4 against forged weapons (runic wood)\nSlashing blow (d10 against two targets), grab (2d10 slow) or spores (everyone within a blast loses the power of speech until they leave the Forest)\nCan Smite humans."
          },
          {
            "id": "mb.myth:6:role:2",
            "title": "Woodland Guardians, Fox, Wolf and Cat",
            "text": "VIG 10, CLA 13, SPI 5, 3GD\nFangs and claws (2d6)"
          },
          {
            "id": "mb.myth:6:role:3",
            "title": "Great Guardians, Stag, Boar and Bear",
            "text": "VIG 14, CLA 10, SPI 5, 5GD\nA1 (thick hides)\nTeeth and hooves (2d8)"
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:7",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 43,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:7:omen:1",
            "ordinal": 1,
            "text": "Пьяные поклонники Дитя ликуют, что первое знамение явилось. Не доверяют тем, кто\nне ликует с ними."
          },
          {
            "id": "mb.myth:7:omen:2",
            "ordinal": 2,
            "text": "Три Рыцаря-Искателя и их волк-краснозуб\nсопровождают провидца в охоте на Дитя,\nкоторого они считают ключом к Городу."
          },
          {
            "id": "mb.myth:7:omen:3",
            "ordinal": 3,
            "text": "Окутанное туманом озеро, глубиной не более фута по всей поверхности. Мятежный\nРыцарь-Искатель в поисках Дитя, которого,\nкак он верит, нужно принести в жертву\nужасному существу, чтобы навсегда его\nуспокоить. Вы либо с ним, либо против него."
          },
          {
            "id": "mb.myth:7:omen:4",
            "ordinal": 4,
            "text": "Заброшенная лачуга, пустая колыбель. Погремушка из змеиного клыка, которая отгоняет нежить. Вдали кричит Горящая мать.\nЛюбой, кто на нее взглянет, будет атакован\nна месте."
          },
          {
            "id": "mb.myth:7:omen:5",
            "ordinal": 5,
            "text": "Серебристый водопад. Металл, помещенный в него, восстанавливается. Вдалеке\nраздаются радостные крики и плач, когда\nвторое знамение вступает в силу."
          },
          {
            "id": "mb.myth:7:omen:6",
            "ordinal": 6,
            "text": "Наконец оно здесь. Колыбель из тумана,\nвнутри Дитя. d6 Рыцарей-Искателей пришли убить его"
          }
        ],
        "roles": [
          {
            "id": "mb.myth:7:role:1",
            "title": "Обещанное Дитя",
            "text": "СИЛ 2, ЯСН 2, ДУХ 18, 1ЗЩ\nЛюди не способны намеренно навредить ему."
          },
          {
            "id": "mb.myth:7:role:2",
            "title": "Рыцари-Искатели, Фелиз, Горниг и Тейли",
            "text": "СИЛ 14, ЯСН 12, ДУХ 12, 5ЗЩ\nБ3 (полущит, кольчуга, шлем)\nБулава (d8 тяжелая), полущит (d4)"
          },
          {
            "id": "mb.myth:7:role:3",
            "title": "Волк-краснозуб, серый лекарь, Зубошрам",
            "text": "СИЛ 14, ЯСН 10, ДУХ 5, 5ЗЩ\nБ1 (свалявшаяся шерсть)\nПодкрасться и укусить (2d8)\nМожет выкусить рану, восстанавливая d6 СИЛ"
          },
          {
            "id": "mb.myth:7:role:4",
            "title": "Горящая мать",
            "text": "СИЛ 10, ЯСН 16, ДУХ 17, 7ЗЩ\nТело в огне (игнорирует металл и дерево)\nОгонь (d8 взрыв) или захват (3d8, медленный)"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:7:omen:1",
            "ordinal": 1,
            "text": "Drunken devotees of the Child rejoice that the first omen has appeared. They distrust anyone who does not rejoice with them."
          },
          {
            "id": "mb.myth:7:omen:2",
            "ordinal": 2,
            "text": "Three Seeker Knights and their redmaw wolf escort a Seer in the hunt for the Child, which they believe is the key to the City."
          },
          {
            "id": "mb.myth:7:omen:3",
            "ordinal": 3,
            "text": "A mist-shrouded lake, no more than a foot deep throughout. A rebellious Seeker Knight seeks the Child, which he believes must be sacrificed to a terrible being to appease it forever. You are either with him or against him."
          },
          {
            "id": "mb.myth:7:omen:4",
            "ordinal": 4,
            "text": "An abandoned shack, an empty cradle. A snake-fang rattle that repels the undead. The Burning Mother screams in the distance. Anyone who looks at her is attacked on the spot."
          },
          {
            "id": "mb.myth:7:omen:5",
            "ordinal": 5,
            "text": "A silver waterfall. Metal placed in it is restored. In the distance, joyful cries and weeping can be heard as the second omen takes effect."
          },
          {
            "id": "mb.myth:7:omen:6",
            "ordinal": 6,
            "text": "At last it is here. A cradle of mist, with the Child inside. d6 Seeker Knights have come to kill it. A second group of d6 Seeker Knights seeks to protect the Child and bring it to their own Realm."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:7:role:1",
            "title": "The Promised Child",
            "text": "VIG 2, CLA 2, SPI 18, 1GD\nHumans are unable to harm it deliberately."
          },
          {
            "id": "mb.myth:7:role:2",
            "title": "Seeker Knights, Feliz, Gornig and Tayley",
            "text": "VIG 14, CLA 12, SPI 12, 5GD\nA3 (half-shield, mail, helm)\nMorningstar (d8 hefty), half-shield (d4)"
          },
          {
            "id": "mb.myth:7:role:3",
            "title": "Redmaw Wolf, Greymender, Scartooth",
            "text": "VIG 14, CLA 10, SPI 5, 5GD\nA1 (matted fur)\nStalk and bite (2d8)\nCan bite out a Wound, restoring d6 VIG."
          },
          {
            "id": "mb.myth:7:role:4",
            "title": "The Burning Mother",
            "text": "VIG 10, CLA 16, SPI 17, 7GD\nBurning body (ignores metal and wood)\nFire (d8 blast) or grab (3d8 slow)"
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:8",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 45,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:8:omen:1",
            "ordinal": 1,
            "text": "Кузница, вырезанная в скале. Кузнецы\nжалуются на агрессию Ордена. Они\nжаждут справедливости."
          },
          {
            "id": "mb.myth:8:omen:2",
            "ordinal": 2,
            "text": "Отряд Ордена изымает припасы у\nфермеров. Испуганная тягловая лошадь\nв панике убегает. Пена из ее рта\nвызывает ярость при соприкосновении.\nВот-вот начнется драка."
          },
          {
            "id": "mb.myth:8:omen:3",
            "ordinal": 3,
            "text": "Сухая поляна среди болотистого ивового\nлеса. Орден собрался на совет, стоя в\nкруге. Каждый должен оправдать себя\nперед своими собратьями, которые могут\nоспорить любую слабость. Зрители не\nдопускаются."
          },
          {
            "id": "mb.myth:8:omen:4",
            "ordinal": 4,
            "text": "Они перевозят вора. Вор знает место\nзахоронения серебряного латного\nдоспеха (Б1, иммунитет к оружию из\nдешевого металла) и раскроет его, если\nего освободят."
          },
          {
            "id": "mb.myth:8:omen:5",
            "ordinal": 5,
            "text": "Отряд Ордена идет по следу чудовища.\nВы у них на пути."
          },
          {
            "id": "mb.myth:8:omen:6",
            "ordinal": 6,
            "text": "Отряд идет в атаку на ближайший Удел.\nУ них есть 3 Войска и свита. Они либо\nввергнут Королевство в беспорядок,\nлибо будут изгнаны за его пределы."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:8:role:1",
            "title": "Ученый-рыцарь Ордена",
            "text": "СИЛ 16, ЯСН 16, ДУХ 8, 9ЗЩ\nБ4 (кольчуга, латы, шлем, щит)\nШирокий меч (2d6 тяжелый), щит (d4)\nУдарный конь (4ЗЩ, Б1, d10 копытами)"
          },
          {
            "id": "mb.myth:8:role:2",
            "title": "Испуганная тягловая лошадь",
            "text": "СИЛ 15, ЯСН 6, ДУХ 2, 2ЗЩ\nПинок (d6)\nНе может быть успокоена кем-то с\nоружием в руках."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:8:omen:1",
            "ordinal": 1,
            "text": "A forge carved into rock. Smiths complain about the Order's aggression. They crave justice."
          },
          {
            "id": "mb.myth:8:omen:2",
            "ordinal": 2,
            "text": "A company of the Order seizes supplies from farmers. A frightened draft horse bolts in panic. Contact with the foam from its mouth causes fury. A fight is about to break out."
          },
          {
            "id": "mb.myth:8:omen:3",
            "ordinal": 3,
            "text": "A dry clearing amid boggy willow woods. The Order holds a council, standing in a circle. Each must justify themselves before their fellows, who can challenge any weakness. Spectators are not allowed."
          },
          {
            "id": "mb.myth:8:omen:4",
            "ordinal": 4,
            "text": "They are transporting a thief. The thief knows the burial place of silver plate armour (A1, immunity to weapons made of inferior metal) and will reveal it if freed."
          },
          {
            "id": "mb.myth:8:omen:5",
            "ordinal": 5,
            "text": "A company of the Order tracks a monster. You are in their way."
          },
          {
            "id": "mb.myth:8:omen:6",
            "ordinal": 6,
            "text": "A company attacks the nearest Holding. They have 3 Warbands and a retinue. They will either plunge the Realm into disorder or be driven beyond its borders."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:8:role:1",
            "title": "Scholar-Knight of the Order",
            "text": "VIG 16, CLA 16, SPI 8, 9GD\nA4 (mail, plate, towerhelm, shield)\nThicksword (2d6 hefty), shield (d4)\nCrusher steed (4GD, A1, d10 trample)"
          },
          {
            "id": "mb.myth:8:role:2",
            "title": "Frightened Draft Horse",
            "text": "VIG 15, CLA 6, SPI 2, 2GD\nKick (d6)\nCannot be calmed by anyone holding a weapon."
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:9",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 47,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:9:omen:1",
            "ordinal": 1,
            "text": "Дети «играют в скелетов», надевая деревянные маски черепов и бросая кости в\nпрохожих."
          },
          {
            "id": "mb.myth:9:omen:2",
            "ordinal": 2,
            "text": "Испуганные сестры-разведчицы докладывают о блуждающих трупах на их патруле. Не\nуспокоятся, пока их не примут всерьез."
          },
          {
            "id": "mb.myth:9:omen:3",
            "ordinal": 3,
            "text": "По приказу провидца кладбище сжигается в\nкачестве предосторожности против живых\nмертвецов. Послушники разбрасывают сушеные травы. Пять огромных красных стервятников кружат в небе."
          },
          {
            "id": "mb.myth:9:omen:4",
            "ordinal": 4,
            "text": "Гниющий труп, подражающий своей жизни\nв роли собирателя ягод. Он привязан к соседнему дереву стальной веревкой невозможной\nконструкции."
          },
          {
            "id": "mb.myth:9:omen:5",
            "ordinal": 5,
            "text": "Пять скелетов, насмешливых костей, движимые ненавистью к живым, мучают беззащитных путешественников. Эти путешественники — мастера, известные своей способностью\nделать отличное оружие из определенных\nпород дерева."
          },
          {
            "id": "mb.myth:9:omen:6",
            "ordinal": 6,
            "text": "Три Войска гниющих трупов и насмешливых\nкостей поднимаются под черным знаменем\nи маршируют на ближайший Удел."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:9:role:1",
            "title": "Гниющий труп, лишенный покоя",
            "text": "СИЛ 10, ЯСН 2, ДУХ 1, 1ЗЩ\nБ1 (побитая кольчуга)\nРжавая глефа (d10 медленное)\nСражается даже после Смертельной раны.\nТекущая вода наносит d12 урона."
          },
          {
            "id": "mb.myth:9:role:2",
            "title": "Насмешливые кости, призваны служить",
            "text": "СИЛ 6, ЯСН 10, ДУХ 1, 3ЗЩ\nБ1 (щит из латуни), Ослабляет колющие атаки\nКривой фалькс (d6), щит из латуни (d4)\nТекущая вода наносит d12 урона."
          },
          {
            "id": "mb.myth:9:role:3",
            "title": "Красный стервятник, седая птица",
            "text": "СИЛ 15, ЯСН 6, ДУХ 5, 3ЗЩ\nРвать и метать (d8)\nСожженные и перетертые перья делают\nвредителей послушными.\nБесшумен в свете луны."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:9:omen:1",
            "ordinal": 1,
            "text": "Children \"play skeletons\", wearing wooden skull masks and throwing bones at passers-by."
          },
          {
            "id": "mb.myth:9:omen:2",
            "ordinal": 2,
            "text": "Frightened scout sisters report corpses wandering along their patrol route. They will not calm down until taken seriously."
          },
          {
            "id": "mb.myth:9:omen:3",
            "ordinal": 3,
            "text": "On a Seer's orders, a graveyard is being burned as a precaution against the living dead. Acolytes scatter dried herbs. Five huge red vultures circle overhead."
          },
          {
            "id": "mb.myth:9:omen:4",
            "ordinal": 4,
            "text": "A rotting corpse imitates its life as a berry picker. It is tethered to a nearby tree by a steel rope of impossible construction."
          },
          {
            "id": "mb.myth:9:omen:5",
            "ordinal": 5,
            "text": "Five skeletons, mocking bones driven by hatred of the living, torment defenceless travellers. These travellers are craftspeople renowned for making excellent weapons from particular types of wood."
          },
          {
            "id": "mb.myth:9:omen:6",
            "ordinal": 6,
            "text": "Three Warbands of rotting corpses and mocking bones rise beneath a black banner and march towards the nearest Holding."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:9:role:1",
            "title": "Rotting Corpse, Denied Rest",
            "text": "VIG 10, CLA 2, SPI 1, 1GD\nA1 (battered mail)\nRusty glaive (d10 slow)\nFights on even after a Mortal Wound. Running water causes d12 damage."
          },
          {
            "id": "mb.myth:9:role:2",
            "title": "Mocking Bones, Summoned to Serve",
            "text": "VIG 6, CLA 10, SPI 1, 3GD\nA1 (brass shield), piercing attacks are Impaired\nCurved falx (d6), brass shield (d4)\nRunning water causes d12 damage."
          },
          {
            "id": "mb.myth:9:role:3",
            "title": "Great Red Vulture, Grizzlebird",
            "text": "VIG 15, CLA 6, SPI 5, 3GD\nRend and tear (d8)\nBurned and ground feathers make vermin docile. Silent in moonlight."
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:10",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 49,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:10:omen:1",
            "ordinal": 1,
            "text": "Огромная каменная арка, бывший храм.\nЗвезды мерцают в тенях. Белые вороны\nкаркают с деревьев. В арке появляется\nпроход, темный и светлый одновременно.\nЗатем все снова становится обычным."
          },
          {
            "id": "mb.myth:10:omen:2",
            "ordinal": 2,
            "text": "Заблудшая Рыцарь из далеких земель.\nГоворит, что упала через тень. За ней идет\nЗакутанный проводник и требует оплату."
          },
          {
            "id": "mb.myth:10:omen:3",
            "ordinal": 3,
            "text": "Узкая пещера, звон стали. Кузнец в плаще\nкует холодный меч (2d8 тяжелый, игнорирует металлическую броню). Раскалывается, если обнажить его при дневном свете."
          },
          {
            "id": "mb.myth:10:omen:4",
            "ordinal": 4,
            "text": "Тяжелая черная ткань с нитями индиго.\nЕсли ее повесить, открывает проход туда,\nкуда вы хотите попасть. Внутри дюжина\nрук в темноте требуют плату серебром или\nкровью. Заберут силой, если потребуется."
          },
          {
            "id": "mb.myth:10:omen:5",
            "ordinal": 5,
            "text": "Широкие деревья с лиловыми листьями.\nИскусственный свет не светит под ними.\nПять Закутанных проводников пытаются\nвзять плату."
          },
          {
            "id": "mb.myth:10:omen:6",
            "ordinal": 6,
            "text": "Тьма надвигается, а затем внезапно вы\nоказываетесь в Подземном мире. Темное\nотражение нашего мира. Без Закутанного\nпроводника единственный выход ведет в\nдалекое Королевство."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:10:role:1",
            "title": "Закутанные проводники, Капюшоны",
            "text": "СИЛ 5, ЯСН 18, ДУХ 15, 4ЗЩ\nХолодный меч (2d6 тяж., игнорирует металл.\nброню), бледная лампа (2d8 взрыв при броске)\nЕсли погибает, двое новых выходят из тени."
          },
          {
            "id": "mb.myth:10:role:2",
            "title": "Хваткие руки из тьмы",
            "text": "СИЛ 10, ЯСН 10, ДУХ 2, 1ЗЩ\nХолодная хватка (d6, при Ране потеряйте d8 ДУХ)"
          },
          {
            "id": "mb.myth:10:role:3",
            "title": "Заблудшая Рыцарь, Валента",
            "text": "СИЛ 13, ЯСН 10, ДУХ 10, 5ЗЩ\nБ3 (кольчуга, шлем, щи)\nЗазубренный меч (2d8 тяжелый), символ веры"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:10:omen:1",
            "ordinal": 1,
            "text": "A huge stone arch, once a temple. Stars glimmer in the shadows. White ravens caw from the trees. A passage appears within the arch, dark and light at once. Then everything returns to normal."
          },
          {
            "id": "mb.myth:10:omen:2",
            "ordinal": 2,
            "text": "A lost Knight from distant lands. Says she fell through a shadow. A Shrouded Guide follows her, demanding payment."
          },
          {
            "id": "mb.myth:10:omen:3",
            "ordinal": 3,
            "text": "A narrow cave, the ring of steel. A cloaked smith forges a cold sword (2d8 hefty, ignores metal armour). It shatters if drawn in daylight."
          },
          {
            "id": "mb.myth:10:omen:4",
            "ordinal": 4,
            "text": "Heavy black cloth threaded with indigo. Hanging it opens a passage to wherever you wish to go. Inside, a dozen hands in the darkness demand payment in silver or blood. They will take it by force if necessary."
          },
          {
            "id": "mb.myth:10:omen:5",
            "ordinal": 5,
            "text": "Broad trees with purple leaves. Artificial light does not shine beneath them. Five Shrouded Guides try to collect a toll."
          },
          {
            "id": "mb.myth:10:omen:6",
            "ordinal": 6,
            "text": "Darkness closes in, then suddenly you are in the Underworld. A dark reflection of our world. Without a Shrouded Guide, the only way out leads to a distant Realm."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:10:role:1",
            "title": "Shrouded Guides, Hooded Ones",
            "text": "VIG 5, CLA 18, SPI 15, 4GD\nCold sword (2d6 hefty, ignores metal armour), pale lamp (2d8 blast when thrown)\nIf one dies, two more emerge from the shadows."
          },
          {
            "id": "mb.myth:10:role:2",
            "title": "Grasping Hands from the Dark",
            "text": "VIG 10, CLA 10, SPI 2, 1GD\nCold grip (d6, a Wound causes the loss of d8 SPI)"
          },
          {
            "id": "mb.myth:10:role:3",
            "title": "Lost Knight, Valenta",
            "text": "VIG 13, CLA 10, SPI 10, 5GD\nA3 (mail, helm, shield)\nSerrated sword (2d8 hefty), shield (d4), locket"
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:11",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 51,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:11:omen:1",
            "ordinal": 1,
            "text": "Сборщица пиявок плачет. В болоте\nнеподалеку огромное существо укусом\nутащило ее сестру. Звук хруста костей\nпреследует ее."
          },
          {
            "id": "mb.myth:11:omen:2",
            "ordinal": 2,
            "text": "Сварливый мудрец жалуется. Баланс\nприроды нарушен. Птицы ведут себя\nнеправильно, а в лесах недостает добычи."
          },
          {
            "id": "mb.myth:11:omen:3",
            "ordinal": 3,
            "text": "Разрушенный лагерь лесорубов. Бочки с\nиван-чаем, пахучим средством от\nаппетита, остались нетронутыми.\nЩитоносец Червя с пустой гордостью\nосматривает работу своего хозяина."
          },
          {
            "id": "mb.myth:11:omen:4",
            "ordinal": 4,
            "text": "Вонючее серое соленое болото. На ветру\nслышится скрипучий смех, пока Червь\nспит внизу, мечтая о новом пиршестве.\nДва щитоносца Червя несут стражу,\nспоря о том, кто из них более предан."
          },
          {
            "id": "mb.myth:11:omen:5",
            "ordinal": 5,
            "text": "Червь лежит на разрушенных могильных\nкурганах провидцев. Он говорит с\nчетырьмя его щитоносцами, преданными,\nно скучными собеседниками."
          },
          {
            "id": "mb.myth:11:omen:6",
            "ordinal": 6,
            "text": "Червь вырывается из-под земли, давая\nодну возможность для оживленной\nбеседы перед началом своего великого\nпира. Он не остановится, пока не\nраздуется или умрет."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:11:role:1",
            "title": "Червь, колоссальный обжора",
            "text": "СИЛ 18, ЯСН 8, ДУХ 5, 10ЗЩ\nБ3 (грубая шкура)\nИзвивается (d10 взрыв), жует (3d10\nмедленный) или окатывает обломками (d8\nвзрыв)"
          },
          {
            "id": "mb.myth:11:role:2",
            "title": "Щитоносцы Червя, Кермак, Кадо, Зун, Шина, Марло, Язакель",
            "text": "СИЛ 10, ЯСН 12, ДУХ 8, 2ЗЩ\nБ2 (шлем, красный полущит)\nШипастая булава (d8 тяжелая), красный\nполущит (d4)\nОтвратительные личности, всегда\nстараются стать еще хуже, подражая\nЧервю."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:11:omen:1",
            "ordinal": 1,
            "text": "A leech collector weeps. In a nearby bog, a huge creature bit her sister and dragged her away. The sound of crunching bones haunts her."
          },
          {
            "id": "mb.myth:11:omen:2",
            "ordinal": 2,
            "text": "A cantankerous sage complains. The balance of nature has been disrupted. Birds behave wrongly and the woods lack prey."
          },
          {
            "id": "mb.myth:11:omen:3",
            "ordinal": 3,
            "text": "A wrecked logging camp. Barrels of limeweed, a pungent appetite suppressant, remain untouched. A Wurmshield surveys his master's work with empty pride."
          },
          {
            "id": "mb.myth:11:omen:4",
            "ordinal": 4,
            "text": "A stinking grey salt marsh. Creaking laughter drifts on the wind while the Wurm sleeps beneath, dreaming of another feast. Two Wurmshields stand guard, arguing about which of them is more devoted."
          },
          {
            "id": "mb.myth:11:omen:5",
            "ordinal": 5,
            "text": "The Wurm lies upon ruined Seer barrows. He speaks with four of his Wurmshields, devoted but dull conversationalists."
          },
          {
            "id": "mb.myth:11:omen:6",
            "ordinal": 6,
            "text": "The Wurm bursts from beneath the ground, offering one chance for lively conversation before beginning his great feast. He will not stop until bloated or dead."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:11:role:1",
            "title": "The Wurm, Colossal Glutton",
            "text": "VIG 18, CLA 8, SPI 5, 10GD\nA3 (rough hide)\nThrash (d10 blast), chew (3d10 slow) or spray debris (d8 blast)"
          },
          {
            "id": "mb.myth:11:role:2",
            "title": "Wurmshields, Kermac, Cado, Zune, Shena, Marlo, Yazakel",
            "text": "VIG 10, CLA 12, SPI 8, 2GD\nA2 (helm, red half-shield)\nSpiked mace (d8 hefty), red half-shield (d4)\nRepulsive people, always trying to become worse in imitation of the Wurm."
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:12",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 53,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:12:omen:1",
            "ordinal": 1,
            "text": "Плачущий пастух. Его овчарки забили стадо\nи сбежали. Вороны пируют на останках. Его\nсемья голодает."
          },
          {
            "id": "mb.myth:12:omen:2",
            "ordinal": 2,
            "text": "Группа поэтов и писцов сражается друг с\nдругом, не в состоянии говорить, кроме как\nрыком. Стая наблюдает с холма, разбегаясь,\nесли их потревожить. Когда они уходят,\nголоса странников возвращаются."
          },
          {
            "id": "mb.myth:12:omen:3",
            "ordinal": 3,
            "text": "Претендент сражается с лидером. Шесть\nволков охраняют бой, не допуская вмешательства. Поддерживают претендента.\nЛидер забавляется с ним, а затем разрывает\nему горло, когда начинает скучать."
          },
          {
            "id": "mb.myth:12:omen:4",
            "ordinal": 4,
            "text": "Ветер замирает и раздается клацанье челюстей. Слышен вой, грубый, пронзительный. Бессчетные завывания присоединяются к зову в штиле. Вскоре вой обрывается, а ветер возвращается."
          },
          {
            "id": "mb.myth:12:omen:5",
            "ordinal": 5,
            "text": "Важная торговая дорога заблокирована\nгрубо вырванными деревьями и кучами\nземли, пропитанными кровью."
          },
          {
            "id": "mb.myth:12:omen:6",
            "ordinal": 6,
            "text": "Стая из 13 волков воет в логове, нацеливаясь\nна ближайшее Жилище или Удел, нападая\nна людей и их животных в темноте или\nтумане."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:12:role:1",
            "title": "Лидер стаи, Одноухий",
            "text": "СИЛ 15, ЯСН 15, ДУХ 7, 8ЗЩ\nБ1 (шкура в шрамах)\nОгромная челюсть(2d8), не терпит приличий"
          },
          {
            "id": "mb.myth:12:role:2",
            "title": "Стайные волки, Грива, Шкура, Корка, Мелкий",
            "text": "СИЛ 10, ЯСН 12, ДУХ 3, 4ЗЩ\nЧелюсти (d8), любовь-ненависть к лидеру"
          },
          {
            "id": "mb.myth:12:role:3",
            "title": "Плачущий пастух, Наиль",
            "text": "СИЛ 10, ЯСН 10, ДУХ 6, 2ЗЩ\nПосох (d6 тяжелый), разбитое сердце"
          },
          {
            "id": "mb.myth:12:role:4",
            "title": "Обжора-ворон, жирноватый клюв",
            "text": "СИЛ 6, ДУХ 16, ЯСН 5, 2ЗЩ\nКлюв (d6), неуемный аппетит, не может\nесть зерно и фрукты"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:12:omen:1",
            "ordinal": 1,
            "text": "A weeping shepherd. His sheepdogs slaughtered the flock and fled. Crows feast on the remains. His family is starving."
          },
          {
            "id": "mb.myth:12:omen:2",
            "ordinal": 2,
            "text": "A group of poets and scribes fight each other, unable to speak except in growls. The Pack watches from a hill, scattering if disturbed. When it leaves, the travellers' voices return."
          },
          {
            "id": "mb.myth:12:omen:3",
            "ordinal": 3,
            "text": "A challenger fights the leader. Six wolves guard the fight, preventing interference. They support the challenger. The leader toys with him, then tears out his throat when bored."
          },
          {
            "id": "mb.myth:12:omen:4",
            "ordinal": 4,
            "text": "The wind dies and jaws clack. A howl sounds, rough and piercing. Countless howls join the call in the stillness. Soon the howling stops and the wind returns."
          },
          {
            "id": "mb.myth:12:omen:5",
            "ordinal": 5,
            "text": "An important trade road is blocked by crudely uprooted trees and heaps of blood-soaked earth."
          },
          {
            "id": "mb.myth:12:omen:6",
            "ordinal": 6,
            "text": "A Pack of 13 wolves howls in its den, targeting the nearest Dwelling or Holding and attacking people and their animals in darkness or mist."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:12:role:1",
            "title": "Pack Leader, One-Ear",
            "text": "VIG 15, CLA 15, SPI 7, 8GD\nA1 (scarred hide)\nHuge jaws (2d8), no tolerance for manners"
          },
          {
            "id": "mb.myth:12:role:2",
            "title": "Pack Wolves, Scruff, Scrag, Scab, Runt",
            "text": "VIG 10, CLA 12, SPI 3, 4GD\nJaws (d8), love-hate relationship with the leader"
          },
          {
            "id": "mb.myth:12:role:3",
            "title": "Wailing Shepherd, Nayl",
            "text": "VIG 10, CLA 10, SPI 6, 2GD\nStaff (d6 hefty), broken heart"
          },
          {
            "id": "mb.myth:12:role:4",
            "title": "Glutton Crow, Fatteth Rollybird",
            "text": "VIG 6, CLA 16, SPI 5, 2GD\nBeak (d6), insatiable appetite, cannot eat grain or fruit"
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:13",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 55,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:13:omen:1",
            "ordinal": 1,
            "text": "Лишь глухие стоны лунных жаб среди\nкорней. Когда Рыцари засыпают, они видят\nобщий сон о великом глазе, прорастающем\nиз земли."
          },
          {
            "id": "mb.myth:13:omen:2",
            "ordinal": 2,
            "text": "Пожилую кожевницу изгнали из ее дома за\nсеяние раздора. Она видела во снах смущающие тайны своих соседей и не могла\nудержаться от их раскрытия."
          },
          {
            "id": "mb.myth:13:omen:3",
            "ordinal": 3,
            "text": "Серые птицы наблюдают с веток. Когда их\nразгоняют, они кружатся в спиральном\nкруге, прежде чем разлететься."
          },
          {
            "id": "mb.myth:13:omen:4",
            "ordinal": 4,
            "text": "Пятеро послушников маршируют к ближайшему поселению. Они хотят снести\nстены, чтобы все было открыто для Глаза."
          },
          {
            "id": "mb.myth:13:omen:5",
            "ordinal": 5,
            "text": "Парад десятков послушников, катящих деревянную телегу с валуном с узором спирального глаза. Парад мирный, но они предупреждают, что восхождение неизбежно."
          },
          {
            "id": "mb.myth:13:omen:6",
            "ordinal": 6,
            "text": "Гул снизу, затем Глаз поднимается из земли.\nПослушники бегут к нему. Глаз выпускает\nноги и начинает марш к ближайшему провидцу, намереваясь поглотить его за его\nзнания, прежде чем вернуться в землю."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:13:role:1",
            "title": "Глаз, воплощенный в камне",
            "text": "СИЛ 18, ЯСН 3, ДУХ 15, 9ЗЩ\nБ4 (каменное тело)\nЗадавить (d10 взрыв) или поглотить (3d10\nмедленное) Желает поглотить мудрецов."
          },
          {
            "id": "mb.myth:13:role:2",
            "title": "Лунная жаба, серебряный язык",
            "text": "СИЛ 3, ЯСН 3, ДУХ 3, 1ЗЩ\nПриятный цветочный аромат.\nУкус любого, кто оближет жабу, заражает\nсонной болезнью. Этот эффект и любой сон,\nвызванный укусом, сохраняются, пока\nукушенный сам не уснет в следующий раз."
          },
          {
            "id": "mb.myth:13:role:3",
            "title": "Послушники Глаза",
            "text": "СИЛ 10, ЯСН 10, ДУХ 12, 2ЗЩ\nДубина (d8 тяжелая), почерневшие глаза,\nрадость предвкушения"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:13:omen:1",
            "ordinal": 1,
            "text": "Only the muffled groans of moon toads among the roots. When the Knights fall asleep, they share a dream of a great eye sprouting from the earth."
          },
          {
            "id": "mb.myth:13:omen:2",
            "ordinal": 2,
            "text": "An elderly tanner has been driven from her home for sowing discord. In dreams she saw her neighbours' embarrassing secrets and could not resist revealing them."
          },
          {
            "id": "mb.myth:13:omen:3",
            "ordinal": 3,
            "text": "Grey birds watch from the branches. When driven away, they circle in a spiral before scattering."
          },
          {
            "id": "mb.myth:13:omen:4",
            "ordinal": 4,
            "text": "Five acolytes march towards the nearest settlement. They want to tear down its walls so that everything is open to the Eye."
          },
          {
            "id": "mb.myth:13:omen:5",
            "ordinal": 5,
            "text": "A parade of dozens of acolytes rolls a wooden cart carrying a boulder patterned with a spiralling eye. The parade is peaceful, but they warn that the rising is inevitable."
          },
          {
            "id": "mb.myth:13:omen:6",
            "ordinal": 6,
            "text": "A rumbling from below, then the Eye rises from the earth. The acolytes run towards it. The Eye sprouts legs and begins marching towards the nearest Seer, intending to consume them for their knowledge before returning to the earth."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:13:role:1",
            "title": "The Eye, Embodied in Stone",
            "text": "VIG 18, CLA 3, SPI 15, 9GD\nA4 (stone body)\nCrush (d10 blast) or consume (3d10 slow)\nWants to consume the wise."
          },
          {
            "id": "mb.myth:13:role:2",
            "title": "Moon Toad, Silvertongue",
            "text": "VIG 3, CLA 3, SPI 3, 1GD\nA pleasant floral scent.\nLicking the toad makes your bite transmit a sleeping sickness. Both this power and any sleep your bite causes end when you, the biter, next fall asleep."
          },
          {
            "id": "mb.myth:13:role:3",
            "title": "Acolytes of the Eye",
            "text": "VIG 10, CLA 10, SPI 12, 2GD\nClub (d8 hefty), blackened eyes, joyful anticipation"
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:14",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 57,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:14:omen:1",
            "ordinal": 1,
            "text": "Громкий голос поет вдалеке. Странствующий повар распевает песни о прежних\nвладельцах Клинка, каждый из которых\nтрагически погиб (см. напротив)."
          },
          {
            "id": "mb.myth:14:omen:2",
            "ordinal": 2,
            "text": "Деревня на утесе, разрушенная так давно,\nчто поросла мхом и колючками. В разрушенной часовне алтарь с надписью:\nОставлен в земле, не сломленный временем,\nДо первого взмаха, что жаден к войне."
          },
          {
            "id": "mb.myth:14:omen:3",
            "ordinal": 3,
            "text": "Банда из 5 головорезов думает, что рыцари\nзавладели Клинком или знают, где его найти."
          },
          {
            "id": "mb.myth:14:omen:4",
            "ordinal": 4,
            "text": "Внизу природной лестницы кровавое точильное колесо кричит на ветру. Оно может\nзаточить клинки до острия бритвы (+d8), но\nте ломаются после первой нанесенной Раны."
          },
          {
            "id": "mb.myth:14:omen:5",
            "ordinal": 5,
            "text": "Пещера за водопадом хранит в себе Ножны,\nкоторые уничтожают любое лезвие, помещенное внутрь. Водопад ошпаривает (d10)\nлюбого, кто держит оружие, но безвреден\nдля безоружных."
          },
          {
            "id": "mb.myth:14:omen:6",
            "ordinal": 6,
            "text": "Лес кишит мокрицами, усеян мертвыми\nдеревьями. Клинок лежит здесь, но путешественников отвлекают видения того,\nчего они действительно желают."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:14:role:1",
            "title": "Клинок, Силфрекс, Илгламвент",
            "text": "2d8 тяжелый, раненные цели полностью\nуничтожатся. Носитель Клинка теряет d6\nДУХ после каждой Атаки."
          },
          {
            "id": "mb.myth:14:role:2",
            "title": "Головорезы, Колан, Фиа, Эльга, Несс, Рюак",
            "text": "СИЛ 10, ЯСН 10, ДУХ 7, 2ЗЩ\nГросс-мессер (d6), 2 метательных копья (d6)\nУ Колана полущит (d4, Б1), ангельские\nчерты, не спит, может использовать Фокус.\nИстинно кровожаден; остальные спокойнее."
          },
          {
            "id": "mb.myth:14:role:3",
            "title": "Дедушка Мокрица, каменный жук",
            "text": "СИЛ 12, ЯСН 5, ДУХ 2, 5ЗЩ\nБ2 или Б4, если свернулся (панцирь)\nЩелкающий укус (2d6)\nЖаждет деревянные предметы, чтобы\nспрятать их в своем логове и съесть позже.\nОсобенно привлекают изысканные вещи."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:14:omen:1",
            "ordinal": 1,
            "text": "A loud voice sings in the distance. A wandering cook sings songs about the Blade's former owners, each of whom met a tragic end (see opposite)."
          },
          {
            "id": "mb.myth:14:omen:2",
            "ordinal": 2,
            "text": "A clifftop village, ruined so long ago that moss and thorns cover it. In a ruined chapel, an altar is inscribed:\nLeft in the earth, unbroken by time,\nUntil the first stroke that hungers for war."
          },
          {
            "id": "mb.myth:14:omen:3",
            "ordinal": 3,
            "text": "A gang of 5 thugs thinks the knights possess the Blade or know where to find it."
          },
          {
            "id": "mb.myth:14:omen:4",
            "ordinal": 4,
            "text": "At the bottom of a natural stair, a bloody grinding wheel screams in the wind. It can hone blades to a razor edge (+d8), but they break after inflicting their first Wound."
          },
          {
            "id": "mb.myth:14:omen:5",
            "ordinal": 5,
            "text": "A cave behind a waterfall holds the Scabbard, which destroys any blade placed inside. The waterfall scalds (d10) anyone carrying a weapon, but is harmless to the unarmed."
          },
          {
            "id": "mb.myth:14:omen:6",
            "ordinal": 6,
            "text": "A wood teeming with woodlice, scattered with dead trees. The Blade lies here, but travellers are distracted by visions of what they truly desire."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:14:role:1",
            "title": "The Blade, Sifrex, Ilglamvent",
            "text": "2d8 hefty, Wounded targets are utterly destroyed. The bearer of the Blade loses d6 SPI after each Attack."
          },
          {
            "id": "mb.myth:14:role:2",
            "title": "Thugs, Colan, Fia, Elga, Ness, Ruac",
            "text": "VIG 10, CLA 10, SPI 7, 2GD\nLongknife (d6), 2 javelins (d6)\nColan has a half-shield (d4, A1), angelic features, does not sleep and can Focus. Truly bloodthirsty; the others are calmer."
          },
          {
            "id": "mb.myth:14:role:3",
            "title": "Granddad Louse, Rollyromple, Rockbug",
            "text": "VIG 12, CLA 5, SPI 2, 5GD\nA2, or A4 when curled up (shell)\nSnapping bite (2d6)\nCraves wooden objects to hide in its lair and eat later. Especially drawn to finely made things."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "«Mythic Bastionland», предоставленная русская редакция, с. 57: отсылка «(см. напротив)». Целевой материал не включён в разделы знамений и ролей этой карточки.",
        "descriptionEn": "Mythic Bastionland, supplied Russian edition, p. 57: reference \"(see opposite)\". The referenced material is not included in this card's omen and role sections."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:15",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 59,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:15:omen:1",
            "ordinal": 1,
            "text": "Поле, усеянное мусором битвы. Разбитые\nшлемы, щиты и тела. Грязь цепляется за\nпроходящих, на ветру слышатся стоны.\nХудой конь тщетно пытается вытащить\nмертвого всадника из земли."
          },
          {
            "id": "mb.myth:15:omen:2",
            "ordinal": 2,
            "text": "Одинокий дезертир Легиона. Может\nтолько стонать от страха, обыскивая\nземлю в поисках укрытия. Отряд из пяти\nлегионеров уже выследил его, всего в\nнескольких минутах отсюда."
          },
          {
            "id": "mb.myth:15:omen:3",
            "ordinal": 3,
            "text": "Ополченцы в лагере, оправляются после\nстычки с Легионом. Погибших мало, но\nраненые кричат от боли. Раны от клинков\nсвежи, как в момент удара."
          },
          {
            "id": "mb.myth:15:omen:4",
            "ordinal": 4,
            "text": "Войско Легиона на горизонте, стреляет\nиз луков с максимально возможной\nдистанции. Отступают при сближении."
          },
          {
            "id": "mb.myth:15:omen:5",
            "ordinal": 5,
            "text": "Новый легионер лезет из земли. Мучимый\nболью, он держит ржавое оружие и ищет\nкомфорта в рядах Легиона."
          },
          {
            "id": "mb.myth:15:omen:6",
            "ordinal": 6,
            "text": "Три Войска Легиона вторгаются в\nближайший Удел. Если их разбить, они\nвернутся в большем числе. Война\nзаканчивается только если их загнать в\nогонь или воду."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:15:role:1",
            "title": "Легионеры, Рожденные из грязи и крови",
            "text": "СИЛ 15, ЯСН 5, ДУХ 5, 3ЗЩ\nБ3 (ржавая кольчуга, шлем, щит)\nЗазубренный клинок (d8), щит (d4), лук\n(d6 длинный), все наносят раны, с трудом\nзаживающие сами по себе. Боятся смерти.\nНет цели кроме войны."
          },
          {
            "id": "mb.myth:15:role:2",
            "title": "Могильная лошадь, Грейвейл",
            "text": "СИЛ 10, ЯСН 10, ДУХ 5, 2ЗЩ\nИнстинктивное почтение к мертвым,\nвсегда знает, куда их следует отнести."
          },
          {
            "id": "mb.myth:15:role:3",
            "title": "Местное ополчение, крестьяне без опыта",
            "text": "СИЛ 10, ЯСН 10, ДУХ 10, 2ЗЩ\nКопья (d10 длинные), лоскутные униформы"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:15:omen:1",
            "ordinal": 1,
            "text": "A field littered with battle debris. Broken helms, shields and bodies. Mud clings to passers-by, with moaning on the wind. A thin horse vainly tries to pull its dead rider from the earth."
          },
          {
            "id": "mb.myth:15:omen:2",
            "ordinal": 2,
            "text": "A lone deserter from the Legion. Can only moan in fear, searching the ground for shelter. A group of five legionaries has already tracked him down and is only minutes away."
          },
          {
            "id": "mb.myth:15:omen:3",
            "ordinal": 3,
            "text": "Militia in camp recover from a clash with the Legion. Few have died, but the Wounded cry out in pain. Blade wounds are as fresh as when struck."
          },
          {
            "id": "mb.myth:15:omen:4",
            "ordinal": 4,
            "text": "A Warband of the Legion on the horizon shoots bows at the longest possible range. They retreat when approached."
          },
          {
            "id": "mb.myth:15:omen:5",
            "ordinal": 5,
            "text": "A new legionary climbs from the earth. Racked with pain, he holds a rusty weapon and seeks comfort in the ranks of the Legion."
          },
          {
            "id": "mb.myth:15:omen:6",
            "ordinal": 6,
            "text": "Three Warbands of the Legion invade the nearest Holding. If defeated, they return in greater numbers. The war ends only if they are driven into fire or water."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:15:role:1",
            "title": "Legionnaires, Born of Mud and Blood",
            "text": "VIG 15, CLA 5, SPI 5, 3GD\nA3 (rusty mail, helm, shield)\nSerrated blade (d8), shield (d4), bow (d6 long), all inflicting Wounds that struggle to heal on their own. Afraid of death. No purpose beyond war."
          },
          {
            "id": "mb.myth:15:role:2",
            "title": "Graveyard Horse, Greyveil",
            "text": "VIG 10, CLA 10, SPI 5, 2GD\nInstinctive reverence for the dead; always knows where they should be taken."
          },
          {
            "id": "mb.myth:15:role:3",
            "title": "Local Militia, Inexperienced Peasants",
            "text": "VIG 10, CLA 10, SPI 10, 2GD\nPolearms (d10 long), patchwork uniforms"
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:16",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 61,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:16:omen:1",
            "ordinal": 1,
            "text": "Тропа в мерцающей пыли. Через мгновение вспышка зажигает пять танцующих\nбелых огней, которые мучают путешественников. Исчезают, причинив боль."
          },
          {
            "id": "mb.myth:16:omen:2",
            "ordinal": 2,
            "text": "Тень деревьев испускает жар тлеющих\nуглей. Сама темнота обжигает (d6 урона)\nвсех, кто оказывается внутри, но не\nподжигает предметы. Тени возвращаются в норму после этой Фазы."
          },
          {
            "id": "mb.myth:16:omen:3",
            "ordinal": 3,
            "text": "На рыцарей обрушивается рой летучих\nмышей. Они находятся во власти Беса и\nлетят обратно к нему, пролив кровь."
          },
          {
            "id": "mb.myth:16:omen:4",
            "ordinal": 4,
            "text": "На великом столе, который не должен\nздесь находиться, накрыт пир. Если они\nрешат поесть, Бес является и устраивает\nрозыгрыш над Рыцарями. Если они отказываются, он атакует их черным огнем."
          },
          {
            "id": "mb.myth:16:omen:5",
            "ordinal": 5,
            "text": "Тропа обращается в дымный лабиринт со\nстенами пламени. Он отпускает жертв,\nкогда они достаточно раздражены."
          },
          {
            "id": "mb.myth:16:omen:6",
            "ordinal": 6,
            "text": "Он проводит собрание, споря с восемью\nлисами на их языке. Если их встрече\nпозволить завершиться, он уйдет, изгнанный их словами."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:16:role:1",
            "title": "Бес, Скальдарис, Дитя черного пламени",
            "text": "СИЛ 6, ЯСН 17, ДУХ 17, 10ЗЩ\nКогти (2d4) или черное пламя (d6 взрыв)\nПитается раздражением и болью"
          },
          {
            "id": "mb.myth:16:role:2",
            "title": "Лисы при дворе Беса",
            "text": "СИЛ 5, ЯСН 15, ДУХ 6, 4ЗЩ\nУкус (d4), дымящиеся хвосты"
          },
          {
            "id": "mb.myth:16:role:3",
            "title": "Рой одержимых летучих мышей",
            "text": "СИЛ 5, ЯСН 10, ДУХ 3, 7ЗЩ\nУкусы (3d6), отдельные атаки Ослаблены,\nесли они не Взрывные."
          },
          {
            "id": "mb.myth:16:role:4",
            "title": "Танцующее белое пламя",
            "text": "СИЛ 3, ЯСН 10, ДУХ 6, 2ЗЩ\nОжог (d6, игнорирует броню)\nНе страдает от физических атак."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:16:omen:1",
            "ordinal": 1,
            "text": "A trail covered in shimmering dust. A moment later, a flash ignites five dancing white flames that torment travellers. They disappear after causing pain."
          },
          {
            "id": "mb.myth:16:omen:2",
            "ordinal": 2,
            "text": "The shade of trees gives off the heat of glowing embers. The darkness itself burns (d6 damage) anyone inside, but does not ignite objects. Shadows return to normal after this Phase."
          },
          {
            "id": "mb.myth:16:omen:3",
            "ordinal": 3,
            "text": "A swarm of bats descends upon the knights. They are possessed by the Imp and fly back to him after drawing blood."
          },
          {
            "id": "mb.myth:16:omen:4",
            "ordinal": 4,
            "text": "A feast is laid out on a great table that should not be here. If they choose to eat, the Imp appears and plays a trick on the Knights. If they refuse, he attacks with black fire."
          },
          {
            "id": "mb.myth:16:omen:5",
            "ordinal": 5,
            "text": "The trail becomes a smoky maze with walls of flame. It releases its victims when they are sufficiently irritated."
          },
          {
            "id": "mb.myth:16:omen:6",
            "ordinal": 6,
            "text": "He holds a meeting, arguing with eight foxes in their language. If their meeting is allowed to finish, he departs, banished by their words."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:16:role:1",
            "title": "The Imp, Scaldris, Child of Black Flame",
            "text": "VIG 6, CLA 17, SPI 17, 10GD\nClaws (2d4) or black flame (d6 blast)\nFeeds on irritation and pain"
          },
          {
            "id": "mb.myth:16:role:2",
            "title": "Foxes at the Imp's Court",
            "text": "VIG 5, CLA 15, SPI 6, 4GD\nBite (d4), smoking tails"
          },
          {
            "id": "mb.myth:16:role:3",
            "title": "Swarm of Possessed Bats",
            "text": "VIG 5, CLA 10, SPI 3, 7GD\nBites (3d6), individual attacks against them are Impaired unless they have blast."
          },
          {
            "id": "mb.myth:16:role:4",
            "title": "Dancing White Flame",
            "text": "VIG 3, CLA 10, SPI 6, 2GD\nBurn (d6, ignores armour)\nUnaffected by physical attacks."
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:17",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 63,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:17:omen:1",
            "ordinal": 1,
            "text": "В болоте отрезанная рука, похожая на резиновую, ползет вперед, царапая любого, кто\nвмешается. Без чувства направления, она в\nитоге превращается в твердый кусок плоти."
          },
          {
            "id": "mb.myth:17:omen:2",
            "ordinal": 2,
            "text": "Маленький хамелеон наблюдает с ветки.\nШипит предупреждение, если кто-то проходит мимо, пробуждая Тролля в ближайших\nдеревьях, затем убегает в свое убежище."
          },
          {
            "id": "mb.myth:17:omen:3",
            "ordinal": 3,
            "text": "Вор убегает из заброшенной пещеры, вырезанного в земле жилища. Кривая мебель,\nсколоченная из камня и грязи. Кровь на\nземле, кости, еще одна мертвая конечность\nтролля. Вор не нашел ничего ценного."
          },
          {
            "id": "mb.myth:17:omen:4",
            "ordinal": 4,
            "text": "Тролль тащит умирающего боевого коня\nобратно к своей новой пещере. Рыцарь\nлежит замертво."
          },
          {
            "id": "mb.myth:17:omen:5",
            "ordinal": 5,
            "text": "Мерцающий пруд посреди болота, покрытого тростником, кишащим мухами. Нарушение покоя воды дарует видение того, как\nТролля атакуют солдаты с топорами, разрубая существо на куски."
          },
          {
            "id": "mb.myth:17:omen:6",
            "ordinal": 6,
            "text": "Рассеченный от головы до таза, Тролль\nудерживает себя вместе, неистовствуя, и\nжаждет мяса, чтобы ускорить регенерацию."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:17:role:1",
            "title": "Тролль, Проклят выживать",
            "text": "СИЛ 18, ЯСН 5, ДУХ 6, 7ЗЩ\nБ2 (резиновая кожа)\nВзмахи лапами (2d10)\nВосстанавливает d12 СИЛ в начале своего\nхода. Может медленно восстанавливаться\nпосле любого урона, но ожоги заживают\nцелый Век.\nОбожает своего ручного хамелеона."
          },
          {
            "id": "mb.myth:17:role:2",
            "title": "Рука Тролля",
            "text": "СИЛ 5, ЯСН 5, ДУХ 1, 1ЗЩ\nБ2 (резиновая кожа)\nКоготь (d6)"
          },
          {
            "id": "mb.myth:17:role:3",
            "title": "Неловкий вор, Саммесрид",
            "text": "СИЛ 12, ЯСН 7, ДУХ 16, 4ЗЩ\nДубинка (d6), ломик, хромая нога\nЧестный, аморальный и бесстыдный."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:17:omen:1",
            "ordinal": 1,
            "text": "In a bog, a severed rubbery arm crawls forward, scratching anyone who interferes. With no sense of direction, it eventually becomes a solid lump of flesh."
          },
          {
            "id": "mb.myth:17:omen:2",
            "ordinal": 2,
            "text": "A small chameleon watches from a branch. It hisses a warning if anyone passes, waking the Troll in the nearby trees, then flees to its shelter."
          },
          {
            "id": "mb.myth:17:omen:3",
            "ordinal": 3,
            "text": "A thief flees an abandoned cave, a dwelling carved into the earth. Crooked furniture cobbled together from stone and mud. Blood on the ground, bones, another dead troll limb. The thief found nothing valuable."
          },
          {
            "id": "mb.myth:17:omen:4",
            "ordinal": 4,
            "text": "The Troll drags a dying warhorse back to its new cave. A knight lies dead."
          },
          {
            "id": "mb.myth:17:omen:5",
            "ordinal": 5,
            "text": "A bronze-coloured, shimmering pool in the middle of a reed-covered bog swarming with flies. Disturbing the water grants a vision of soldiers with axes attacking the Troll and hacking the creature to pieces."
          },
          {
            "id": "mb.myth:17:omen:6",
            "ordinal": 6,
            "text": "Split from head to pelvis, the Troll holds itself together, raging and craving meat to hasten its regeneration."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:17:role:1",
            "title": "The Troll, Cursed to Endure",
            "text": "VIG 18, CLA 5, SPI 6, 7GD\nA2 (rubbery skin)\nFlailing limbs (2d10)\nRecovers d12 VIG at the start of its turn. Can slowly recover from any damage, but burns take an entire Age to heal. Adores its pet chameleon."
          },
          {
            "id": "mb.myth:17:role:2",
            "title": "The Troll's Arm",
            "text": "VIG 5, CLA 5, SPI 1, 1GD\nA2 (rubbery skin)\nClaw (d6)"
          },
          {
            "id": "mb.myth:17:role:3",
            "title": "Clumsy Burglar, Sammesrede",
            "text": "VIG 12, CLA 7, SPI 16, 4GD\nClub (d6), crowbar, lame leg\nHonest, amoral and shameless."
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:18",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 65,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:18:omen:1",
            "ordinal": 1,
            "text": "Кровавые останки козы цвета слоновой\nкости, ее потроха разложены по широкой\nспирали. Белых коз не едят, считая их\nперерождениями провидцев из прошлого."
          },
          {
            "id": "mb.myth:18:omen:2",
            "ordinal": 2,
            "text": "Певец, бьющий в барабан. Он поет жестокие песни о рыцарях, зная больше, чем\nмог бы. Он полностью игнорирует рыцарей, даже если его задерживают."
          },
          {
            "id": "mb.myth:18:omen:3",
            "ordinal": 3,
            "text": "На лугу группа пьяниц подбрасывает\nдрова в костер, уже вышедший из-под\nконтроля. Они восхваляют Ворочающегося Внутри, радуясь, что он съест провидцев и освободит нас от их лжи."
          },
          {
            "id": "mb.myth:18:omen:4",
            "ordinal": 4,
            "text": "Солнце черное, золотой свет из его короны. Животные в панике, провидцы слепы.\nДлится до следующего рассвета."
          },
          {
            "id": "mb.myth:18:omen:5",
            "ordinal": 5,
            "text": "Некогда любимая Рыцарь теперь буйствует по Королевству, убивая крепостных. Из\nее головы вырос изогнутый рог с одной\nстороны, а все человеческое в ней исчезло."
          },
          {
            "id": "mb.myth:18:omen:6",
            "ordinal": 6,
            "text": "Раздутого крепостного тащат прочь,\nпрежде чем он взрывается облаком кровавого тумана. Демон выходит из него в\nсвоем истинном облике и не остановится,\nпока не съест 7 провидцев."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:18:role:1",
            "title": "Демон, Ул-Хурок, Ворочающийся Внутри",
            "text": "СИЛ 15, ЯСН 15, ДУХ 15, 8ЗЩ\nБ4, обходится оружием, покрытым кровью\nПровидцев (кривая шкура)\nРвет (d6), мечет (d8) и нанизывает (d10)\nМожет рвать на любом расстоянии."
          },
          {
            "id": "mb.myth:18:role:2",
            "title": "Пьяницы, Эона, Нисси, Франга",
            "text": "СИЛ 10, ЯСН 4, ДУХ 9, 2ЗЩ\nОбразы одержимых (см. ниже) Ждут\nДемона, других поводов жить нет."
          },
          {
            "id": "mb.myth:18:role:3",
            "title": "Некогда любимая Рыцарь, Этне, одержима",
            "text": "СИЛ 15, ЯСН 8, ДУХ 3, 7ЗЩ\nБ2 (кровавая кольчуга, шлем)\nДлинный меч (2d8 тяжелый)\nТеперь не знает ничего, кроме резни."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:18:omen:1",
            "ordinal": 1,
            "text": "The bloody remains of an ivory-coloured goat, its entrails spread in a broad spiral. White goats are not eaten, being considered reincarnations of Seers from the past."
          },
          {
            "id": "mb.myth:18:omen:2",
            "ordinal": 2,
            "text": "A singer beating a drum. He sings cruel songs about the Knights, knowing more than he should. He completely ignores the Knights, even if detained."
          },
          {
            "id": "mb.myth:18:omen:3",
            "ordinal": 3,
            "text": "In a meadow, a group of drunkards throw logs onto an already uncontrollable fire. They praise the Writher Within, rejoicing that he will eat the Seers and free us from their lies."
          },
          {
            "id": "mb.myth:18:omen:4",
            "ordinal": 4,
            "text": "The sun is black, with golden light from its corona. Animals panic and Seers are blind. This lasts until the next dawn."
          },
          {
            "id": "mb.myth:18:omen:5",
            "ordinal": 5,
            "text": "A once-beloved Knight now rampages through the Realm, killing serfs. A curved horn has grown from one side of her head, and everything human in her has vanished."
          },
          {
            "id": "mb.myth:18:omen:6",
            "ordinal": 6,
            "text": "A bloated serf is dragged away before he bursts into a cloud of bloody mist. The Demon emerges from him in its true form and will not stop until it has eaten 7 Seers."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:18:role:1",
            "title": "The Demon, Ul-Huroc, the Writher Within",
            "text": "VIG 15, CLA 15, SPI 15, 8GD\nA4, bypassed by weapons coated in Seer blood (warped hide)\nTear (d6), hurl (d8), and impale (d10)\nCan tear at any distance."
          },
          {
            "id": "mb.myth:18:role:2",
            "title": "Drunkards, Eonah, Nissi, Franga",
            "text": "VIG 10, CLA 4, SPI 9, 2GD\nAspects of the possessed (see below). Await the Demon, with no other reason to live."
          },
          {
            "id": "mb.myth:18:role:3",
            "title": "The once-beloved Knight, Ethne, possessed",
            "text": "VIG 15, CLA 8, SPI 3, 7GD\nA2 (bloody mail, helm)\nLongsword (2d8 hefty)\nNow knows nothing but slaughter."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "«Mythic Bastionland», предоставленная русская редакция, с. 65: отсылка «(см. ниже)». Целевой материал не включён в разделы знамений и ролей этой карточки.",
        "descriptionEn": "Mythic Bastionland, supplied Russian edition, p. 65: a reference to \"see below\". The target material is not included in this card's Omens and Roles sections."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:19",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 67,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:19:omen:1",
            "ordinal": 1,
            "text": "У порогов сверкающей реки пастуха атакуют 8 крабов-волков, которых обычно\nможно встретить только на пляжах."
          },
          {
            "id": "mb.myth:19:omen:2",
            "ordinal": 2,
            "text": "Соленый дождь обрушивается на землю,\nпаутинистые водоросли свисают с деревьев. В заброшенной лучной мастерской\nукрылись олени и кабаны."
          },
          {
            "id": "mb.myth:19:omen:3",
            "ordinal": 3,
            "text": "На месте скромного пруда возникает новое\nморе, его прилив бушует день и ночь. Кричащие лысухи издают оглушительный\nпротест."
          },
          {
            "id": "mb.myth:19:omen:4",
            "ordinal": 4,
            "text": "Двухсердечный Рыцарь ревет на Море,\nпытаясь отогнать воду своим коралловым\nкольцом. Он не знает, что должен быть\nпогружен в воду, чтобы управлять ею."
          },
          {
            "id": "mb.myth:19:omen:5",
            "ordinal": 5,
            "text": "Начинается великая буря, которая не\nпрекратится, пока волна не достигнет\nберега. Соленая вода поднимается из\nвсех источников, земля затоплена, урожай испорчен."
          },
          {
            "id": "mb.myth:19:omen:6",
            "ordinal": 6,
            "text": "Волна поднимается на горизонте, высотой с горы. Если она накроет Королевство, то мало кто выживет. После\nопустошения Море успокаивается и\nвозвращается на свое обычное место."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:19:role:1",
            "title": "Верный пастух, Гантирн",
            "text": "СИЛ 12, ЯСН 7, ДУХ 7, 1ЗЩ\nПосох (d6 длинный), жаждет служить Провидцу"
          },
          {
            "id": "mb.myth:19:role:2",
            "title": "Краб-волк, Синяя соль, Гиена глубин",
            "text": "СИЛ 5, ЯСН 5, ДУХ 5, 3ЗЩ\nБ2 (толстый панцирь)\nКогти (2d6)"
          },
          {
            "id": "mb.myth:19:role:3",
            "title": "Двухсердечный Рыцарь, Алахаг",
            "text": "СИЛ 10, ЯСН 6, ДУХ 14, 10ЗЩ\nБ2 (белая кольчуга, латы)\nСияющий меч (2d6 тяжелый, на дуплете\nослепляет врага), коралловое кольцо\n(носитель может управлять морем, когда\nпогружен в него)\nХочет искупить себя."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:19:omen:1",
            "ordinal": 1,
            "text": "At the rapids of a sparkling river, a shepherd is attacked by 8 wolf-crabs, usually found only on beaches."
          },
          {
            "id": "mb.myth:19:omen:2",
            "ordinal": 2,
            "text": "Salty rain lashes the land, and cobweb-like seaweed hangs from trees. Deer and boars shelter in an abandoned bowyer's workshop."
          },
          {
            "id": "mb.myth:19:omen:3",
            "ordinal": 3,
            "text": "A new sea appears where a modest pond once stood, its tide raging day and night. Screaming coots raise a deafening protest."
          },
          {
            "id": "mb.myth:19:omen:4",
            "ordinal": 4,
            "text": "The Two-Hearted Knight bellows at the Sea, trying to drive the water back with his coral ring. He does not know that he must be submerged to control it."
          },
          {
            "id": "mb.myth:19:omen:5",
            "ordinal": 5,
            "text": "A great storm begins and will not end until the Wave reaches shore. Salt water rises from every spring, flooding the land and ruining crops."
          },
          {
            "id": "mb.myth:19:omen:6",
            "ordinal": 6,
            "text": "The Wave rises on the horizon, as high as the mountains. Few will survive if it sweeps across the Realm. After the devastation, the Sea calms and returns to its usual place."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:19:role:1",
            "title": "Devout Shepherd, Ganthyrn",
            "text": "VIG 12, CLA 7, SPI 7, 1GD\nStaff (d6 long), longs to serve a Seer"
          },
          {
            "id": "mb.myth:19:role:2",
            "title": "Wolfcrab, Bluebrine, Hyena of the Deep",
            "text": "VIG 5, CLA 5, SPI 5, 3GD\nA2 (thick shell)\nClaws (2d6)"
          },
          {
            "id": "mb.myth:19:role:3",
            "title": "The Two-Hearted Knight, Alahag",
            "text": "VIG 10, CLA 6, SPI 14, 10GD\nA2 (white mail, plate)\nShining sword (2d6 hefty, dazzles the foe on doubles), coral ring (the wearer can control the sea while submerged in it)\nWants to redeem himself."
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:20",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 69,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:20:omen:1",
            "ordinal": 1,
            "text": "Вдоль потаенного ручья появляются\nотдельные признаки раннего прихода\nследующего сезона."
          },
          {
            "id": "mb.myth:20:omen:2",
            "ordinal": 2,
            "text": "Два разрушителя сезона собираются убить\nбеззащитного кузнеца у его крошечной\nкузницы. Утверждают, что смена сезонов\nтребует свежей крови."
          },
          {
            "id": "mb.myth:20:omen:3",
            "ordinal": 3,
            "text": "Разведчик сезона несет жезл грядущего\nсезона, желая подарить его Провидцу от\nлица Эльфа. Жезл обладает силой\nускорить наступление своего сезона."
          },
          {
            "id": "mb.myth:20:omen:4",
            "ordinal": 4,
            "text": "Разведчик сезона дарит лук грядущего\nсезона (d8 длинный) рыцарю с наивысшим\nпоказателем ДУХ. Лук наделен силой\nгрядущего сезона и становится более\nмощным в свой сезон (2d8)."
          },
          {
            "id": "mb.myth:20:omen:5",
            "ordinal": 5,
            "text": "Разведчик сезона направляется к Престолу\nВласти, чтобы доставить сообщение\nправителю Королевства. Он несет с собой\nдлинную гадюку, прыгающую, говорящую\nзмею. Только гадюка знает, что Эльф идет,\nчтобы заявить права на Королевство."
          },
          {
            "id": "mb.myth:20:omen:6",
            "ordinal": 6,
            "text": "Эльф выходит на свет, чтобы потребовать\nПрестол, ведя по одному войску разведчиков\nи разрушителей. Предпочел бы дуэль."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:20:role:1",
            "title": "Эльф, Проводник Сезонов, Коредис",
            "text": "СИЛ 9, ЯСН 9, ДУХ 9, 13ЗЩ\nДействует первым, быстрее любого\nсоперника. Хочет похвастаться своей силой.\nВесной: ДУХ 19 и быстрый лук (2d6 длинный)\nВ жатву: СИЛ 19 и золотой фалькс (3d6 длинный)\nЗимой: ЯСН 19, клыки и когти (4d6)"
          },
          {
            "id": "mb.myth:20:role:2",
            "title": "Разведчики сезона, Тизра, Виот, Сантросал",
            "text": "СИЛ 8, ЯСН 16, ДУХ 12, 8ЗЩ\nБыстрый лук (2d6), соломенные волосы,\nноль терпения. Бегут при ранении,\nбыстрее любого смертного."
          },
          {
            "id": "mb.myth:20:role:3",
            "title": "Разрушители сезона, Килунар, Тасивиза",
            "text": "СИЛ 10, ЯСН 12, ДУХ 12, 8ЗЩ\nБ2 (броня из гладкой коры, шлем)\nЗолотой фалькс (3d6 длинный), чувство\nпревосходства"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:20:omen:1",
            "ordinal": 1,
            "text": "Along a hidden stream, isolated signs appear that the next Season is arriving early."
          },
          {
            "id": "mb.myth:20:omen:2",
            "ordinal": 2,
            "text": "Two Season Destroyers are about to kill a defenceless, defeated ironsmith beside his tiny forge. They claim that the changing of Seasons demands fresh blood."
          },
          {
            "id": "mb.myth:20:omen:3",
            "ordinal": 3,
            "text": "A Season Scout carries a rod of the coming Season, intending to give it to a Seer on behalf of the Elf. The rod has the power to hasten its Season's arrival."
          },
          {
            "id": "mb.myth:20:omen:4",
            "ordinal": 4,
            "text": "A Season Scout gives a bow of the coming Season (d8 long) to the Knight with the highest SPI. The bow is imbued with the coming Season's power and grows stronger during that Season (2d8)."
          },
          {
            "id": "mb.myth:20:omen:5",
            "ordinal": 5,
            "text": "A Season Scout travels to the Seat of Power to deliver a message to the Realm's ruler. He carries a longly viper, a leaping, talking snake. Only the viper knows that the Elf is coming to claim the Realm."
          },
          {
            "id": "mb.myth:20:omen:6",
            "ordinal": 6,
            "text": "The Elf steps into the light to claim the Seat, leading one Warband of Scouts and one of Destroyers. Would prefer a duel."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:20:role:1",
            "title": "The Elf, Steward of Seasons, Coredis",
            "text": "VIG 9, CLA 9, SPI 9, 13GD\nActs first, faster than any opponent. Wants to show off their power.\nIn Spring: SPI 19 and swift bow (2d6 long)\nIn Harvest: VIG 19 and golden falx (3d6 long)\nIn Winter: CLA 19, fangs and claws (4d6)"
          },
          {
            "id": "mb.myth:20:role:2",
            "title": "Season Scouts, Tizra, Vioth, Santrosal",
            "text": "VIG 8, CLA 16, SPI 12, 8GD\nSwift bow (2d6), straw hair, no patience. Flee when Wounded, faster than any mortal."
          },
          {
            "id": "mb.myth:20:role:3",
            "title": "Season Destroyers, Kilunar, Tasiviza",
            "text": "VIG 10, CLA 12, SPI 12, 8GD\nA2 (smooth bark armour, helm)\nGolden falx (3d6 long), a sense of superiority"
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:21",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 71,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:21:omen:1",
            "ordinal": 1,
            "text": "Пастух спит на ветке. Затем земля начинает гудеть, и стадо начинает мчаться\nпрямо на него."
          },
          {
            "id": "mb.myth:21:omen:2",
            "ordinal": 2,
            "text": "Лабиринт каменистых утесов. Сообщение,\nвырезанное на скале: «Все рыцари почувствуют топор»."
          },
          {
            "id": "mb.myth:21:omen:3",
            "ordinal": 3,
            "text": "Разрушенный шестиугольный храм, внутри\nкоторого остались только семь каменных\nскамей. На каждой из них лежит череп, а на\nспинках грубо вырезан герб рыцаря. Огненный хорек грызет один из черепов."
          },
          {
            "id": "mb.myth:21:omen:4",
            "ordinal": 4,
            "text": "Укромный сад, среди пения птиц раздаются стоны. Рыцарь лежит, истекая кровью, ее рука отсечена Носителем Топора.\nОна не знает, почему ее пощадили."
          },
          {
            "id": "mb.myth:21:omen:5",
            "ordinal": 5,
            "text": "Эхо разговора доносится из извилистого туннеля. Находящиеся внутри ополченцы обсуждают, должны ли рыцари отдать свои жизни, чтобы умилостивить Носителя Топора."
          },
          {
            "id": "mb.myth:21:omen:6",
            "ordinal": 6,
            "text": "Носитель Топора стоит на вершине утеса,\nпровозглашая, что Топор разрубит саму\nземлю пополам. Первый удар по земле\nвызывает гул, второй — раскрывает пропасть через весь гекс, третий — могучий\nканьон через все королевство."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:21:role:1",
            "title": "Носитель Топора, Уэлла Галл",
            "text": "СИЛ 14, ЯСН 12, ДУХ 15, 11ЗЩ\nБ1 (тесный гамбезон)\nТопор (d10 длинный, +d12 против Рыцарей)\nВерит, что призван убить всех рыцарей.\nЛюбой, кто несет Топор, получает это\nпомешательство."
          },
          {
            "id": "mb.myth:21:role:2",
            "title": "Огненный хорек, Эмбернип",
            "text": "СИЛ 5, ЯСН 10, ДУХ 5, 2ЗЩ\nЧелюсти (приятно греют, восстанавливают\nЯСН раз в сутки), обожает мясо птиц и яйца."
          },
          {
            "id": "mb.myth:21:role:3",
            "title": "Мчащееся стадо, Войско",
            "text": "СИЛ 10, ЯСН 5, ДУХ 5, 3ЗЩ"
          },
          {
            "id": "mb.myth:21:role:4",
            "title": "Неспешный пастух, Паско",
            "text": "СИЛ 11, ЯСН 5, ДУХ 16, 3ЗЩ\nСвитки, карты, компас (невероятно редкий)"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:21:omen:1",
            "ordinal": 1,
            "text": "A cowherd sleeps on a branch. Then the ground begins to rumble, and his cattle stampede straight towards him."
          },
          {
            "id": "mb.myth:21:omen:2",
            "ordinal": 2,
            "text": "A maze of rocky cliffs. A message carved into the rock: \"All Knights shall feel the Axe.\""
          },
          {
            "id": "mb.myth:21:omen:3",
            "ordinal": 3,
            "text": "A ruined hexagonal temple, with only seven stone benches left inside. A skull lies on each, and a Knight's crest is crudely carved into each backrest. A flame weasel gnaws on one skull."
          },
          {
            "id": "mb.myth:21:omen:4",
            "ordinal": 4,
            "text": "A secluded orchard, groans amid birdsong. A Knight lies bleeding, her arm severed by the Axe-Bearer. She does not know why she was spared."
          },
          {
            "id": "mb.myth:21:omen:5",
            "ordinal": 5,
            "text": "The echo of conversation comes from a winding tunnel. The militia inside discuss whether the Knights should give their lives to appease the Axe-Bearer."
          },
          {
            "id": "mb.myth:21:omen:6",
            "ordinal": 6,
            "text": "The Axe-Bearer stands atop a cliff, declaring that the Axe will split the very earth in two. The first strike against the ground causes a rumble, the second opens a chasm across the entire hex, and the third a mighty canyon across the whole Realm."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:21:role:1",
            "title": "The Axe-Bearer, Wella Gall",
            "text": "VIG 14, CLA 12, SPI 15, 11GD\nA1 (tight gambeson)\nThe Axe (d10 long, +d12 against Knights)\nBelieves they are called to kill every Knight. Anyone carrying the Axe gains this madness."
          },
          {
            "id": "mb.myth:21:role:2",
            "title": "Flame weasel, Embernip",
            "text": "VIG 5, CLA 10, SPI 5, 2GD\nJaws (pleasantly warm, restore CLA once per day), loves bird meat and eggs."
          },
          {
            "id": "mb.myth:21:role:3",
            "title": "Stampeding Cattle, Warband",
            "text": "VIG 10, CLA 5, SPI 5, 3GD"
          },
          {
            "id": "mb.myth:21:role:4",
            "title": "Relaxed Cowherd, Pasco",
            "text": "VIG 11, CLA 5, SPI 16, 3GD\nScrolls, maps, compass (incredibly rare)"
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:22",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 73,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:22:omen:1",
            "ordinal": 1,
            "text": "Древний разбитый фонтан, за которым\nухаживает одинокий Гном. Он осторожно\nперекладывает камни с помощью молотка.\nГоворит, что служит правителю Королевства и рад снова работать."
          },
          {
            "id": "mb.myth:22:omen:2",
            "ordinal": 2,
            "text": "Голоса из тенистой рощи. Наемники, вооруженные свежескованным оружием Гнома, обсуждают, где найти работу."
          },
          {
            "id": "mb.myth:22:omen:3",
            "ordinal": 3,
            "text": "Внезапно появляется широкий вход в туннель. Гном ведет неохотных рабочих,\nпрокладывая проход в далекое Королевство. Ему не важно куда. Земля вокруг\nтуннеля словно истекает кровью, но Гном\nне смущен."
          },
          {
            "id": "mb.myth:22:omen:4",
            "ordinal": 4,
            "text": "Внезапно из грунта поднимаются три\nогромных великана мстительной земли и\nнападают на всех, кого найдут."
          },
          {
            "id": "mb.myth:22:omen:5",
            "ordinal": 5,
            "text": "Группа торговцев, трудяг и воров из далекого Королевства. Говорят, что прибыли\nчерез туннель и ищут новый дом."
          },
          {
            "id": "mb.myth:22:omen:6",
            "ordinal": 6,
            "text": "Земля извивается и корчится. Почва разверзается, поглощая ближайший Удел и\nутаскивая его в далекое Королевство на\nдругом конце туннеля."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:22:role:1",
            "title": "Гном, Дрод из Первой Кузни",
            "text": "СИЛ 15, ЯСН 15, ДУХ 12, 7ЗЩ\nБ2 (кольчуга, бронзовые латы)\nМолот творца (3d10 медл., не может убить)\nСтрасть к созданию, больше чувств нет."
          },
          {
            "id": "mb.myth:22:role:2",
            "title": "Вновь вооруженные наемники, Войско",
            "text": "СИЛ 12, ЯСН 10, ДУХ 10, 5ЗЩ\nБ3 (кольчуга, бронзовые латы, шлем)\nКованное оружие (см. ниже)\nБроней и оружием может управлять владелец\nмолота творца."
          },
          {
            "id": "mb.myth:22:role:3",
            "title": "Великан мстительной земли",
            "text": "СИЛ 17, ЯСН 4, ДУХ 3, 7ЗЩ\nБ3 (тело из камня и земли)\nВзмахи (d10) или огромные удары (2d10 медл.)\nБьется, пока не решит, что люди настрадались."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:22:omen:1",
            "ordinal": 1,
            "text": "An ancient, broken fountain tended by a lone Dwarf. He carefully shifts the stones with a hammer. Says he serves the Realm's ruler and is glad to be working again."
          },
          {
            "id": "mb.myth:22:omen:2",
            "ordinal": 2,
            "text": "Voices from a shady grove. Mercenaries armed with the Dwarf's freshly forged weapons discuss where to find work."
          },
          {
            "id": "mb.myth:22:omen:3",
            "ordinal": 3,
            "text": "A broad tunnel entrance suddenly appears. The Dwarf leads reluctant workers, cutting a passage to a distant Realm. He does not care which one. The earth around the tunnel seems to bleed, but the Dwarf is untroubled."
          },
          {
            "id": "mb.myth:22:omen:4",
            "ordinal": 4,
            "text": "Three enormous giants of vengeful earth suddenly rise from the ground and attack anyone they find."
          },
          {
            "id": "mb.myth:22:omen:5",
            "ordinal": 5,
            "text": "A group of traders, labourers, and thieves from a distant Realm. They say they arrived through the tunnel and seek a new home."
          },
          {
            "id": "mb.myth:22:omen:6",
            "ordinal": 6,
            "text": "The earth writhes and twists. The ground opens, swallowing the nearest Holding and dragging it to the distant Realm at the other end of the tunnel."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:22:role:1",
            "title": "The Dwarf, Drod of the First Forge",
            "text": "VIG 15, CLA 15, SPI 12, 7GD\nA2 (mail, bronze plate)\nCreator hammer (3d10 slow, cannot kill)\nA passion for making, with no other feelings."
          },
          {
            "id": "mb.myth:22:role:2",
            "title": "Newly armed mercenaries, Warband",
            "text": "VIG 12, CLA 10, SPI 10, 5GD\nA3 (mail, bronze plate, helm)\nForged weapons (see below)\nTheir armour and weapons can be controlled by the bearer of the creator hammer."
          },
          {
            "id": "mb.myth:22:role:3",
            "title": "Giant of vengeful earth",
            "text": "VIG 17, CLA 4, SPI 3, 7GD\nA3 (body of stone and earth)\nSwipes (d10) or enormous blows (2d10 slow)\nFights until it decides humans have suffered enough."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "«Mythic Bastionland», предоставленная русская редакция, с. 73: отсылка «(см. ниже)». Целевой материал не включён в разделы знамений и ролей этой карточки.",
        "descriptionEn": "Mythic Bastionland, supplied Russian edition, p. 73: a reference to \"see below\". The target material is not included in this card's Omens and Roles sections."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:23",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 75,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:23:omen:1",
            "ordinal": 1,
            "text": "Переходя через бесплодное болото, Рыцарь Молнии сопровождает рабочих в\nтелегах. Их везут на стройку Башни, где\nнужны дополнительные силы."
          },
          {
            "id": "mb.myth:23:omen:2",
            "ordinal": 2,
            "text": "Дюжина огромных вьючных птиц тащат\nмассивные блоки по всему Королевству,\nвскапывая за собой землю. Стражи Башни\nпровожают их верхом на лошадях."
          },
          {
            "id": "mb.myth:23:omen:3",
            "ordinal": 3,
            "text": "Лестница в дикой местности, вызывающая\nсновидения у всех, кто поднимается по ней\n(см. напротив). На вершине открывается\nвид на Башню, построенную у горизонта."
          },
          {
            "id": "mb.myth:23:omen:4",
            "ordinal": 4,
            "text": "Черные облака и гром, но без дождя. Трещащие молнии вызывают пожары по всему Королевству. Это не закончится, пока\nБашня не падет."
          },
          {
            "id": "mb.myth:23:omen:5",
            "ordinal": 5,
            "text": "Титанический удар грома и ослепляющая\nмолния. Башня начинает падать, и ее не\nостановить. Гром и молнии продолжаются."
          },
          {
            "id": "mb.myth:23:omen:6",
            "ordinal": 6,
            "text": "С раскатом грома все похожие на башни\nстроения в Королевстве начинают дрожать, как величественные, так и скромные. С последним ударом все они падают.\nОблака рассеиваются."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:23:role:1",
            "title": "Рыцарь Молнии, Берех из Башни",
            "text": "СИЛ 12, ЯСН 17, ДУХ 9, 7ЗЩ\nБ3 (кольчуга, мерцающие латы, шлем)\nЖестокий протазан (d10 длинный +d10\nпротив всадников) Ненависть ко всему\nнеидеальному."
          },
          {
            "id": "mb.myth:23:role:2",
            "title": "Огромная вьючная птица, Ваззлтард",
            "text": "СИЛ 17, ЯСН 10, ДУХ 4, 4ЗЩ\nБ2 (гигантское тело)\nДавить и рвать (2d10)\nЛегко пугается, жаждет одобрения людей"
          },
          {
            "id": "mb.myth:23:role:3",
            "title": "Стражи Башни",
            "text": "СИЛ 12, ЯСН 10, ДУХ 7, 4ЗЩ\nБ2 (кольчуга, шлем)\nКопья (d10 длинное)\nЖаждут цели и участия в чем-то большом."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:23:omen:1",
            "ordinal": 1,
            "text": "Crossing a barren marsh, the Bolt Knight escorts workers in carts. They are being taken to the Tower's construction site, where more hands are needed."
          },
          {
            "id": "mb.myth:23:omen:2",
            "ordinal": 2,
            "text": "A dozen enormous pack birds drag massive blocks across the Realm, churning up the ground behind them. Tower Guards escort them on horseback."
          },
          {
            "id": "mb.myth:23:omen:3",
            "ordinal": 3,
            "text": "A staircase in the wilderness brings dreams to anyone who climbs it (see opposite). The Tower, built at the horizon, is visible from the top."
          },
          {
            "id": "mb.myth:23:omen:4",
            "ordinal": 4,
            "text": "Black clouds and thunder, but no rain. Crackling lightning starts fires across the Realm. This will not end until the Tower falls."
          },
          {
            "id": "mb.myth:23:omen:5",
            "ordinal": 5,
            "text": "A titanic thunderclap and blinding lightning. The Tower begins to fall, and nothing can stop it. The thunder and lightning continue."
          },
          {
            "id": "mb.myth:23:omen:6",
            "ordinal": 6,
            "text": "With a thunderclap, every tower-like structure in the Realm begins to tremble, grand and humble alike. With a final crash, they all fall. The clouds disperse."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:23:role:1",
            "title": "The Bolt Knight, Berech of the Tower",
            "text": "VIG 12, CLA 17, SPI 9, 7GD\nA3 (mail, shimmering plate, helm)\nCruel partisan (d10 long, +d10 against riders)\nHatred of everything imperfect."
          },
          {
            "id": "mb.myth:23:role:2",
            "title": "Great Bird of Burden, Wazzletard",
            "text": "VIG 17, CLA 10, SPI 4, 4GD\nA2 (gigantic body)\nCrush and tear (2d10)\nEasily frightened, longs for human approval."
          },
          {
            "id": "mb.myth:23:role:3",
            "title": "Tower Guards",
            "text": "VIG 12, CLA 10, SPI 7, 4GD\nA2 (mail, helm)\nPolearms (d10 long)\nLong for purpose and to be part of something great."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "«Mythic Bastionland», предоставленная русская редакция, с. 75: отсылка «(см. напротив)». Целевой материал не включён в разделы знамений и ролей этой карточки.",
        "descriptionEn": "Mythic Bastionland, supplied Russian edition, p. 75: a reference to \"see opposite\". The target material is not included in this card's Omens and Roles sections."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:24",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 77,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:24:omen:1",
            "ordinal": 1,
            "text": "Звезды видны даже днем, образуя узор колеса, который заметно вращается."
          },
          {
            "id": "mb.myth:24:omen:2",
            "ordinal": 2,
            "text": "Огромный кратер, от каменного форпоста остались лишь обломки. Внутри тяжелые отпечатки ног."
          },
          {
            "id": "mb.myth:24:omen:3",
            "ordinal": 3,
            "text": "Горестная семья утверждает, что пара огромных тигров напала на их ферму, съев кур, овец и собаку. Они уверяют, что звери упали с неба и исчезли обратно в темноте."
          },
          {
            "id": "mb.myth:24:omen:4",
            "ordinal": 4,
            "text": "В лесу или на горе прорезана полоса. Она ведет к гексу Мифа."
          },
          {
            "id": "mb.myth:24:omen:5",
            "ordinal": 5,
            "text": "Колесница едет за горизонт, запряженный двумя огромными тиграми. Возничий делится своими прошлыми победами, собирая последователей, чтобы поддержать свое эго. Он ищет мести против правителя ближайшего Удела, который слегка его обидел."
          },
          {
            "id": "mb.myth:24:omen:6",
            "ordinal": 6,
            "text": "Возничий готовится доказать свое хвастовство, в котором кто-то усомнился, собираясь или против течения, или против прилива, чтобы доказать, что никакая простая вода не сравнится с Колесницей. Он добьется успеха, отведя воду навсегда, прежде чем взлететь и вернуться к звездам."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:24:role:1",
            "title": "Возничий, Арайда",
            "text": "СИЛ 16, ЯСН 7, ДУХ 18, 9ЗЩ Б3 (Изумрудная кожа и броня) Жезл метеоров (2d8 тяж., раненные цели улетают на d6 Гексов, получая еще d6 урона) Стремится отомстить за все обиды тем, кто обидел его или приятных ему людей."
          },
          {
            "id": "mb.myth:24:role:2",
            "title": "Колесница",
            "text": "5ЗЩ Б2 (структура) 2d12 сбиванием, ничто ее не остановит"
          },
          {
            "id": "mb.myth:24:role:3",
            "title": "Тигры, Фреко и Парафуса",
            "text": "СИЛ 15, ЯСН 15, ДУХ 5, 6ЗЩ Рвут и мечут (2d8), быстрее любого коня Ненавидят коней, боятся зеркал."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:24:omen:1",
            "ordinal": 1,
            "text": "Stars are visible even by day, forming a wheel pattern that visibly turns."
          },
          {
            "id": "mb.myth:24:omen:2",
            "ordinal": 2,
            "text": "An enormous crater, a stone outpost reduced to rubble. Heavy footprints lie within."
          },
          {
            "id": "mb.myth:24:omen:3",
            "ordinal": 3,
            "text": "A grieving family claims that two enormous tigers attacked their farm, eating chickens, sheep, and a dog. They insist the beasts fell from the sky and vanished back into it after dark."
          },
          {
            "id": "mb.myth:24:omen:4",
            "ordinal": 4,
            "text": "A swathe has been cut through a forest or mountain. It leads to the Myth's hex."
          },
          {
            "id": "mb.myth:24:omen:5",
            "ordinal": 5,
            "text": "The Chariot rides towards the horizon, drawn by two enormous tigers. The Charioteer recounts his past victories, gathering followers to bolster his ego. He seeks revenge on the ruler of the nearest Holding for a slight offence."
          },
          {
            "id": "mb.myth:24:omen:6",
            "ordinal": 6,
            "text": "The Charioteer prepares to prove a boast that somebody has doubted, heading against either the current or the tide to demonstrate that mere water cannot match the Chariot. He succeeds, permanently diverting the water before taking flight and returning to the stars."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:24:role:1",
            "title": "The Charioteer, Arayda",
            "text": "VIG 16, CLA 7, SPI 18, 9GD\nA3 (emerald skin and armour)\nMeteor rod (2d8 hefty, Wounded targets fly d6 hexes away, taking another d6 damage)\nSeeks revenge for every offence against himself or people he likes."
          },
          {
            "id": "mb.myth:24:role:2",
            "title": "The Chariot",
            "text": "5GD\nA2 (structure)\n2d12 trample, nothing can stop it"
          },
          {
            "id": "mb.myth:24:role:3",
            "title": "Tigers, Frecko and Parafusa",
            "text": "VIG 15, CLA 15, SPI 5, 6GD\nRend and tear (2d8), faster than any horse\nHate horses, fear mirrors."
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:25",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 79,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:25:omen:1",
            "ordinal": 1,
            "text": "Ветер приносит внезапную пылевую бурю. Видимость практически нулевая, путешествия невозможны. К ночи буря стихает."
          },
          {
            "id": "mb.myth:25:omen:2",
            "ordinal": 2,
            "text": "Фермер смотрит в ясное небо. Утверждает, что воздух слишком неподвижен. Пока Миф не будет разрешен, дождя не будет, земля постепенно высыхает, реки начинают мелеть."
          },
          {
            "id": "mb.myth:25:omen:3",
            "ordinal": 3,
            "text": "Маслянистые грифы кружат над головой, а группа охотников внизу притворяется мертвыми, пытаясь поймать и съесть их. Эти птицы обычно встречаются только в бесплодных пустошах."
          },
          {
            "id": "mb.myth:25:omen:4",
            "ordinal": 4,
            "text": "Бестелесный глаз парит в воздухе, наблюдая за рыцарями. Если его коснуться, он обращается в пыль. Ведьма заметила их."
          },
          {
            "id": "mb.myth:25:omen:5",
            "ordinal": 5,
            "text": "Высохший ручей, серая пыль плывет против течения к скалистому логову пылевой ведьмы."
          },
          {
            "id": "mb.myth:25:omen:6",
            "ordinal": 6,
            "text": "В своем логове пылевая ведьма выпускает пустыню во всей ее силе. Каждый Гекс в радиусе 3 гексов от Мифа теперь становится пустыней, пока она жива."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:25:role:1",
            "title": "Хитрые охотники, Идон, Фрит, Бурхоу",
            "text": "СИЛ 10, ЯСН 13, ДУХ 7, 3ЗЩ Короткий лук (d6), кровь свиньи, котелок"
          },
          {
            "id": "mb.myth:25:role:2",
            "title": "Маслянистый гриф, Граймкроу",
            "text": "СИЛ 7, ЯСН 14, ДУХ 2, 2ЗЩ Клюв (d8), маслянистая шкура (любое оружие, которое ранит это существо, уменьшает свою кость на одну категорию. Это можно исправить с помощью алкоголя.)"
          },
          {
            "id": "mb.myth:25:role:3",
            "title": "Пылевая ведьма, изгой из Будущего",
            "text": "СИЛ 8, ЯСН 13, ДУХ 11, 13ЗЩ Когти (2d6), пылевая завеса (дальние атаки Ослаблены), пылевой кол (d4, любой раненный обращается в пыль, пока ведьма не умрет). Во власти прихотей (см. ниже). НЕ провидец. Ненавидит любое их упоминание."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:25:omen:1",
            "ordinal": 1,
            "text": "The wind brings a sudden dust storm. Visibility is almost zero, and travel is impossible. The storm subsides by nightfall."
          },
          {
            "id": "mb.myth:25:omen:2",
            "ordinal": 2,
            "text": "A farmer stares at the clear sky. Claims the air is too still. Until the Myth is resolved, no rain falls, the land gradually dries, and rivers begin to dwindle."
          },
          {
            "id": "mb.myth:25:omen:3",
            "ordinal": 3,
            "text": "Oily buzzards circle overhead while a group of hunters below play dead, trying to catch and eat them. These birds are normally found only in barren wastes."
          },
          {
            "id": "mb.myth:25:omen:4",
            "ordinal": 4,
            "text": "A disembodied eye floats in the air, watching the Knights. It turns to dust if touched. The Hag has noticed them."
          },
          {
            "id": "mb.myth:25:omen:5",
            "ordinal": 5,
            "text": "A dry streambed, grey dust drifting upstream towards the Dust Hag's rocky lair."
          },
          {
            "id": "mb.myth:25:omen:6",
            "ordinal": 6,
            "text": "In her lair, the Dust Hag unleashes the desert's full power. Every hex within 3 hexes of the Myth becomes desert for as long as she lives."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:25:role:1",
            "title": "Crafty Hunters, Eadon, Frith, Burhow",
            "text": "VIG 10, CLA 13, SPI 7, 3GD\nShortbow (d6), pig blood, cooking pot"
          },
          {
            "id": "mb.myth:25:role:2",
            "title": "Oily buzzard, Grimecrow",
            "text": "VIG 7, CLA 14, SPI 2, 2GD\nBeak (d8), oily hide (any weapon that Wounds this creature has its die reduced by one size. Alcohol can reverse this)."
          },
          {
            "id": "mb.myth:25:role:3",
            "title": "The Dust Hag, Exiled from Tomorrow",
            "text": "VIG 8, CLA 13, SPI 11, 13GD\nClaws (2d6), dust veil (ranged attacks are Impaired), dust stake (d4, anyone Wounded turns to dust until the Hag dies).\nRuled by whims (see below). NOT a Seer. Hates any mention of them."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. ниже» в роли 3; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "The \"see below\" reference in role 3 points to material outside the extracted Omens and Roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:26",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 81,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:26:omen:1",
            "ordinal": 1,
            "text": "Монахи в мехах молятся Горе, разбрасывая камни, воду и угли, предупреждая, что только достойные могут взойти."
          },
          {
            "id": "mb.myth:26:omen:2",
            "ordinal": 2,
            "text": "Гора видна на горизонте. Стая из четырех скальных кошек спустилась, раскладывая драгоценные камни как приманку."
          },
          {
            "id": "mb.myth:26:omen:3",
            "ordinal": 3,
            "text": "Тень Горы покрывает Королевство большую часть дня. Животные беспокойны, урожай страдает от недостатка света."
          },
          {
            "id": "mb.myth:26:omen:4",
            "ordinal": 4,
            "text": "Семь всадников на павлинах уверены, что их павлины настолько великолепны, что природа просто поддается им. Они ошибаются."
          },
          {
            "id": "mb.myth:26:omen:5",
            "ordinal": 5,
            "text": "Два оруженосца вернулись с вершины, их рыцари убиты скальными кошками, которым они отомстили. Они направляются к ближайшему Уделу за рыцарским званием."
          },
          {
            "id": "mb.myth:26:omen:6",
            "ordinal": 6,
            "text": "На вершине горы голос спрашивает: «Ты достоин?». Ответившие «Да» видят краткое видение сияющего города, которое исчезает c горизонта после спуска."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:26:role:1",
            "title": "Сама Гора",
            "text": "Черные утесы, белый пик. Поход к ней ощущается, как подъем, вызывая потерю d6 СИЛ."
          },
          {
            "id": "mb.myth:26:role:2",
            "title": "Всадники на павлинах, Кастиан и отряд",
            "text": "СИЛ 10, ЯСН 7, ДУХ 13, 4ЗЩ Б2 (яркий щит и высокий шлем) Легкое копье (d8 тяжелое), щит (d4) Ездовой павлин (СИЛ 7, ЯСН 6, ДУХ 6, 5ЗЩ)"
          },
          {
            "id": "mb.myth:26:role:3",
            "title": "Скальная кошка, Камнеязыкая, Жаднотигрица",
            "text": "СИЛ 8, ЯСН 17, ДУХ 6, 4ЗЩ Когти (2d6), рот полон самоцветов для приманки"
          },
          {
            "id": "mb.myth:26:role:4",
            "title": "Скорбящие оруженосцы, Эннад, Меррин",
            "text": "СИЛ 7, ЯСН 8, ДУХ 6, 5ЗЩ Б1 (щит) Короткий меч (2d6), щит (d4)"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:26:omen:1",
            "ordinal": 1,
            "text": "Monks in furs pray to the Mountain, scattering stones, water, and embers, warning that only the worthy may ascend."
          },
          {
            "id": "mb.myth:26:omen:2",
            "ordinal": 2,
            "text": "The Mountain is visible on the horizon. A pack of four crag cats has descended, laying out gemstones as bait."
          },
          {
            "id": "mb.myth:26:omen:3",
            "ordinal": 3,
            "text": "The Mountain's shadow covers the Realm for most of the day. Animals are restless, and crops suffer from lack of light."
          },
          {
            "id": "mb.myth:26:omen:4",
            "ordinal": 4,
            "text": "Seven peacock riders are certain their peacocks are so magnificent that nature simply yields to them. They are wrong."
          },
          {
            "id": "mb.myth:26:omen:5",
            "ordinal": 5,
            "text": "Two squires have returned from near the summit. Their Knights were killed by crag cats, whom the squires avenged. They head to the nearest Holding to be knighted."
          },
          {
            "id": "mb.myth:26:omen:6",
            "ordinal": 6,
            "text": "At the mountain's summit a voice asks, \"Are you worthy?\" Those who answer \"Yes\" see a brief vision of a shining city, which vanishes from the horizon after they descend."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:26:role:1",
            "title": "The Mountain itself",
            "text": "Black cliffs, white peak. Travelling towards it feels like climbing, causing d6 VIG loss."
          },
          {
            "id": "mb.myth:26:role:2",
            "title": "Peacock riders, Castian and company",
            "text": "VIG 10, CLA 7, SPI 13, 4GD\nA2 (bright shield and tall helm)\nLight lance (d8 hefty), shield (d4)\nRiding peacock (VIG 7, CLA 6, SPI 6, 5GD)"
          },
          {
            "id": "mb.myth:26:role:3",
            "title": "Crag cat, Gemtongue, Gluttontiger",
            "text": "VIG 8, CLA 17, SPI 6, 4GD\nClaws (2d6), mouth full of gemstones for bait"
          },
          {
            "id": "mb.myth:26:role:4",
            "title": "Grieving squires, Ennad, Merryn",
            "text": "VIG 7, CLA 8, SPI 6, 5GD\nA1 (shield)\nShortsword (2d6), shield (d4)"
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:27",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 83,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:27:omen:1",
            "ordinal": 1,
            "text": "В небе появляется зеленая звезда, ярче всех остальных, медленно плывущая по небу."
          },
          {
            "id": "mb.myth:27:omen:2",
            "ordinal": 2,
            "text": "Лучник лежит на плоском камне. Светлые лучи падают со Звезды на Королевство."
          },
          {
            "id": "mb.myth:27:omen:3",
            "ordinal": 3,
            "text": "Шпили тусклого металла, вбитые в землю, образуют барьер, преграждающий путь в направлении Мифа. Приближение к барьеру вызывает сильную боль, а прорыв сквозь него наносит d12 Урона, игнорируя броню и другую защиту."
          },
          {
            "id": "mb.myth:27:omen:4",
            "ordinal": 4,
            "text": "Серебряный шпиль, патрулируемый ходячей башней на птичьих ногах. Вокруг центрального шпиля медленно растут меньшие шпили."
          },
          {
            "id": "mb.myth:27:omen:5",
            "ordinal": 5,
            "text": "Толпа из двадцати крестьян, сопровождаемых тремя ходячими башнями. Их ведут к Гексу с Мифом, чтобы скормить красному шпилю, который там растет."
          },
          {
            "id": "mb.myth:27:omen:6",
            "ordinal": 6,
            "text": "Беспомощных крестьян заталкивают в отверстие у основания высокой серебряной башни. Пять ходячих башен охраняют их. Когда все окажутся внутри, шпиль начинает сиять ослепительным светом, а затем с пронзительным визгом возвращается к зеленой звезде. Звезда тускнеет."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:27:role:1",
            "title": "Ходячая башня, страж со Звезды",
            "text": "СИЛ 18, ЯСН 12, ДУХ 3, 7ЗЩ Б4, считать постройкой (стены звездного железа) Сокрушающие когти (2d10) или разряды звездного света (3d8 или d10 взрыв) Управляется изнутри существом. Странное поведение (см.ниже)."
          },
          {
            "id": "mb.myth:27:role:2",
            "title": "Существа со Звезды",
            "text": "СИЛ 5, ЯСН 13, ДУХ 6, 2ЗЩ Звездное копье (2d10, тяжелое), желейное тело"
          },
          {
            "id": "mb.myth:27:role:3",
            "title": "Наемный лучник, Арая",
            "text": "СИЛ 13, ЯСН 11, ДУХ 10, 1ЗЩ Б2 (кольчуга, шлем) Длинный лук (d8, медленный), топорик (d6) Без работы, винит всех, кроме себя, хочет хорошей войны."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:27:omen:1",
            "ordinal": 1,
            "text": "A green star appears, brighter than all the others, drifting slowly across the sky."
          },
          {
            "id": "mb.myth:27:omen:2",
            "ordinal": 2,
            "text": "An archer lies on a flat stone. Bright rays fall from the Star onto the Realm."
          },
          {
            "id": "mb.myth:27:omen:3",
            "ordinal": 3,
            "text": "Spires of dull metal driven into the ground form a barrier, blocking travel towards the Myth. Approaching the barrier causes intense pain, and breaking through inflicts d12 damage, ignoring armour and other protection."
          },
          {
            "id": "mb.myth:27:omen:4",
            "ordinal": 4,
            "text": "A silver spire patrolled by a walking tower on bird legs. Smaller spires slowly grow around the central one."
          },
          {
            "id": "mb.myth:27:omen:5",
            "ordinal": 5,
            "text": "A crowd of twenty peasants, escorted by three walking towers. They are being led to the Myth's hex to be fed to the red spire growing there."
          },
          {
            "id": "mb.myth:27:omen:6",
            "ordinal": 6,
            "text": "Helpless peasants are pushed into an opening at the base of a tall silver tower. Five walking towers guard them. When everyone is inside, the spire shines with blinding light, then returns to the green star with a piercing shriek. The Star dims."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:27:role:1",
            "title": "Walking tower, guardian from the Star",
            "text": "VIG 18, CLA 12, SPI 3, 7GD\nA4, counts as a structure (star-iron walls)\nCrushing claws (2d10) or starlight blasts (3d8 or d10 blast)\nControlled by a being inside. Strange behaviour (see below)."
          },
          {
            "id": "mb.myth:27:role:2",
            "title": "Beings from the Star",
            "text": "VIG 5, CLA 13, SPI 6, 2GD\nStarlit spear (2d10 hefty), jelly body"
          },
          {
            "id": "mb.myth:27:role:3",
            "title": "Mercenary archer, Araya",
            "text": "VIG 13, CLA 11, SPI 10, 1GD\nA2 (mail, helm)\nLongbow (d8 slow), hatchet (d6)\nOut of work, blames everyone but herself, wants a good war."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см.ниже» в роли 1; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "The \"see below\" reference in role 1 points to material outside the extracted Omens and Roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:28",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 85,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:28:omen:1",
            "ordinal": 1,
            "text": "Поле золотых цветов, на которых яркие кроты жуют стебли. Солнце кажется особенно ярким, даже выглядывает над горизонтом ночью."
          },
          {
            "id": "mb.myth:28:omen:2",
            "ordinal": 2,
            "text": "Пара бродяг, живущих собирательством, несет корзину фруктов. Восхваляют Солнце за особо богатый урожай. Сразу бегут от рыцарей."
          },
          {
            "id": "mb.myth:28:omen:3",
            "ordinal": 3,
            "text": "Солнце поднимается на новые высоты и больше не заходит, пока Миф не разрешится. Каждый раз, когда вы прибываете в поселение, бросьте на новое благословение Солнца (см. напротив)."
          },
          {
            "id": "mb.myth:28:omen:4",
            "ordinal": 4,
            "text": "Тенистый грот, внутри спорят 5 налетчиков. Разочарованы, что больше не могут совершать набеги ночью. Они планируют жестокую атаку на ближайший Удел."
          },
          {
            "id": "mb.myth:28:omen:5",
            "ordinal": 5,
            "text": "Засуха. Колодцы пересыхают, земля черствеет, реки умирают. Солнце не приносит благословений, только проклятия."
          },
          {
            "id": "mb.myth:28:omen:6",
            "ordinal": 6,
            "text": "Солнце раздувается, затем опускается на Королевство в форме Пирующего, колоссального золотого человека. Он прыжками движется по Королевству, поедая все, что растет. Боится животных, но не людей."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:28:role:1",
            "title": "Солнце, в облике Пирующего",
            "text": "СИЛ 18, ЯСН 5, ДУХ 10, 4ЗЩ Б6 (колоссальное тело) Сокрушает (2d12 или d12 взрыв) Хочет съесть все посевы. Боится животных."
          },
          {
            "id": "mb.myth:28:role:2",
            "title": "Яркий крот, сияющий нос",
            "text": "СИЛ 3, ЯСН 13, ДУХ 2, 3ЗЩ Светится приятно, когда ест, ненавидит все, чего не знает."
          },
          {
            "id": "mb.myth:28:role:3",
            "title": "Налетчики, Опал и отряд",
            "text": "СИЛ 12, ЯСН 12, ДУХ 7, 3ЗЩ Топорик (d6), лук (d6 длинный), краденные безделушки"
          },
          {
            "id": "mb.myth:28:role:4",
            "title": "Пара бродяг, Харнис и Рашль",
            "text": "СИЛ 9, ЯСН 14, ДУХ 12, 2ЗЩ Кинжал (d6), праща (d6), не доверяют рыцарям"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:28:omen:1",
            "ordinal": 1,
            "text": "A field of golden flowers, with moles-a-brightly chewing the stems. The Sun seems especially bright, even peeking above the horizon at night."
          },
          {
            "id": "mb.myth:28:omen:2",
            "ordinal": 2,
            "text": "A pair of foraging vagabonds carry a basket of fruit. They praise the Sun for a particularly rich harvest. Immediately flee from Knights."
          },
          {
            "id": "mb.myth:28:omen:3",
            "ordinal": 3,
            "text": "The Sun rises to new heights and no longer sets until the Myth is resolved. Each time you arrive at a settlement, roll for a new blessing of the Sun (see opposite)."
          },
          {
            "id": "mb.myth:28:omen:4",
            "ordinal": 4,
            "text": "A shady grotto, 5 raiders arguing inside. Frustrated that they can no longer raid at night. They plan a brutal attack on the nearest Holding."
          },
          {
            "id": "mb.myth:28:omen:5",
            "ordinal": 5,
            "text": "Drought. Wells dry up, the earth hardens, and rivers die. The Sun brings no blessings, only curses."
          },
          {
            "id": "mb.myth:28:omen:6",
            "ordinal": 6,
            "text": "The Sun swells, then descends onto the Realm as the Feaster, a colossal golden man. He bounds across the Realm, eating everything that grows. Fears animals, but not people."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:28:role:1",
            "title": "The Sun, in the form of the Feaster",
            "text": "VIG 18, CLA 5, SPI 10, 4GD\nA6 (colossal body)\nCrush (2d12 or d12 blast)\nWants to eat every crop. Fears animals."
          },
          {
            "id": "mb.myth:28:role:2",
            "title": "Mole-a-Brightly, Blazenose",
            "text": "VIG 3, CLA 13, SPI 2, 3GD\nGlows pleasantly while eating, hates everything it does not know."
          },
          {
            "id": "mb.myth:28:role:3",
            "title": "Raiders, Opal and company",
            "text": "VIG 12, CLA 12, SPI 7, 3GD\nHatchet (d6), bow (d6 long), stolen trinkets"
          },
          {
            "id": "mb.myth:28:role:4",
            "title": "Vagabond pair, Harnis and Raschle",
            "text": "VIG 9, CLA 14, SPI 12, 2GD\nDagger (d6), sling (d6), distrust Knights"
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. напротив» в знамении 3; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "The \"see opposite\" reference in omen 3 points to material outside the extracted Omens and Roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:29",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 87,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:29:omen:1",
            "ordinal": 1,
            "text": "На крутом склоне пожилая женщина собирает шипы. Утверждает, что они отпугивают Когтя, который может забрать очередную жертву в любую ночь."
          },
          {
            "id": "mb.myth:29:omen:2",
            "ordinal": 2,
            "text": "Луна нависает острым серпом. Как только наступает ночь, Коготь начинает визжать из темноты. Он атакует только если заметит уязвимую цель."
          },
          {
            "id": "mb.myth:29:omen:3",
            "ordinal": 3,
            "text": "Ярые гуляки танцуют вокруг идола зверя. Они ломают кости животных и людей о каменный тотем, чтобы удержать Костолома на расстоянии еще одну ночь."
          },
          {
            "id": "mb.myth:29:omen:4",
            "ordinal": 4,
            "text": "Луна нависает, большая и искаженная. Как только наступает ночь, Костолом внезапно наносит удар без предупреждения."
          },
          {
            "id": "mb.myth:29:omen:5",
            "ordinal": 5,
            "text": "Взъерошенный мудрец пытается успокоить паникующую толпу. Он сокрушается, что у них нет рептилий для жертвоприношения, традиции, призванной защитить от Кровососа, поэтому люди должны вооружиться и запереть свои двери."
          },
          {
            "id": "mb.myth:29:omen:6",
            "ordinal": 6,
            "text": "Луна нависает, тусклая и бледная. Как только наступает ночь, Кровосос наносит удар, когда Рыцари менее всего готовы."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:29:role:1",
            "title": "Коготь, черный лобстер из леса",
            "text": "СИЛ 14, ЯСН 14, ДУХ 5, 6ЗЩ Б2 (панцирь), секущие клешни (2d10) Боится шипов и крапивы. Хочет утащить кого-то во тьму ночи."
          },
          {
            "id": "mb.myth:29:role:2",
            "title": "Костолом, сила без мозгов",
            "text": "СИЛ 19, ЯСН 3, ДУХ 3, 5ЗЩ Б3 (бессмертное тело), крушит и ломает (2d10) Боится чистых костей. Хочет сокрушить слабых."
          },
          {
            "id": "mb.myth:29:role:3",
            "title": "Кровосос, волк на двух ногах, король голода, Эсвед",
            "text": "СИЛ 12, ЯСН 17, ДУХ 15, 14ЗЩ Когти и клыки (2d8, +d10 ночью) Боится холодной крови. Хочет испить сильной крови."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:29:omen:1",
            "ordinal": 1,
            "text": "On a steep scrubland slope, an old woman gathers thorns. Claims they keep the Claw away, which might take another victim on any night."
          },
          {
            "id": "mb.myth:29:omen:2",
            "ordinal": 2,
            "text": "The Moon hangs as a sharp crescent. As soon as night falls, the Claw begins shrieking from the darkness. It attacks only if it spots a vulnerable target."
          },
          {
            "id": "mb.myth:29:omen:3",
            "ordinal": 3,
            "text": "Fervent revellers dance around a beast idol. They break animal and human bones against the stone totem to keep the Bonebreaker away for another night."
          },
          {
            "id": "mb.myth:29:omen:4",
            "ordinal": 4,
            "text": "The Moon hangs large and distorted. As soon as night falls, the Bonebreaker strikes suddenly, without warning."
          },
          {
            "id": "mb.myth:29:omen:5",
            "ordinal": 5,
            "text": "A dishevelled sage tries to calm a panicking crowd. He laments their lack of reptiles to sacrifice, a tradition intended to ward off the Bloodsucker, so people must arm themselves and lock their doors."
          },
          {
            "id": "mb.myth:29:omen:6",
            "ordinal": 6,
            "text": "The Moon hangs waning and pale. As soon as night falls, the Bloodsucker strikes when the Knights are least prepared."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:29:role:1",
            "title": "The Claw, black lobster of the woods",
            "text": "VIG 14, CLA 14, SPI 5, 6GD\nA2 (shell), slashing pincers (2d10)\nRepelled by thorns or nettles. Wants to drag someone into the dark of night."
          },
          {
            "id": "mb.myth:29:role:2",
            "title": "The Bonebreaker, Brawn o’no Brain",
            "text": "VIG 19, CLA 3, SPI 3, 5GD\nA3 (immortal body), crush and break (2d10)\nRepelled by clean bones. Wants to crush the weak."
          },
          {
            "id": "mb.myth:29:role:3",
            "title": "The Bloodsucker, Wolf that Walks on Foot, Queen of All Hungers, Esved",
            "text": "VIG 12, CLA 17, SPI 15, 14GD\nClaws and fangs (2d8, +d10 at night)\nRepelled by cold blood. Wants to drink strong blood."
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:30",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 89,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:30:omen:1",
            "ordinal": 1,
            "text": "На краю заброшенного глиняного карьера гончар лепит чашу, рассказывая историю дюжине детей, собравшихся вокруг. Она рассказывает о Льве, царе зверей. Ни один рыцарь не мог его убить, но его великим врагом был гончар. Она избегает подробностей."
          },
          {
            "id": "mb.myth:30:omen:2",
            "ordinal": 2,
            "text": "Конюхи ведут дюжину боевых коней к Престолу. Они изо всех сил пытаются заставить лошадей двигаться, так как все они склоняются в сторону Гекса Льва."
          },
          {
            "id": "mb.myth:30:omen:3",
            "ordinal": 3,
            "text": "Одинокий пруд. Щука высовывает голову из воды и хихикает на проходящих. Она не умеет говорить, но имитирует услышанные слова. Среди бессвязных фраз она кричит: «Он здесь за своей короной»."
          },
          {
            "id": "mb.myth:30:omen:4",
            "ordinal": 4,
            "text": "Все кони сбрасывают всадников на землю и скачут к Престолу, чтобы ожидать прибытия Льва."
          },
          {
            "id": "mb.myth:30:omen:5",
            "ordinal": 5,
            "text": "Лев направляется к Престолу, чтобы мирно принять власть в Домене."
          },
          {
            "id": "mb.myth:30:omen:6",
            "ordinal": 6,
            "text": "Уставший глашатай разносит весть о том, что Лев захватил Престол. Некоторые люди остаются при дворе, но в основном их заменяют неподходящие звери."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:30:role:1",
            "title": "Лев, Беллиор, король всех зверей",
            "text": "СИЛ 18, ЯСН 12, ДУХ 15, 10ЗЩ Б2 (крепкая шкура, густая грива) Когти и челюсти (2d8 +d10 против людей) Рык (все, кто не преклоняются, теряют d6 ДУХ) Все звери склоняются перед ним, но он их презирает. Ненавидит звук колес, боится огня, петухов и любых жалящих существ. Даже капля слабого яда смертельна для Льва. Может говорить, но презирает необходимость делать это."
          },
          {
            "id": "mb.myth:30:role:2",
            "title": "Гончар-рассказчик, Ньефиб",
            "text": "СИЛ 10, ЯСН 14, ДУХ 18, 2ЗЩ Б1 (слой за слоем плащей и пальто) Всегда окружена толпой невыносимых детей."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:30:omen:1",
            "ordinal": 1,
            "text": "At the edge of an abandoned clay pit, a potter shapes a bowl while telling a story to a dozen children gathered around her. She tells of the Lion, king of beasts. No Knight could kill him, but his great enemy was a potter. She avoids the details."
          },
          {
            "id": "mb.myth:30:omen:2",
            "ordinal": 2,
            "text": "Horse breeders lead a dozen warhorses to the Seat. They struggle to make the horses move, as all bow towards the Lion's hex."
          },
          {
            "id": "mb.myth:30:omen:3",
            "ordinal": 3,
            "text": "A secluded pond. A pike pokes its head above the water and giggles at passers-by. It cannot speak, but imitates words it hears. Among its disjointed phrases, it cries, \"He is here for his crown.\""
          },
          {
            "id": "mb.myth:30:omen:4",
            "ordinal": 4,
            "text": "Every horse throws its rider to the ground and gallops to the Seat to await the Lion's arrival."
          },
          {
            "id": "mb.myth:30:omen:5",
            "ordinal": 5,
            "text": "The Lion heads to the Seat to peacefully assume power over the Domain."
          },
          {
            "id": "mb.myth:30:omen:6",
            "ordinal": 6,
            "text": "A weary herald spreads news that the Lion has taken the Seat. Some humans remain at court, but most are replaced by unsuitable beasts."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:30:role:1",
            "title": "The Lion, Belliore, king of all beasts",
            "text": "VIG 18, CLA 12, SPI 15, 10GD\nA2 (tough hide, thick mane)\nClaws and jaws (2d8, +d10 against humans)\nRoar (all who do not bow lose d6 SPI)\nEvery beast bows before him, but he despises them. Hates the sound of wheels, fears fire, cockerels, and all stinging creatures. Even a drop of weak poison is fatal to the Lion. Can speak, but despises having to do so."
          },
          {
            "id": "mb.myth:30:role:2",
            "title": "Storytelling potter, Niefib",
            "text": "VIG 10, CLA 14, SPI 18, 2GD\nA1 (layers upon layers of cloaks and coats)\nAlways surrounded by a crowd of unbearable children."
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:31",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 91,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:31:omen:1",
            "ordinal": 1,
            "text": "С резким порывом стонущего ветра внезапно начинается следующий Сезон."
          },
          {
            "id": "mb.myth:31:omen:2",
            "ordinal": 2,
            "text": "Ветер вновь стонет. На следующее утро приходит новый Сезон, пропуская следующий по очереди и переходя сразу к последующему Сезону. Птицы кричат и плачут."
          },
          {
            "id": "mb.myth:31:omen:3",
            "ordinal": 3,
            "text": "Внезапно начинается следующий Сезон. Молочные овсянки поют не в сезон, выбрасывая свои наполненные молоком яйца из гнезд, и те разбиваются о землю."
          },
          {
            "id": "mb.myth:31:omen:4",
            "ordinal": 4,
            "text": "Следующий Сезон пропускается, и внезапно начинается последующий Сезон. Серая гадюка, шипя с ближайшей ветки, манит Рыцарей к себе. Она прошипит «Колесо сломано», прежде чем укусить любого, кто задержится."
          },
          {
            "id": "mb.myth:31:omen:5",
            "ordinal": 5,
            "text": "Неожиданно наступает особенно суровая Зима, которая не закончится, пока Колесо не будет отремонтировано. Над Гексом Колеса образуется воронка облаков, вращающаяся с неровным, прерывистым ритмом."
          },
          {
            "id": "mb.myth:31:omen:6",
            "ordinal": 6,
            "text": "Колесо исчезает. Теперь его можно найти лишь в далеком Королевстве. (см. напротив)."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:31:role:1",
            "title": "Колесо сезонов",
            "text": "Деревянное колесо на каменном пьедестале. Должно вращаться со сменой сезонов, но тормозит. Требует смазки смесью пыльцы, зерна и снега."
          },
          {
            "id": "mb.myth:31:role:2",
            "title": "Страж Колеса, Хьюгол",
            "text": "СИЛ 18, ЯСН 8, ДУХ 8, 10ЗЩ Б3 (кольчуга, золотые латы, шлем) Секира (2d10 длинное). Может быть поднято только верным стражем Колеса. Владеет Отрицанием. Не может представить, чтобы Колесо не работало."
          },
          {
            "id": "mb.myth:31:role:3",
            "title": "Серая гадюка",
            "text": "СИЛ 6, ЯСН 18, ДУХ 5, 4ЗЩ Укус (d6, отравляет при Ранении, жертва не может говорить, пока змея ее не простит)."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:31:omen:1",
            "ordinal": 1,
            "text": "With a sharp gust of moaning wind, the next Season suddenly begins."
          },
          {
            "id": "mb.myth:31:omen:2",
            "ordinal": 2,
            "text": "The wind moans again. A new Season arrives the next morning, skipping the next in sequence and moving straight to the one after it. Birds shriek and cry."
          },
          {
            "id": "mb.myth:31:omen:3",
            "ordinal": 3,
            "text": "The next Season suddenly begins. Milk finches sing out of season, throwing their milk-filled eggs from their nests to break on the ground."
          },
          {
            "id": "mb.myth:31:omen:4",
            "ordinal": 4,
            "text": "The next Season is skipped, and the following one suddenly begins. A grey adder hisses from a nearby branch, beckoning the Knights. It hisses, \"The Wheel is broken,\" before biting anyone who lingers."
          },
          {
            "id": "mb.myth:31:omen:5",
            "ordinal": 5,
            "text": "A particularly harsh Winter arrives unexpectedly and will not end until the Wheel is repaired. A funnel of clouds forms above the Wheel's hex, turning in an uneven, broken rhythm."
          },
          {
            "id": "mb.myth:31:omen:6",
            "ordinal": 6,
            "text": "The Wheel disappears. It can now be found only in a distant Realm (see opposite)."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:31:role:1",
            "title": "The Wheel of Seasons",
            "text": "A wooden wheel on a stone pedestal. Should turn with the changing Seasons, but is slowing. Needs greasing with a mixture of pollen, grain, and snow."
          },
          {
            "id": "mb.myth:31:role:2",
            "title": "Guardian of the Wheel, Hewgol",
            "text": "VIG 18, CLA 8, SPI 8, 10GD\nA3 (mail, gold plate, helm)\nGreataxe (2d10 long). Can be lifted only by a sworn guardian of the Wheel.\nCan Deny. Cannot imagine the Wheel failing to work."
          },
          {
            "id": "mb.myth:31:role:3",
            "title": "Grey adder",
            "text": "VIG 6, CLA 18, SPI 5, 4GD\nBite (d6, poisons on a Wound; the victim cannot speak until forgiven by a snake)."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. напротив» в знамении 6; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "The \"see opposite\" reference in omen 6 points to material outside the extracted Omens and Roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:32",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 93,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:32:omen:1",
            "ordinal": 1,
            "text": "Скромная башня, одинокий страж охраняет мелкую герцогиню. Она одержима сном и сновидениями. Страж хочет отправиться на поиски Дубины, но нуждается в ком-то, кто присмотрит за башней в его отсутствие. Он знает, что поблизости живет ястребица, и такое оружие манит ее."
          },
          {
            "id": "mb.myth:32:omen:2",
            "ordinal": 2,
            "text": "Труп белого быка лежит изуродованный, но нетронутый. Спустя мгновение из него вырывается рой когтистых пчел."
          },
          {
            "id": "mb.myth:32:omen:3",
            "ordinal": 3,
            "text": "Ястребица бродит в тенях и кружит в небе, надеясь развлечься с рыцарями, если удастся изолировать одного"
          },
          {
            "id": "mb.myth:32:omen:4",
            "ordinal": 4,
            "text": "Заговорщицкий еж следит за рыцарями, надеясь украсть Дубину для себя."
          },
          {
            "id": "mb.myth:32:omen:5",
            "ordinal": 5,
            "text": "Стражник-трус верит, что держит Дубину. На самом деле это просто ветка (d6 тяжелое)."
          },
          {
            "id": "mb.myth:32:omen:6",
            "ordinal": 6,
            "text": "Наконец, истинная Дубина (d10 тяжелое, владелец знает местоположение каждого врага в своем сердце, но никогда не может остановить бой, пока враг не убит), вонзенная в плиту из неразрушимого зеленого мрамора. Освобождается только для того, кто честно намерен уничтожить ее."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:32:role:1",
            "title": "Рой когтистых пчел, Войско",
            "text": "СИЛ 5, ЯСН 3, ДУХ 3, 3ЗЩ Когти и жала (d6, раны гниют, выпуская еще пчел на следующий день)"
          },
          {
            "id": "mb.myth:32:role:2",
            "title": "Заговорщицкий еж, Верипса, хитрый нос",
            "text": "СИЛ 7, ЯСН 17, ДУХ 7, 2ЗЩ Б2 (иголки, атакующие в ближнем бою без длинного оружия получают d4 урона), укус (d6) Размером с кабана. Что-то замышляет (см. ниже). Из иголок можно сделать дюжину стрел (+d6), которые бьют бесшумно и исчезают."
          },
          {
            "id": "mb.myth:32:role:3",
            "title": "Ястребица, кошка небес",
            "text": "СИЛ 15, ЯСН 15, ДУХ 7, 9ЗЩ Б1 (мускулистая шкура), наскок (2d8), крылья Хочет играться с добычей. Жаждет получить Дубину. Пепел ее перьев отпугивает и птиц, и кошек."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:32:omen:1",
            "ordinal": 1,
            "text": "A modest tower, a lone guard protecting a minor duchess. She is obsessed with sleep and dreams. The guard wants to seek the Cudgel, but needs someone to watch the tower while he is away. He knows a hawkleon lives nearby and is drawn to such a weapon."
          },
          {
            "id": "mb.myth:32:omen:2",
            "ordinal": 2,
            "text": "The corpse of a large white ox lies mutilated but uneaten, twitching. A moment later, a swarm of clawed bees bursts from it."
          },
          {
            "id": "mb.myth:32:omen:3",
            "ordinal": 3,
            "text": "The hawkleon prowls in the shadows and circles in the sky, hoping to toy with the Knights if she can isolate one."
          },
          {
            "id": "mb.myth:32:omen:4",
            "ordinal": 4,
            "text": "A plotting hedgehog follows the Knights, hoping to steal the Cudgel for itself."
          },
          {
            "id": "mb.myth:32:omen:5",
            "ordinal": 5,
            "text": "A cowardly guard believes he holds the Cudgel. It is really just a branch (d6 hefty)."
          },
          {
            "id": "mb.myth:32:omen:6",
            "ordinal": 6,
            "text": "At last, the true Cudgel (d10 hefty; its bearer knows the location of every enemy in their heart, but can never stop a fight until the enemy is dead), driven into a huge slab of indestructible green marble. It releases only for someone who honestly intends to destroy it."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:32:role:1",
            "title": "Swarm of clawed bees, Warband",
            "text": "VIG 5, CLA 3, SPI 3, 3GD\nClaws and stings (d6, wounds rot, releasing more bees the next day)"
          },
          {
            "id": "mb.myth:32:role:2",
            "title": "Scheming Hedgehog, Verispa, Slysnout",
            "text": "VIG 7, CLA 17, SPI 7, 2GD\nA2 (spines; melee attackers without long weapons take d4 damage), bite (d6)\nBoar-sized. Plotting something (see below). Its spines can make a dozen arrows (+d6) that strike silently and disappear."
          },
          {
            "id": "mb.myth:32:role:3",
            "title": "Hawkleon, cat of the skies",
            "text": "VIG 15, CLA 15, SPI 7, 9GD\nA1 (muscular hide), pounce (2d8), wings\nWants to toy with prey. Longs to obtain the Cudgel. The ashes of her feathers repel both birds and cats."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. ниже» в роли 2; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "The \"see below\" reference in role 2 points to material outside the extracted Omens and Roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:33",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 95,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:33:omen:1",
            "ordinal": 1,
            "text": "Черный дым на горизонте. Ящер рождается из огня, слепой и растерянный. Он еще не может кусать и пытается сбежать."
          },
          {
            "id": "mb.myth:33:omen:2",
            "ordinal": 2,
            "text": "Лес обращен в пепел. Седой бандит собирает его. Он знает, что пепел, созданный Ящером — смертельный яд."
          },
          {
            "id": "mb.myth:33:omen:3",
            "ordinal": 3,
            "text": "Река, текущая как серая, насыщенная пеплом грязь. Мертвые рыбы и тритоны устилают берег. Пара рыцарских саламандр, обычно невосприимчивых ко всем токсинам, неистово мечутся в агонии."
          },
          {
            "id": "mb.myth:33:omen:4",
            "ordinal": 4,
            "text": "Огромный хвост Ящера, упавший с растущего монстра, лежит, дергаясь среди зарослей колючек. Его кровь зажигает огонь, который можно потушить только морской водой."
          },
          {
            "id": "mb.myth:33:omen:5",
            "ordinal": 5,
            "text": "Курган, где Ящер временно свил гнездо, взрывается огненной землей и пеплом (d8 урона каждый ход в пределах области). Он будет гореть до полуночи."
          },
          {
            "id": "mb.myth:33:omen:6",
            "ordinal": 6,
            "text": "Груда камней, оплавленная, стала логовом Ящера. Если позволить ему жить, она разгорается в огромный костер, который поглощает весь Гекс, рождая еще четырех Ящеров, которые уползут в соседние Королевства."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:33:role:1",
            "title": "Ящер, вечная беда земли",
            "text": "СИЛ 18, ЯСН 12, ДУХ 5, 8ЗЩ Чешуя не-цвета (игнорирует весь урон, но не защищает живот) Укус (2d10, рана превращает жертву в пепел) или удар хвостом (d8 взрыв) Горящая кровь (одна капля вызывает пожар. Только морская вода может потушить пламя)"
          },
          {
            "id": "mb.myth:33:role:2",
            "title": "Ифран, бандит-ветеран",
            "text": "СИЛ 12, ЯСН 15, ДУХ 13, 6ЗЩ А1 (черный бригантин) 2 кинжала (по d6 каждый), лук (d6) Планирует последнее большое дело (см. ниже)."
          },
          {
            "id": "mb.myth:33:role:3",
            "title": "Рыцарская саламандра, Хельмек",
            "text": "СИЛ 10, ЯСН 4, ДУХ 5, 4ЗЩ Когти и укус (d8), иммунитет к большинству ядов"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:33:omen:1",
            "ordinal": 1,
            "text": "Black smoke on the horizon. The Lizard is born from fire, blind and bewildered. It cannot yet bite and tries to escape."
          },
          {
            "id": "mb.myth:33:omen:2",
            "ordinal": 2,
            "text": "A forest reduced to ash. A grey-haired bandit gathers it. He knows the ash created by the Lizard is a deadly poison."
          },
          {
            "id": "mb.myth:33:omen:3",
            "ordinal": 3,
            "text": "A river flows as grey mud saturated with ash. Dead fish and newts line the bank. A pair of knightly salamanders, normally immune to all toxins, thrash wildly in agony."
          },
          {
            "id": "mb.myth:33:omen:4",
            "ordinal": 4,
            "text": "The Lizard's enormous tail, shed by the growing monster, lies twitching among thorn bushes. Its blood starts a fire that only seawater can extinguish."
          },
          {
            "id": "mb.myth:33:omen:5",
            "ordinal": 5,
            "text": "A barrow where the Lizard briefly nested erupts with burning earth and ash (d8 damage each Turn within the area). It burns until midnight."
          },
          {
            "id": "mb.myth:33:omen:6",
            "ordinal": 6,
            "text": "A partly melted heap of stones has become the Lizard's lair. If it is allowed to live, the heap becomes a vast blaze that consumes the whole hex, birthing four more Lizards that crawl into neighbouring Realms."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:33:role:1",
            "title": "The Lizard, eternal scourge of the land",
            "text": "VIG 18, CLA 12, SPI 5, 8GD\nScales of no-colour (ignore all damage, but do not protect the belly)\nBite (2d10, a Wound turns the victim to ash) or tail swipe (d8 blast)\nBurning blood (one drop starts a fire. Only seawater can extinguish the flames)."
          },
          {
            "id": "mb.myth:33:role:2",
            "title": "Yfran, Veteran Bandit",
            "text": "VIG 12, CLA 15, SPI 13, 6GD\nA1 (black brigandine)\n2 daggers (d6 each), bow (d6)\nPlanning one last big job (see below)."
          },
          {
            "id": "mb.myth:33:role:3",
            "title": "Knightly salamander, Helmeck",
            "text": "VIG 10, CLA 4, SPI 5, 4GD\nClaws and bite (d8), immune to most poisons"
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. ниже» в роли 2; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "The \"see below\" reference in role 2 points to material outside the extracted Omens and Roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:34",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 97,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:34:omen:1",
            "ordinal": 1,
            "text": "Снег начинает падать. Сначала порыв, затем завеса покрывает все Королевство. Видимость ограничена расстоянием крика. Это продолжается, пока Огр не умрет или не остановит это."
          },
          {
            "id": "mb.myth:34:omen:2",
            "ordinal": 2,
            "text": "Два пожилых ткача бредут в снегу. Они были пленниками в замке Огра, но он отпустил их, ибо они медленно работают."
          },
          {
            "id": "mb.myth:34:omen:3",
            "ordinal": 3,
            "text": "Огр наблюдает за Отрядом из-за снежной завесы. Он ищет Рыцаря для захвата и охраны замка. Хотя он бессмертен, не будет затягивать бой, если ранен."
          },
          {
            "id": "mb.myth:34:omen:4",
            "ordinal": 4,
            "text": "В снегу дрожит жалящий крокодил. Он приведет Рыцарей к замку и в катакомбы под ним."
          },
          {
            "id": "mb.myth:34:omen:5",
            "ordinal": 5,
            "text": "Древнее кладбище на холме, имена забыты. Некоторые знают, что душа Огра спрятана в первом черепе, похороненном здесь."
          },
          {
            "id": "mb.myth:34:omen:6",
            "ordinal": 6,
            "text": "Собрав достаточно слуг для комфортной жизни, Огр заливается грубым смехом, слышным по всему Королевству. Его неохотные Рыцари собирают налоги еженедельно, забирая больше, чем люди могут отдать."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:34:role:1",
            "title": "Огр, мерзкий самозванец",
            "text": "СИЛ 18, ЯСН 10, ДУХ 2, 8ЗЩ Б2 (узловатые мышцы), костяной нож (d8), кривой рог (d10), мерзкие наряды (см. ниже). Восстанавливается от любых повреждений, пока душа спрятана. Ненавидит чужие взгляды. Хочет жить в лени и роскоши."
          },
          {
            "id": "mb.myth:34:role:2",
            "title": "Жалящий крокодил, Нэттлснэп",
            "text": "СИЛ 10, ЯСН 5, ДУХ 5, 3ЗЩ Челюсти (d8, рана вызывает жжение и потерю d6 ДУХ). Ненавидит Огра – тот изгнал его."
          },
          {
            "id": "mb.myth:34:role:3",
            "title": "Неохотные Рыцари Огра",
            "text": "СИЛ 13, ЯСН 10, ДУХ 10, 5ЗЩ Б2 (потрепанный шлем и щит) Палица (d8 тяжелая), щит (d4) Служат только пока семьи в плену у Огра."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:34:omen:1",
            "ordinal": 1,
            "text": "Snow begins to fall. First a flurry, then a veil covers the whole Realm. Visibility is limited to shouting distance. This continues until the Ogre dies or stops it."
          },
          {
            "id": "mb.myth:34:omen:2",
            "ordinal": 2,
            "text": "Two elderly weavers trudge through the snow. They were prisoners in the Ogre's castle, but he released them because they work slowly."
          },
          {
            "id": "mb.myth:34:omen:3",
            "ordinal": 3,
            "text": "The Ogre watches the Company through the veil of snow. He seeks a Knight to capture and set to guarding his castle. Although immortal, he will not prolong a fight if hurt."
          },
          {
            "id": "mb.myth:34:omen:4",
            "ordinal": 4,
            "text": "A stinging crocodile shivers in the snow. It leads the Knights to the castle and the catacombs beneath it."
          },
          {
            "id": "mb.myth:34:omen:5",
            "ordinal": 5,
            "text": "An ancient hilltop graveyard, the names forgotten. Some know the Ogre's soul is hidden in the first skull buried here."
          },
          {
            "id": "mb.myth:34:omen:6",
            "ordinal": 6,
            "text": "Having gathered enough servants to live comfortably, the Ogre bursts into coarse laughter audible throughout the Realm. His reluctant Knights collect taxes weekly, taking more than people can afford."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:34:role:1",
            "title": "The Ogre, the Repulsive Pretender",
            "text": "VIG 18, CLA 10, SPI 2, 8GD\nA2 (knotted muscles), bone knife (d8), crooked horn (d10), foul finery (see below).\nRecovers from any injury while his soul remains hidden. Hates being looked at. Wants a life of idleness and luxury."
          },
          {
            "id": "mb.myth:34:role:2",
            "title": "Stinging crocodile, Nattlesnap",
            "text": "VIG 10, CLA 5, SPI 5, 3GD\nJaws (d8, a Wound causes burning pain and d6 SPI loss). Hates the Ogre, who drove it out."
          },
          {
            "id": "mb.myth:34:role:3",
            "title": "The Ogre's reluctant Knights",
            "text": "VIG 13, CLA 10, SPI 10, 5GD\nA2 (battered helm and shield)\nMace (d8 hefty), shield (d4)\nServe only while their families are the Ogre's prisoners."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. ниже» в роли 1; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "The \"see below\" reference in role 1 points to material outside the extracted Omens and Roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:35",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 99,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:35:omen:1",
            "ordinal": 1,
            "text": "Шесть марабу-падальщиков клюют покрытые паутиной трупы рыцаря, оруженосца и их коней."
          },
          {
            "id": "mb.myth:35:omen:2",
            "ordinal": 2,
            "text": "Временная тропа обрывается, открывая широкую сеть туннелей. Этот лабиринт ведет к Гексу Мифа, но Паук охраняет его."
          },
          {
            "id": "mb.myth:35:omen:3",
            "ordinal": 3,
            "text": "Скользящая тень в облаках, затем Отряд окутывает плотное покрывало из паутины (спасбросок СИЛ, чтобы вырваться). В следующем раунде Паук атакует, но хочет только перекусить."
          },
          {
            "id": "mb.myth:35:omen:4",
            "ordinal": 4,
            "text": "Глашатай Паука наблюдает за курганом, предупреждая путников держаться в стороне. Холм скрывает гнездо извивающихся яиц паука. Любое вмешательство вызывает Паука на защиту его детенышей."
          },
          {
            "id": "mb.myth:35:omen:5",
            "ordinal": 5,
            "text": "Глашатай Паука появляется и подзывает Отряд. Она интересуется их мастерством и, если они кажутся достойными, радостно сообщает им, что, теперь они — Добыча Паука, великая честь, например."
          },
          {
            "id": "mb.myth:35:omen:6",
            "ordinal": 6,
            "text": "Паук вырывается из-под земли. Он уже следил за Отрядом и сражается, пока не будет ранен, затем уходит под землю, чтобы вернуться, когда полностью исцелится."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:35:role:1",
            "title": "Паук, владыка охотников, Спинджек",
            "text": "СИЛ 18, ЯСН 19, ДУХ 9, 10ЗЩ Б3 (щетинистый панцирь) Укус (3d10, Рана вызывает мгновенный паралич, длящийся до рассвета) Хочет хорошей охоты. Отступает при Ране."
          },
          {
            "id": "mb.myth:35:role:2",
            "title": "Глашатай Паука, Алскип",
            "text": "СИЛ 10, ЯСН 12, ДУХ 12, 5ЗЩ Б1 (броня паучьего шелка, защищает от паутины) Меч-клык (2d6, покрыт ядом Паука) Каждый раз при встрече у нее новый паучий аспект (см. ниже)."
          },
          {
            "id": "mb.myth:35:role:3",
            "title": "Марабу-падальщик, труптица",
            "text": "СИЛ 5, ЯСН 10, ДУХ 5, 4ЗЩ Бритва-клюв (d8, игнорирует броню, прорезает любой материал). Хочет спокойно поесть."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:35:omen:1",
            "ordinal": 1,
            "text": "Six carrion storks peck at the web-covered corpses of a Knight, a squire, and their horses."
          },
          {
            "id": "mb.myth:35:omen:2",
            "ordinal": 2,
            "text": "A temporary trail breaks off, revealing a broad network of tunnels. This maze leads to the Myth's hex, but the Spider guards it."
          },
          {
            "id": "mb.myth:35:omen:3",
            "ordinal": 3,
            "text": "A gliding shadow in the clouds, then a thick blanket of web envelops the Company (VIG Save to escape). The Spider attacks next round, but only wants a snack."
          },
          {
            "id": "mb.myth:35:omen:4",
            "ordinal": 4,
            "text": "The Spider's herald watches a barrow, warning travellers to stay away. The hill hides a nest of writhing spider eggs. Any disturbance summons the Spider to defend its young."
          },
          {
            "id": "mb.myth:35:omen:5",
            "ordinal": 5,
            "text": "The Spider's herald appears and beckons the Company. She asks about their prowess and, if they seem worthy, happily announces that they are now the Spider's Prey, a great honour."
          },
          {
            "id": "mb.myth:35:omen:6",
            "ordinal": 6,
            "text": "The Spider bursts out of the ground. It has already been stalking the Company and fights until Wounded, then retreats underground to return when fully healed."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:35:role:1",
            "title": "The Spider, lord of hunters, Spinjack",
            "text": "VIG 18, CLA 19, SPI 9, 10GD\nA3 (bristly carapace)\nBite (3d10, a Wound causes instant paralysis lasting until dawn)\nWants a good hunt. Retreats when Wounded."
          },
          {
            "id": "mb.myth:35:role:2",
            "title": "The Spider's herald, Alskip",
            "text": "VIG 10, CLA 12, SPI 12, 5GD\nA1 (spider-husk armour, protects against webs)\nFang-sword (2d6, coated in the Spider's venom)\nHas a new spider aspect at every encounter (see below)."
          },
          {
            "id": "mb.myth:35:role:3",
            "title": "Carrion Stork, Cruorsnipe, Corporant",
            "text": "VIG 5, CLA 10, SPI 5, 4GD\nRazor beak (d8, ignores armour, cuts through any material). Wants to eat in peace."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. ниже» в роли 2; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "The \"see below\" reference in role 2 points to material outside the extracted Omens and Roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:36",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 101,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:36:omen:1",
            "ordinal": 1,
            "text": "Облачная Ведьма спускается с неба, обрушивая на отряд порывы ветра. Она уйдет, почувствовав себя достаточно сильной."
          },
          {
            "id": "mb.myth:36:omen:2",
            "ordinal": 2,
            "text": "Котел под пологом узловатых деревьев. Все, что окунается в него, светится тьмой. В течение остального дня этот объект будет невидим для тех, кто желает вам вреда. Если живое существо коснется варева, одна из ведьм Ковена вырывается наружу и отчитывает за вторжение."
          },
          {
            "id": "mb.myth:36:omen:3",
            "ordinal": 3,
            "text": "Садовая Ведьма бродит среди кустов, собирая улиток и поедая их. Она предлагает своих улиток, которые позволяют съевшему говорить с растениями недолгое время."
          },
          {
            "id": "mb.myth:36:omen:4",
            "ordinal": 4,
            "text": "Круг мертвых растений среди пышного поля. Растения, попавшие в круг, увядают и умирают. Садовая Ведьма посадила здесь солевой камень, вызывающий это."
          },
          {
            "id": "mb.myth:36:omen:5",
            "ordinal": 5,
            "text": "Ветер утихает. Акантрикс кричит, что сегодня не будет ночи. Следующая фаза ночи считается днем."
          },
          {
            "id": "mb.myth:36:omen:6",
            "ordinal": 6,
            "text": "Ковен сражается до смерти, и ничто не может унять их ненависть друг к другу. Победительница оплакивает пораженных, а затем уходит в изгнание."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:36:role:1",
            "title": "Облачная Ведьма, Нимбрель Могущественная",
            "text": "СИЛ 17, ЯСН 13, ДУХ 12, 12ЗЩ Б1 (плащ тумана), полет, шар ветра (d10 взрыв) Желает чувствовать себя выше всех."
          },
          {
            "id": "mb.myth:36:role:2",
            "title": "Садовая Ведьма, Танзели Мелочная",
            "text": "СИЛ 10, ЯСН 13, ДУХ 15, 8ЗЩ 4 костлявых руки (d6 каждая), кулон с лепестками (бесконечная вода при поливе растений) Желает заботиться о малом и подрезать большое."
          },
          {
            "id": "mb.myth:36:role:3",
            "title": "Акантрикс, Скатара Идеальная",
            "text": "СИЛ 15, ЯСН 13, ДУХ 18, 10ЗЩ Яркий серп (2d8), звездное кольцо (неподчинение команде носителя вызывает потерю d8 ДУХ) Желает изгнать весь мрак из мира."
          }
        ],
        "rolePreamble": "Всегда враждуют (см. ниже). В руках людей их безделушки обращаются в песок после использования."
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:36:omen:1",
            "ordinal": 1,
            "text": "The Cloud Hag descends from the sky, battering the Company with gusts of wind. She leaves once she feels powerful enough."
          },
          {
            "id": "mb.myth:36:omen:2",
            "ordinal": 2,
            "text": "A cauldron beneath a canopy of knotted trees. Anything dipped into it glows with darkness. For the rest of the day, this object is invisible to those who wish you harm. If a living creature touches the brew, one of the Coven bursts out and scolds them for intruding."
          },
          {
            "id": "mb.myth:36:omen:3",
            "ordinal": 3,
            "text": "The Garden Witch wanders among the bushes, gathering and eating snails. She offers her snails, which let those who eat them speak with plants for a short time."
          },
          {
            "id": "mb.myth:36:omen:4",
            "ordinal": 4,
            "text": "A circle of dead plants in a lush field. Plants brought into the circle wither and die. The Garden Witch planted a salt stone here, causing this."
          },
          {
            "id": "mb.myth:36:omen:5",
            "ordinal": 5,
            "text": "The wind falls still. Achantrix cries that there will be no night today. Treat the next night phase as day."
          },
          {
            "id": "mb.myth:36:omen:6",
            "ordinal": 6,
            "text": "The Coven fight to the death, and nothing can quell their hatred of one another. The victor mourns the fallen, then goes into exile."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:36:role:1",
            "title": "Cloud Hag, Nimbrel the Powerful",
            "text": "VIG 17, CLA 13, SPI 12, 12GD\nA1 (cloak of mist), flight, ball of wind (d10 blast)\nWants to feel above everyone else."
          },
          {
            "id": "mb.myth:36:role:2",
            "title": "Garden Witch, Tanselie the Petty",
            "text": "VIG 10, CLA 13, SPI 15, 8GD\n4 bony arms (d6 each), petal pendant (endless water when watering plants)\nWants to tend the small and prune the large."
          },
          {
            "id": "mb.myth:36:role:3",
            "title": "Achantrix, Scathara the Perfect",
            "text": "VIG 15, CLA 13, SPI 18, 10GD\nBright sickle (2d8), star ring (disobeying a command from its wearer causes d8 SPI loss)\nWants to banish all darkness from the world."
          }
        ],
        "rolePreamble": "Always feuding (see below). In mortal hands, their trinkets turn to sand after use."
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. ниже» в общем вступлении к ролям; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "The shared introduction to the roles refers to \"see below\"; the relevant material is outside the extracted omens and roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:37",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 103,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:37:omen:1",
            "ordinal": 1,
            "text": "Серый ветер проносится по Королевству, заставляя дрожать костяные предметы."
          },
          {
            "id": "mb.myth:37:omen:2",
            "ordinal": 2,
            "text": "Призрак из тени и дыма плывет вблизи, сжимая в руках четыре самоцвета. Это призрак Лича и его сокровища."
          },
          {
            "id": "mb.myth:37:omen:3",
            "ordinal": 3,
            "text": "Река крови устремляется к Гексу Мифа, где восстает разрушенный дворец."
          },
          {
            "id": "mb.myth:37:omen:4",
            "ordinal": 4,
            "text": "Толпа в капюшонах окружает алтарь, на котором покоится череп. Лич-как-череп провозглашает возвращение, как старый король. Если их потревожить, капюшоны падают на землю, тел внутри нет. Лич угрожает Рыцарям, но уносится в небо, если ему нужно отступить в свой дворец."
          },
          {
            "id": "mb.myth:37:omen:5",
            "ordinal": 5,
            "text": "Лич-как-череп покоится на куче костей, а затем восстанавливает свою человеческую форму, наращивая иссохшую кожу поверх костей. Вернув тело, он хочет дойти в свой дворец и править Королевством."
          },
          {
            "id": "mb.myth:37:omen:6",
            "ordinal": 6,
            "text": "Небо, покрытое облаками-черепами, издает новый закон в начале каждого Сезона (см. напротив). В конце Сезона все, кто нарушил закон, поражаются черной молнией (6d12 урона, игнорирует Броню)."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:37:role:1",
            "title": "Лич, Вечный, бесплотный призрак",
            "text": "СИЛ 9, ЯСН 10, ДУХ 10, 5ЗЩ, нельзя навредить Пахнет ладаном и медью. Металл поблизости охлаждается до ожогов."
          },
          {
            "id": "mb.myth:37:role:2",
            "title": "Лич, Вечный, череп",
            "text": "СИЛ 3, ЯСН 17, ДУХ 17, 1ЗЩ Б6 (мистическая сила) Неподвижен, но может управлять вещами рядом, включая королевский кинжал (2d6)."
          },
          {
            "id": "mb.myth:37:role:3",
            "title": "Лич, Вечный, скелетный король",
            "text": "СИЛ 10, ЯСН 12, ДУХ 16, 8ЗЩ Б2, Б4 против живых (кольчуга и шлем) Королевский посох (d10 длин., Смертельная Рана превращают жертву в старика) Может призывать мертвую версию случайного Рыцаря. Хочет править живыми."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:37:omen:1",
            "ordinal": 1,
            "text": "A grey wind sweeps through the Realm, making objects of bone tremble briefly."
          },
          {
            "id": "mb.myth:37:omen:2",
            "ordinal": 2,
            "text": "A ghost of shadow and smoke drifts nearby, clutching four gems. This is the Lich's ghost gathering his treasure."
          },
          {
            "id": "mb.myth:37:omen:3",
            "ordinal": 3,
            "text": "A river of blood rushes towards the Myth Hex, where a ruined palace rises again."
          },
          {
            "id": "mb.myth:37:omen:4",
            "ordinal": 4,
            "text": "A hooded crowd surrounds an altar bearing a skull. The Lich-as-skull proclaims his return as the old king. If disturbed, the hoods fall to the ground, with no bodies inside. The Lich threatens the Knights, but flies into the sky if he must retreat to his palace."
          },
          {
            "id": "mb.myth:37:omen:5",
            "ordinal": 5,
            "text": "The Lich-as-skull rests on a pile of bones, then restores his human form, growing withered skin over the bones. With his body restored, he wants to reach his palace and rule the Realm."
          },
          {
            "id": "mb.myth:37:omen:6",
            "ordinal": 6,
            "text": "The sky, covered in skull-shaped clouds, issues a new law at the start of each Season (see opposite). At the end of the Season, everyone who broke the law is struck by black lightning (6d12 damage, ignores Armour)."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:37:role:1",
            "title": "The Lich, the Eternal, bodiless ghost",
            "text": "VIG 9, CLA 10, SPI 10, 5GD, cannot be harmed\nSmells of incense and copper. Nearby metal becomes cold enough to burn."
          },
          {
            "id": "mb.myth:37:role:2",
            "title": "The Lich, the Eternal, skull",
            "text": "VIG 3, CLA 17, SPI 17, 1GD\nA6 (mystical power)\nImmobile, but can control nearby objects, including a royal dagger (2d6)."
          },
          {
            "id": "mb.myth:37:role:3",
            "title": "The Lich, the Eternal, skeletal king",
            "text": "VIG 10, CLA 12, SPI 16, 8GD\nA2, A4 against the living (ancient mail and helm)\nRoyal staff (d10 long, a Mortal Wound turns the victim into an old person)\nCan summon a dead version of a random Knight. Wants to rule the living."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. напротив» в знамении 6; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "Omen 6 refers to \"see opposite\"; the relevant material is outside the extracted omens and roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:38",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 105,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:38:omen:1",
            "ordinal": 1,
            "text": "Под серой ивой молодой человек стирает гору одежды в крошечном пруду. Это самая чистая вода в королевстве. Он поет песню о «рыцаре, который сражался со смертью», но забывает большую часть слов."
          },
          {
            "id": "mb.myth:38:omen:2",
            "ordinal": 2,
            "text": "Упырь скачет на своем призрачном скакуне. Он выкрикивает вызов на поединок, проигравший позволит победителю пронзить его сердце мечом. Мертвец знает, что это его не убьет."
          },
          {
            "id": "mb.myth:38:omen:3",
            "ordinal": 3,
            "text": "Скрипучий, хриплый вздох на ветру. Упырь сидит сгорбленный среди острых камней. Если его потревожить, он вскакивает на своего коня и удирает в стыде."
          },
          {
            "id": "mb.myth:38:omen:4",
            "ordinal": 4,
            "text": "Упырь возвращается с новым вызовом на поединок. Теперь проигравший должен позволить победителю сжечь его. Упырь пытается проиграть, но огонь его не убивает."
          },
          {
            "id": "mb.myth:38:omen:5",
            "ordinal": 5,
            "text": "Недавно вырытая безымянная могила. Если ее потревожить, Упырь вырывается наружу и убегает."
          },
          {
            "id": "mb.myth:38:omen:6",
            "ordinal": 6,
            "text": "Последний вызов от Упыря, сопровождаемого Провидцем. Провидец объявляет, что он убьет победителя ужасным образом (см. напротив)."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:38:role:1",
            "title": "Упырь, Рыцарь, победивший Смерть",
            "text": "СИЛ 15, ЯСН 12, ДУХ 8, 11ЗЩ Б3 (черная кольчуга, латы, щит) Меч Упыря (2d10 тяжелый, живые владельцы теряют d6 ДУХ с каждой атакой), щит (d4) Знает все Подвиги. Жаждет славы и смерти. Признает поражение, если Смертельно ранен, но умрет только от руки Провидца."
          },
          {
            "id": "mb.myth:38:role:2",
            "title": "Призрачный конь",
            "text": "СИЛ 10, ЯСН 15, ДУХ 6, 4ЗЩ Бестелесный, игнорирует физический урон. Хочет служить Упырю или его убийце."
          },
          {
            "id": "mb.myth:38:role:3",
            "title": "Прачка, Кэтфолд",
            "text": "СИЛ 11, ЯСН 7, ДУХ 7, 2ЗЩ Посох (d8 длинный) Может очистить абсолютно любую вещь."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:38:omen:1",
            "ordinal": 1,
            "text": "Beneath a grey willow, a young man washes a mountain of clothes in a tiny pond. This is the cleanest water in the Realm. He sings a song about \"the knight who fought death\", but forgets most of the words."
          },
          {
            "id": "mb.myth:38:omen:2",
            "ordinal": 2,
            "text": "The Wight rides their ghostly steed. They shout a challenge to a duel: the loser must let the winner pierce their heart with a sword. The Wight knows this will not kill them."
          },
          {
            "id": "mb.myth:38:omen:3",
            "ordinal": 3,
            "text": "A creaking, rasping sigh on the wind. The Wight sits hunched among sharp rocks. If disturbed, they leap onto their steed and flee in shame."
          },
          {
            "id": "mb.myth:38:omen:4",
            "ordinal": 4,
            "text": "The Wight returns with another challenge to a duel. This time the loser must let the winner burn them. The Wight tries to lose, but the fire does not kill them."
          },
          {
            "id": "mb.myth:38:omen:5",
            "ordinal": 5,
            "text": "A freshly dug, unmarked grave. If disturbed, the Wight bursts out and runs away."
          },
          {
            "id": "mb.myth:38:omen:6",
            "ordinal": 6,
            "text": "A final challenge from the Wight, accompanied by a Seer. The Seer declares that he will kill the winner in a terrible way (see opposite)."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:38:role:1",
            "title": "The Wight, the Knight who defeated Death",
            "text": "VIG 15, CLA 12, SPI 8, 11GD\nA3 (black mail, plate, shield)\nWightsword (2d10 hefty, living wielders lose d6 SPI with each attack), shield (d4)\nKnows all Feats. Craves glory and death. Concedes defeat if Mortally Wounded, but can die only at the hand of a Seer."
          },
          {
            "id": "mb.myth:38:role:2",
            "title": "Ghostly Steed",
            "text": "VIG 10, CLA 15, SPI 6, 4GD\nIncorporeal, ignores physical damage. Wants to serve the Wight or their slayer."
          },
          {
            "id": "mb.myth:38:role:3",
            "title": "Washer Man, Catfold",
            "text": "VIG 11, CLA 7, SPI 7, 2GD\nStaff (d8 long)\nCan clean absolutely anything."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. напротив» в знамении 6; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "Omen 6 refers to \"see opposite\"; the relevant material is outside the extracted omens and roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:39",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 107,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:39:omen:1",
            "ordinal": 1,
            "text": "Похоронная процессия несет Рыцаря Моли. Вскоре она будет захоронена в родной земле. Она была великим Рыцарем, но плохим правителем."
          },
          {
            "id": "mb.myth:39:omen:2",
            "ordinal": 2,
            "text": "Черный ястреб садится, а затем воет, как волк, прежде чем улететь вдаль."
          },
          {
            "id": "mb.myth:39:omen:3",
            "ordinal": 3,
            "text": "Заброшенная хижина, внутри раздаются звуки. Рыцарь Моли не может успокоиться от стыда. Ее Призрак проявляется, невидимый и нематериальный, разбрасывая предметы внутри хижины. Через мгновение хижина разрывается в клочья. Затем — ничего."
          },
          {
            "id": "mb.myth:39:omen:4",
            "ordinal": 4,
            "text": "Внезапно мир становится таким, каким он будет, когда все превратится в руины. Все мертво. Как только Рыцарь касается чего-либо, мир возвращается в норму."
          },
          {
            "id": "mb.myth:39:omen:5",
            "ordinal": 5,
            "text": "Трое мудрецов, близкие к смерти, поют в круге, умоляя Призрака успокоиться, прося ее оставить позади стыд. Через мгновение Призрак набрасывается на них, крича без слов."
          },
          {
            "id": "mb.myth:39:omen:6",
            "ordinal": 6,
            "text": "Призрак ведет своих призрачных всадников. Теперь ее форма стала более плотной и может быть физически повреждена. Она обретет покой только после победы или второй смерти."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:39:role:1",
            "title": "Призрак, Рыцарь Моли, Дельсонде",
            "text": "СИЛ 15, ЯСН 6, ДУХ 12, 7ЗЩ Б3 (кольчуга, богатые латы, щит) Длинный меч-клык (2d8 тяжелый), щит (d4) Восстанавливает свою форму с развитием Мифа. Бесится от напоминаний о своих провалах. Боится напоминаний о своих успехах."
          },
          {
            "id": "mb.myth:39:role:2",
            "title": "Призрачные всадники, войско",
            "text": "СИЛ 12, ЯСН 6, ДУХ 10, 5ЗЩ Б2 (мерцающая кольчуга, шлем) Длинный топор (d10, длинное) Исчезают в пустоте, если Призрак уничтожен."
          },
          {
            "id": "mb.myth:39:role:3",
            "title": "Мудрецы, при смерти, Колто, Энк, Агид",
            "text": "СИЛ 2, ЯСН 8, ДУХ 12, 6ЗЩ Посохи (d8, длинное), синие мантии с тусклыми рунами, смертельно больны (см. ниже)"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:39:omen:1",
            "ordinal": 1,
            "text": "A funeral procession carries the Moth Knight. She will soon be buried in her native soil. She was a great Knight, but a poor ruler."
          },
          {
            "id": "mb.myth:39:omen:2",
            "ordinal": 2,
            "text": "A black hawk lands, then howls like a wolf before flying away."
          },
          {
            "id": "mb.myth:39:omen:3",
            "ordinal": 3,
            "text": "An abandoned hut, with noises inside. The Moth Knight cannot rest for shame. Her Spectre manifests, invisible and immaterial, throwing objects around the hut. A moment later, the hut is torn to shreds. Then, nothing."
          },
          {
            "id": "mb.myth:39:omen:4",
            "ordinal": 4,
            "text": "Suddenly the world becomes as it will be when everything lies in ruins. Everything is dead. As soon as a Knight touches anything, the world returns to normal."
          },
          {
            "id": "mb.myth:39:omen:5",
            "ordinal": 5,
            "text": "Three sages, close to death, chant in a circle, pleading with the Spectre to rest and leave her shame behind. A moment later, the Spectre lashes out at them, screaming without words."
          },
          {
            "id": "mb.myth:39:omen:6",
            "ordinal": 6,
            "text": "The Spectre leads her ghostly riders. Her form is now more solid and can be physically harmed. She will find peace only through victory or a second death."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:39:role:1",
            "title": "The Spectre, Moth Knight Delsonde",
            "text": "VIG 15, CLA 6, SPI 12, 7GD\nA3 (mail, ornate plate, shield)\nLong fang-sword (2d8 hefty), shield (d4)\nRegains her form as the Myth develops. Enraged by reminders of her failures. Driven away by reminders of her successes."
          },
          {
            "id": "mb.myth:39:role:2",
            "title": "Ghostly Riders, a warband",
            "text": "VIG 12, CLA 6, SPI 10, 5GD\nA2 (shimmering mail, helm)\nLongaxe (d10 long)\nVanish into nothingness if the Spectre is destroyed."
          },
          {
            "id": "mb.myth:39:role:3",
            "title": "Dying Sages, Kolto, Enc, Agid",
            "text": "VIG 2, CLA 8, SPI 12, 6GD\nStaves (d8 long), blue robes with faded runes, terminally ill (see below)"
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. ниже» в роли 3; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "Role 3 refers to \"see below\"; the relevant material is outside the extracted omens and roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:40",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 109,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:40:omen:1",
            "ordinal": 1,
            "text": "Вдалеке из камыша слышна песня. Черный лебедь поет, ускоряя наступление ночи или утра быстрее обычного. Лебедь убегает, если его заметить."
          },
          {
            "id": "mb.myth:40:omen:2",
            "ordinal": 2,
            "text": "Посыльные несут весть от всех Провидцев. Падший Провидец должен быть убит."
          },
          {
            "id": "mb.myth:40:omen:3",
            "ordinal": 3,
            "text": "В темной части леса тень нависает над изуродованным телом. Тень убегает, если ее заметить. Труп — местный Провидец."
          },
          {
            "id": "mb.myth:40:omen:4",
            "ordinal": 4,
            "text": "Посыльный ближайшего Провидца призывает всех Рыцарей явиться для охраны. Приведение нападает следующей ночью."
          },
          {
            "id": "mb.myth:40:omen:5",
            "ordinal": 5,
            "text": "Падший Провидец танцует в лесу, проклиная братьев и сестер вслух. Изрекает ложные пророчества Рыцарям, которых встречает (см. напротив). Ночью Приведение нападает на Падшего Провидца."
          },
          {
            "id": "mb.myth:40:omen:6",
            "ordinal": 6,
            "text": "Ближайший Провидец пришел, чтобы в одиночку встретиться с Приведением, предлагая себя в жертву. Приведение материализуется ночью и атакует. После этого раздается крик, слышимый по всему Королевству, и Приведение возвращается туда, откуда было призвано."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:40:role:1",
            "title": "Приведение, ночь в холодной плоти",
            "text": "СИЛ 16, ЯСН 16, ДУХ 16, 11ЗЩ Касание нежизни (d12, игнорирует броню, невозможно Отрицать). Охотится на Провидцев. Существует лишь во тьме."
          },
          {
            "id": "mb.myth:40:role:2",
            "title": "Падший Провидец, Оссоанамме",
            "text": "СИЛ 12, ЯСН 4, ДУХ 16, 3ЗЩ Б1 (деревянная броня) Клинок (2d8 тяжелое), обожженные шелка Не видит ни прошлого, ни настоящего, ни будущего. Вызвал Приведение, но не может им управлять."
          },
          {
            "id": "mb.myth:40:role:3",
            "title": "Черный лебедь, Нижнее Перо, Нирроу",
            "text": "СИЛ 10, ЯСН 10, ДУХ 6, 3ЗЩ Крыло и клюв (2d6) Его песня ускоряет наступление дня или ночи, но поет он, когда чувствует себя в безопасности."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:40:omen:1",
            "ordinal": 1,
            "text": "Singing comes from distant reeds. A dark swan sings, bringing night or morning sooner than usual. The swan flees if spotted."
          },
          {
            "id": "mb.myth:40:omen:2",
            "ordinal": 2,
            "text": "Messengers carry word from all the Seers. The Fallen Seer must be killed on sight."
          },
          {
            "id": "mb.myth:40:omen:3",
            "ordinal": 3,
            "text": "In a dark part of the woods, a shadow looms over a mutilated body. The shadow flees if spotted. The corpse is the local Seer."
          },
          {
            "id": "mb.myth:40:omen:4",
            "ordinal": 4,
            "text": "A messenger from the nearest Seer calls all Knights to come and stand guard. The Wraith attacks the next night."
          },
          {
            "id": "mb.myth:40:omen:5",
            "ordinal": 5,
            "text": "The Fallen Seer dances in the woods, cursing his brothers and sisters aloud. He utters false prophecies to Knights he meets (see opposite). At night, the Wraith attacks the Fallen Seer."
          },
          {
            "id": "mb.myth:40:omen:6",
            "ordinal": 6,
            "text": "The nearest Seer has come to face the Wraith alone, offering himself as a sacrifice. The Wraith materialises at night and attacks. Afterwards, a scream is heard across the Realm, and the Wraith returns to wherever it was summoned from."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:40:role:1",
            "title": "The Wraith, night in cold flesh",
            "text": "VIG 16, CLA 16, SPI 16, 11GD\nTouch of unlife (d12, ignores armour, cannot be Denied).\nHunts Seers. Exists only in darkness."
          },
          {
            "id": "mb.myth:40:role:2",
            "title": "Fallen Seer, Ossoanamme",
            "text": "VIG 12, CLA 4, SPI 16, 3GD\nA1 (wooden armour)\nBlade (2d8 hefty), scorched silks\nCannot see the past, present, or future. Summoned the Wraith, but cannot control it."
          },
          {
            "id": "mb.myth:40:role:3",
            "title": "Dark Swan, Netherplume, Nirrow",
            "text": "VIG 10, CLA 10, SPI 6, 3GD\nWing and beak (2d6)\nIts song hastens day or night, but it sings only when it feels safe."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. напротив» в знамении 5; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "Omen 5 refers to \"see opposite\"; the relevant material is outside the extracted omens and roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:41",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 111,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:41:omen:1",
            "ordinal": 1,
            "text": "Огромная шерстистая тень движется между густыми деревьями. Форма меняется под каждым новом углом зрения (см. напротив). Если ее потревожить, она зарывается под землю."
          },
          {
            "id": "mb.myth:41:omen:2",
            "ordinal": 2,
            "text": "Испуганный всадник указывает на два огромных красных глаза, смотрящие с горизонта. Горячее дыхание на вашей коже. Глаза закрываются. Исчезли."
          },
          {
            "id": "mb.myth:41:omen:3",
            "ordinal": 3,
            "text": "Дуновение ветра, затем грохот, переходящий в трескучий рев. Все животные в королевстве паникуют до следующего восхода солнца."
          },
          {
            "id": "mb.myth:41:omen:4",
            "ordinal": 4,
            "text": "Когтистая лапа хватает одного из Рыцарей, появляясь из подлеска, без видимого тела. Каждый ход появляется новая лапа, хватая еще одного Рыцаря, всего до шести лап. Если Рыцари убегают, лапы отступают в землю."
          },
          {
            "id": "mb.myth:41:omen:5",
            "ordinal": 5,
            "text": "Все Рыцари в Королевстве, кто провалит спасбросок ДУХ, впадают в ярость, нападая на всех рядом. Заканчивается, если они получают Ранение."
          },
          {
            "id": "mb.myth:41:omen:6",
            "ordinal": 6,
            "text": "С воющим лаем Зверь мчится к ближайшему водоему. Когда он ныряет в бездну, волна накрывает все в пределах двух Гексов от водоема, разрушая здания и затопляя землю."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:41:role:1",
            "title": "Зверь, дикая и необузданная Природа",
            "text": "СИЛ 19, ЯСН 17, ДУХ 5, 14ЗЩ Б3 (толстая шкура), рвать и драть (4d10) Не нуждается в пище или воде, сражается только ради демонстрации превосходства."
          },
          {
            "id": "mb.myth:41:role:2",
            "title": "Когтистая лапа Зверя",
            "text": "СИЛ 15, ЯСН 5, ДУХ 5, 6ЗЩ Коготь (d10, цели с ранами захвачены и должны пройти спасбросок СИЛ, чтобы двигаться)"
          },
          {
            "id": "mb.myth:41:role:3",
            "title": "Испуганный всадник, Февич",
            "text": "СИЛ 11, ЯСН 16, ДУХ 6, 6ЗЩ Б2 (шлем, щит) Метательные копья (d6), топор (d6), щит (d4) Отказался от мечты стать Рыцарем после того, как увидел множество смертей. Теперь ищет места в наемном отряде."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:41:omen:1",
            "ordinal": 1,
            "text": "An enormous shaggy shadow moves among dense trees. Its shape changes with every new viewing angle (see opposite). If disturbed, it burrows underground."
          },
          {
            "id": "mb.myth:41:omen:2",
            "ordinal": 2,
            "text": "A frightened rider points to two enormous red eyes watching from the horizon. Hot breath on your skin. The eyes close. Gone."
          },
          {
            "id": "mb.myth:41:omen:3",
            "ordinal": 3,
            "text": "A gust of wind, then a rumble that becomes a crackling roar. Every animal in the Realm panics until the next sunrise."
          },
          {
            "id": "mb.myth:41:omen:4",
            "ordinal": 4,
            "text": "A clawed limb emerges from the undergrowth and grabs one of the Knights, with no body in sight. Each turn another limb appears, grabbing another Knight, up to six limbs in total. If the Knights flee, the limbs withdraw into the earth."
          },
          {
            "id": "mb.myth:41:omen:5",
            "ordinal": 5,
            "text": "Every Knight in the Realm who fails a SPI Save flies into a rage, attacking everyone nearby. This ends if they suffer a Wound."
          },
          {
            "id": "mb.myth:41:omen:6",
            "ordinal": 6,
            "text": "With a howling bark, the Beast races towards the nearest body of water. As it dives into the depths, a wave engulfs everything within two Hexes of the water, destroying buildings and flooding the land."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:41:role:1",
            "title": "The Beast, wild and untamed Nature",
            "text": "VIG 19, CLA 17, SPI 5, 14GD\nA3 (thick hide), rip and tear (4d10)\nNeeds no food or water, fights only to show dominance."
          },
          {
            "id": "mb.myth:41:role:2",
            "title": "Clawed Limb of the Beast",
            "text": "VIG 15, CLA 5, SPI 5, 6GD\nClaw (d10, Wounded targets are grabbed and must pass a VIG Save to move away)"
          },
          {
            "id": "mb.myth:41:role:3",
            "title": "Frightened Rider, Fevych",
            "text": "VIG 11, CLA 16, SPI 6, 6GD\nA2 (helm, shield)\nJavelins (d6), axe (d6), shield (d4)\nAbandoned her dream of becoming a Knight after seeing so many deaths. Now seeks a place in a mercenary company."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. напротив» в знамении 1; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "Omen 1 refers to \"see opposite\"; the relevant material is outside the extracted omens and roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:42",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 113,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:42:omen:1",
            "ordinal": 1,
            "text": "Жалкая женщина вымаливает милостыню. Она была Рыцарем, и судья ее сурово осудила."
          },
          {
            "id": "mb.myth:42:omen:2",
            "ordinal": 2,
            "text": "Двор в черно-белых тонах, резанные сиденья в круге. Смутно слышны голоса, спорящие, затем хлопок и тишина. Если вернуться сюда, этого места уже не будет."
          },
          {
            "id": "mb.myth:42:omen:3",
            "ordinal": 3,
            "text": "Три Сержанта Закона доставляют свиток Рыцарю, вызванному на суд. Рыцарь будет доставлен, когда придет время; предупреждением будет звук рога."
          },
          {
            "id": "mb.myth:42:omen:4",
            "ordinal": 4,
            "text": "Один из Рыцарей исчезает в тумане, вынужденный давать показания на суде над знакомым ему Рыцарем. После дачи показаний его возвращают в вихре тумана."
          },
          {
            "id": "mb.myth:42:omen:5",
            "ordinal": 5,
            "text": "Ясный звук рога разносится по Королевству."
          },
          {
            "id": "mb.myth:42:omen:6",
            "ordinal": 6,
            "text": "Ретривер Правосудия появляется на горизонте, грубо таща вызванного Рыцаря в суд, который материализовался неподалеку. Судья ждет, способна вызвать свидетелей за или против, вынося решение о том, следовал ли Рыцарь своему Обету. На следующий закат или восход она выносит свой вердикт."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:42:role:1",
            "title": "Судья, Амбрагефт, алмазный глаз",
            "text": "СИЛ 13, ЯСН 19, ДУХ 17, 10ЗЩ Меч Правосудия (2d10 длинный, +d10 против виновных, удар вызывает мгновение тишины) Может Защищать и видит сквозь ложь."
          },
          {
            "id": "mb.myth:42:role:2",
            "title": "Сержанты Закона, Лайо, Тоннел, Мантин",
            "text": "СИЛ 12, ЯСН 14, ДУХ 14, 6ЗЩ Б1 (длинные плащи в шахматную клетку) Копья-крюки (d10 длинные, +d10 против убегающих целей) Озлобленные, привязанные к службе за свои собственные преступления."
          },
          {
            "id": "mb.myth:42:role:3",
            "title": "Ретривер Правосудия, гончая закона Аздарт",
            "text": "СИЛ 15, ЯСН 18, ДУХ 7, 7ЗЩ Б1 (закаленное тело), огромные челюсти (2d8) Подчиняется только Судье."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:42:omen:1",
            "ordinal": 1,
            "text": "A pitiful woman begs for alms. She was a Knight, and the Judge condemned her harshly."
          },
          {
            "id": "mb.myth:42:omen:2",
            "ordinal": 2,
            "text": "A courtyard in black and white, with carved seats in a circle. Faint arguing voices, then a bang and silence. If you return here, the place is gone."
          },
          {
            "id": "mb.myth:42:omen:3",
            "ordinal": 3,
            "text": "Three Sergeants of Law deliver a scroll to a Knight summoned to trial. The Knight will be brought in when the time comes; a horn will sound as warning."
          },
          {
            "id": "mb.myth:42:omen:4",
            "ordinal": 4,
            "text": "One of the Knights vanishes into mist, compelled to testify at the trial of a Knight they know. After giving evidence, they return in a swirl of mist."
          },
          {
            "id": "mb.myth:42:omen:5",
            "ordinal": 5,
            "text": "A clear horn blast carries across the Realm."
          },
          {
            "id": "mb.myth:42:omen:6",
            "ordinal": 6,
            "text": "The Retriever of Justice appears on the horizon, roughly dragging the summoned Knight to the court, which has materialised nearby. The Judge awaits, able to call witnesses for or against, deciding whether the Knight did their best to uphold their Oath. At the next sunset or sunrise, she delivers her verdict."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:42:role:1",
            "title": "The Judge, Ambrageft, diamond eye",
            "text": "VIG 13, CLA 19, SPI 17, 10GD\nA3 (gambeson, white fur plate, tall helm)\nJudgementsword (2d10 long, +d10 against the guilty, each strike causes a moment of silence)\nCan Deny and sees through lies."
          },
          {
            "id": "mb.myth:42:role:2",
            "title": "Sergeants of Law, Lyo, Tonnel, Muntin",
            "text": "VIG 12, CLA 14, SPI 14, 6GD\nA1 (long chequered cloaks)\nHooked spears (d10 long, +d10 against fleeing targets)\nBitter, bound to service for their own crimes."
          },
          {
            "id": "mb.myth:42:role:3",
            "title": "Retriever of Justice, Azdart, hound of the law",
            "text": "VIG 15, CLA 18, SPI 7, 7GD\nA1 (hardened body), enormous jaws (2d8)\nObeys only the Judge."
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:43",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 115,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:43:omen:1",
            "ordinal": 1,
            "text": "Старый глашатай Престола едет, трубя в свой рог. Он объявляет, что Престол осуждает ложную Корону и обещает неопределенную награду тому, кто передаст ее для уничтожения."
          },
          {
            "id": "mb.myth:43:omen:2",
            "ordinal": 2,
            "text": "Тот же глашатай трубит в рог, объявляя охоту на Корону. Он не помнит своего предыдущего сообщения."
          },
          {
            "id": "mb.myth:43:omen:3",
            "ordinal": 3,
            "text": "Подходят пять жестоких наемников, грубо допрашивая любых Рыцарей, чтобы узнать, что они знают о Короне, и докладывают обратно Престолу."
          },
          {
            "id": "mb.myth:43:omen:4",
            "ordinal": 4,
            "text": "Глашатай атакован тигровыми пауками, d6 нападают открыто, еще d6 прячутся неподалеку в ожидании удачной возможности для атаки."
          },
          {
            "id": "mb.myth:43:omen:5",
            "ordinal": 5,
            "text": "Дюжина жестоких наемников вводят комендантский час для всех Рыцарей, приказывая им вернуться в ближайший Удел, пока наемники не найдут и не уничтожат Корону."
          },
          {
            "id": "mb.myth:43:omen:6",
            "ordinal": 6,
            "text": "На хорошо освещенной поляне Корона стоит на пьедестале из красного дерева."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:43:role:1",
            "title": "Корона, Двенадцатидревная Диадема",
            "text": "Прорицатели видят в носителе правителя, но рыцари считают его самозванцем. Владелец не может снять ее сам. Шепчет (см. ниже)."
          },
          {
            "id": "mb.myth:43:role:2",
            "title": "Старый глашатай, Алнект",
            "text": "СИЛ 6, ЯСН 7, ДУХ 13, 2ЗЩ Булава (d8 тяжелая), изысканное облачение, громкий рог"
          },
          {
            "id": "mb.myth:43:role:3",
            "title": "Жестокие Наемники, авангард Вейрила",
            "text": "СИЛ 12, ЯСН 10, ДУХ 10, 4ЗЩ Б1 (красная кольчуга), Вейрил — Б2 (красная кольчуга, латы) Алебарда (d10 длинное), отсутствие эмпатии У Вейрила длинные рыжие волосы и много обид."
          },
          {
            "id": "mb.myth:43:role:4",
            "title": "Тигровый паук, Хоррортрикс",
            "text": "СИЛ 12, ЯСН 14, ДУХ 5, 3ЗЩ Клыки (2d6), кислота (d8), изнуряет добычу."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:43:omen:1",
            "ordinal": 1,
            "text": "The old herald of the Seat of Power rides, blowing his horn. He announces that the Seat of Power condemns the false Crown and promises an unspecified reward to whoever hands it over for destruction."
          },
          {
            "id": "mb.myth:43:omen:2",
            "ordinal": 2,
            "text": "The same herald blows his horn, announcing a hunt for the Crown. He does not remember his previous message."
          },
          {
            "id": "mb.myth:43:omen:3",
            "ordinal": 3,
            "text": "Five cruel mercenaries approach, roughly questioning any Knights about what they know of the Crown, then reporting back to the Seat of Power."
          },
          {
            "id": "mb.myth:43:omen:4",
            "ordinal": 4,
            "text": "Tiger spiders attack the herald: d6 attack openly, while another d6 hide nearby, awaiting a good opportunity to strike."
          },
          {
            "id": "mb.myth:43:omen:5",
            "ordinal": 5,
            "text": "A dozen cruel mercenaries impose a curfew on all Knights, ordering them back to the nearest Holding until the mercenaries find and destroy the Crown."
          },
          {
            "id": "mb.myth:43:omen:6",
            "ordinal": 6,
            "text": "In a brightly lit clearing, the Crown stands on a mahogany pedestal."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:43:role:1",
            "title": "The Crown, the Twelve-Wood Diadem",
            "text": "Seers perceive its wearer as the ruler, but Knights consider them an impostor. The wearer cannot remove it themselves. Whispers (see below)."
          },
          {
            "id": "mb.myth:43:role:2",
            "title": "Old Herald, Alnect",
            "text": "VIG 6, CLA 7, SPI 13, 2GD\nMace (d8 hefty), fine robes, loud horn"
          },
          {
            "id": "mb.myth:43:role:3",
            "title": "Cruel Mercenaries, Veyril's vanguard",
            "text": "VIG 12, CLA 10, SPI 10, 4GD\nA1 (red mail), Veyril has A2 (red mail, plate)\nPoleaxe (d10 long), lack of empathy\nVeyril has long red hair and many grudges."
          },
          {
            "id": "mb.myth:43:role:4",
            "title": "Tiger Spider, Horrortrix",
            "text": "VIG 12, CLA 14, SPI 5, 3GD\nFangs (2d6), acidic spit (d8), wears down prey."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. ниже» в роли 1; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "Role 1 refers to \"see below\"; the relevant material is outside the extracted omens and roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:44",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 117,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:44:omen:1",
            "ordinal": 1,
            "text": "Трава здесь напоминает жесткие щетинки, а земля теплая на ощупь. Почти кажется, что Королевство тяжело дышит."
          },
          {
            "id": "mb.myth:44:omen:2",
            "ordinal": 2,
            "text": "Три охотника в капюшонах крадутся по земле, преследуя Кабана, который изгнал их из их идиллического дома неподалеку."
          },
          {
            "id": "mb.myth:44:omen:3",
            "ordinal": 3,
            "text": "Белоснежный виноградник впереди. Внезапный грохот, когда появляется Кабан, разрывая лозы и ломая стены. Ему хочется вина."
          },
          {
            "id": "mb.myth:44:omen:4",
            "ordinal": 4,
            "text": "Если охотники в капюшонах сопровождают Отряд, Кабан нападет именно на них. Иначе же их разбитые тела лежат среди его следов."
          },
          {
            "id": "mb.myth:44:omen:5",
            "ordinal": 5,
            "text": "Три охотника в масках ищут Кабана. Они почти не говорят, изображая животных на своих масках. Если их маска будет снята, они исчезнут в черном дыму."
          },
          {
            "id": "mb.myth:44:omen:6",
            "ordinal": 6,
            "text": "Кабан вдали, охотники в масках скрываются, готовясь нанести удар. Если Кабан убит, охотники снимают маски и исчезают в дыму. Если Кабан выживает, он направляется в ближайшее поселение для последнего пира перед уходом из Королевства."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:44:role:1",
            "title": "Кабан, Рустигор, Ферриграс",
            "text": "СИЛ 18, ЯСН 7, ДУХ 7, 7ЗЩ A3 (медные щетинки) Бросок и удар (d10 взрыв, +d10 при атаке с разгона) или пронзание (3d10 медленное) Хочет пищи, сделанной руками человека. Бивни можно использовать для создания оружия, которое убивает зверей, которых оно ранит, но ломается при ударе."
          },
          {
            "id": "mb.myth:44:role:2",
            "title": "Охотники в капюшонах, Дристок, Фрисволд, Ульф",
            "text": "СИЛ 10, ЯСН 8, ДУХ 12, 3ЗЩ Копье (d8 тяжелое), метательные копья (d6) Много злости, но мало охотничьего опыта."
          },
          {
            "id": "mb.myth:44:role:3",
            "title": "Охотники в масках, оставили имена позади",
            "text": "СИЛ 10, ЯСН 15, ДУХ 15, 5ЗЩ Б2 (меховая броня, шлем с маской, см. ниже) Большое копье (d10 длинное)"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:44:omen:1",
            "ordinal": 1,
            "text": "The grass here resembles stiff bristles, and the ground is warm to the touch. It almost feels as though the Realm is breathing heavily."
          },
          {
            "id": "mb.myth:44:omen:2",
            "ordinal": 2,
            "text": "Three hooded hunters creep across the land, pursuing the Boar that drove them from their idyllic home nearby."
          },
          {
            "id": "mb.myth:44:omen:3",
            "ordinal": 3,
            "text": "A white-walled vineyard ahead. A sudden crash as the Boar appears, tearing up vines and breaking walls. It wants wine."
          },
          {
            "id": "mb.myth:44:omen:4",
            "ordinal": 4,
            "text": "If the hooded hunters accompany the Company, the Boar attacks them specifically. Otherwise, their broken bodies lie among its tracks."
          },
          {
            "id": "mb.myth:44:omen:5",
            "ordinal": 5,
            "text": "Three masked hunters seek the Boar. They hardly speak, imitating the animals on their masks. If a mask is removed, its wearer vanishes in black smoke."
          },
          {
            "id": "mb.myth:44:omen:6",
            "ordinal": 6,
            "text": "The Boar in the distance, masked hunters hiding, ready to strike. If the Boar is killed, the hunters remove their masks and vanish in smoke. If the Boar survives, it heads to the nearest Holding for a final feast before leaving the Realm."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:44:role:1",
            "title": "The Boar, Rustigore, Ferrigras",
            "text": "VIG 18, CLA 7, SPI 7, 7GD\nA3 (copper bristles)\nRush and strike (d10 blast, +d10 when charging) or gore (3d10 slow)\nWants food made by human hands. Its tusks can be used to make weapons that kill beasts they wound, but break on impact."
          },
          {
            "id": "mb.myth:44:role:2",
            "title": "Hooded Hunters, Dristoc, Friswold, Ulf",
            "text": "VIG 10, CLA 8, SPI 12, 3GD\nSpear (d8 hefty), javelins (d6)\nMuch anger, but little hunting experience."
          },
          {
            "id": "mb.myth:44:role:3",
            "title": "Masked Hunters, their names left behind",
            "text": "VIG 10, CLA 15, SPI 15, 5GD\nA2 (fur armour, masked helm, see below)\nGreat spear (d10 long)"
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. ниже» в роли 3; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "Role 3 refers to \"see below\"; the relevant material is outside the extracted omens and roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:45",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 119,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:45:omen:1",
            "ordinal": 1,
            "text": "Огромная тень проносится по земле, на мгновение заслонив солнце."
          },
          {
            "id": "mb.myth:45:omen:2",
            "ordinal": 2,
            "text": "Пламя с неба, визжа, падает на землю, отправляя огненный шквал во все стороны (d8 взрыв), поджигая окружающую местность. Орел, в пламени, наблюдает за разрушением, а затем устремляется к ближайшему большому водоему."
          },
          {
            "id": "mb.myth:45:omen:3",
            "ordinal": 3,
            "text": "Орел, тлеющий, купается, чтобы потушить свои перья. Он не может летать еще Фазу, но может ковылять по земле. Толпа, выгнанная из своих горящих домов, наблюдает и защищает Орла от опасности."
          },
          {
            "id": "mb.myth:45:omen:4",
            "ordinal": 4,
            "text": "Орел, взлетающий, расправляет крылья, готовясь к полету. На взлете он посылает ветра через Гекс, разрушая деревянные конструкции и вырывая деревья с корнем."
          },
          {
            "id": "mb.myth:45:omen:5",
            "ordinal": 5,
            "text": "Солнце вздувается, и слышен пронзительный крик. В небе появляется силуэт Орла, в пламени, который пока просто кружит."
          },
          {
            "id": "mb.myth:45:omen:6",
            "ordinal": 6,
            "text": "Орел, в пламени, пикирует на Престол, стремясь схватить правителя и поднять его в небо в качестве жертвы солнцу. Если это не удается, следующий урожай будет скудным."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:45:role:1",
            "title": "Орел, в пламени",
            "text": "СИЛ 15, ЯСН 15, ДУХ 15, 8ЗЩ Б2 (огромное тело), когти (2d8) и клюв (d12) Хочет много огня, чтобы питать солнце."
          },
          {
            "id": "mb.myth:45:role:2",
            "title": "Орел, тлеющий",
            "text": "СИЛ 13, ЯСН 12, ДУХ 10, 6ЗЩ Б2 (огромное тело), трепыхание (d8 взрыв) Хочет потушить свои горящие крылья."
          },
          {
            "id": "mb.myth:45:role:3",
            "title": "Орел, взлетающий",
            "text": "СИЛ 15, ЯСН 18, ДУХ 18, 12ЗЩ A2 (огромное тело), порывы ветра (d10 взрыв) Должен высушить крылья на ветру перед полетом."
          },
          {
            "id": "mb.myth:45:role:4",
            "title": "Жертвы-защитники Орла",
            "text": "СИЛ 10, ЯСН 10, ДУХ 7, 2ЗЩ См. ниже. Верят, что у Орла благие намерения."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:45:omen:1",
            "ordinal": 1,
            "text": "An enormous shadow sweeps across the land, briefly blocking the sun."
          },
          {
            "id": "mb.myth:45:omen:2",
            "ordinal": 2,
            "text": "Fire screams down from the sky, sending a fiery barrage in every direction (d8 blast), setting the surrounding land alight. The Eagle, Aflame, watches the destruction, then heads for the nearest large body of water."
          },
          {
            "id": "mb.myth:45:omen:3",
            "ordinal": 3,
            "text": "The Eagle, smouldering, bathes to extinguish its feathers. It cannot fly for another Phase, but can hobble on the ground. A crowd driven from their burning homes watches and protects the Eagle from harm."
          },
          {
            "id": "mb.myth:45:omen:4",
            "ordinal": 4,
            "text": "The Eagle, Rising, spreads its wings, ready to fly. As it takes off, it sends winds across the Hex, destroying wooden structures and flattening trees."
          },
          {
            "id": "mb.myth:45:omen:5",
            "ordinal": 5,
            "text": "The sun swells, and a piercing cry is heard. The silhouette of the Eagle, Aflame, appears in the sky, merely circling for now."
          },
          {
            "id": "mb.myth:45:omen:6",
            "ordinal": 6,
            "text": "The Eagle, Aflame, dives upon the Seat of Power, seeking to seize the ruler and carry them into the sky as a sacrifice to the sun. If it fails, the next harvest will be poor."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:45:role:1",
            "title": "The Eagle, Aflame",
            "text": "VIG 15, CLA 15, SPI 15, 8GD\nA2 (enormous body), talons (2d8) and beak (d12)\nWants great fires to feed the sun."
          },
          {
            "id": "mb.myth:45:role:2",
            "title": "The Eagle, smouldering",
            "text": "VIG 13, CLA 12, SPI 10, 6GD\nA2 (enormous body), flailing (d8 blast)\nWants to extinguish its burning wings."
          },
          {
            "id": "mb.myth:45:role:3",
            "title": "The Eagle, Rising",
            "text": "VIG 15, CLA 18, SPI 18, 12GD\nA2 (enormous body), gusts of wind (d10 blast)\nMust dry its wings in the wind before flying."
          },
          {
            "id": "mb.myth:45:role:4",
            "title": "The Eagle's Victims and Defenders",
            "text": "VIG 10, CLA 10, SPI 7, 2GD\nSee below. Believe the Eagle means well."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «См. ниже» в роли 4; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "Role 4 refers to \"see below\"; the relevant material is outside the extracted omens and roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:46",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 121,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:46:omen:1",
            "ordinal": 1,
            "text": "Музыкант барабанит и поет: «великий крылатый растет, а мы — его пиршество», но настаивает, что это лишь песня."
          },
          {
            "id": "mb.myth:46:omen:2",
            "ordinal": 2,
            "text": "Стая птиц на земле. Они словно преклоняются перед темным клочком неба. Они разбегаются, если их потревожить."
          },
          {
            "id": "mb.myth:46:omen:3",
            "ordinal": 3,
            "text": "Длинный стол накрыт, крестьяне собрались на пир. Каждая миска наполнена червями, которые люди нехотя едят горстями. Они говорят, что Пир червей лишит Летучую мышь ее пищи."
          },
          {
            "id": "mb.myth:46:omen:4",
            "ordinal": 4,
            "text": "Измотанные фермеры собирают свиней, коров и овец. Они направляются к ближайшему озеру для великого жертвоприношения, надеясь, что окровавленная вода утолит злобный голод Летучей мыши."
          },
          {
            "id": "mb.myth:46:omen:5",
            "ordinal": 5,
            "text": "Толпа разжигает костры у входа в пещеру, где прячется Летучая мышь. Они хотят выкурить ее. В итоге Летучая мышь выходит и сражается, чтобы сбежать."
          },
          {
            "id": "mb.myth:46:omen:6",
            "ordinal": 6,
            "text": "Летучую мышь в цепях со сломанными крыльями тянут к Престолу, чтобы судить за длинный список ее преступлений против Королевства (см. напротив)."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:46:role:1",
            "title": "Летучая мышь, злейшая из тварей",
            "text": "СИЛ 15, ЯСН 15, ДУХ 3, 7ЗЩ Б2 (огромное тело) Взмах крыльями (d8 взрыв) или укус (2d10) Хочет фруктов и темный уголок."
          },
          {
            "id": "mb.myth:46:role:2",
            "title": "Толпа охотников на Мышь, Радлеф во главе",
            "text": "СИЛ 10, ЯСН 7, ДУХ 13, 3ЗЩ Оружие из инструментов (d8 длинное), у Радлефа Лук (d6 длинное) и мышебойные стрелы (без эффекта). Уверены в своей правоте"
          },
          {
            "id": "mb.myth:46:role:3",
            "title": "Странствующий музыкант, Кеорк",
            "text": "СИЛ 11, ЯСН 11, ДУХ 16, 4ЗЩ Барабан с красными лентами, кинжал (d6) Любит слушать, как плохо другие поют."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:46:omen:1",
            "ordinal": 1,
            "text": "A smug musician drums and sings: \"the great winged one grows, and we are its feast\", but insists it is only a song."
          },
          {
            "id": "mb.myth:46:omen:2",
            "ordinal": 2,
            "text": "A flock of birds on the ground. They seem to bow to a dark patch of sky. They scatter if disturbed."
          },
          {
            "id": "mb.myth:46:omen:3",
            "ordinal": 3,
            "text": "A long table is laid, peasants gathered for a feast. Every bowl is filled with worms, which the people reluctantly eat by the handful. They say the Feast of Worms will deprive the Bat of its food."
          },
          {
            "id": "mb.myth:46:omen:4",
            "ordinal": 4,
            "text": "Exhausted farmers gather pigs, cows, and sheep. They head to the nearby lake for a great sacrifice, hoping the bloodied water will sate the Bat's wicked hunger."
          },
          {
            "id": "mb.myth:46:omen:5",
            "ordinal": 5,
            "text": "A crowd lights fires at the entrance to a cave where the Bat hides. They want to smoke it out. Eventually the Bat emerges and fights to escape."
          },
          {
            "id": "mb.myth:46:omen:6",
            "ordinal": 6,
            "text": "The Bat, chained with broken wings, is dragged to the Seat of Power to stand trial for its long list of crimes against the Realm (see opposite)."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:46:role:1",
            "title": "The Bat, most wicked of beasts",
            "text": "VIG 15, CLA 15, SPI 3, 7GD\nA2 (enormous body)\nWingbeat (d8 blast) or bite (2d10)\nWants sweet fruit and a dark place to rest."
          },
          {
            "id": "mb.myth:46:role:2",
            "title": "Bat-Hunting Mob, led by Radlef",
            "text": "VIG 10, CLA 7, SPI 13, 3GD\nTools as weapons (d8 long), Radlef has a bow (d6 long) and bat-slaying arrows (no effect).\nCertain they are right."
          },
          {
            "id": "mb.myth:46:role:3",
            "title": "Wandering Musician, Keork",
            "text": "VIG 11, CLA 11, SPI 16, 4GD\nDrum with red ribbons, dagger (d6)\nLoves hearing others sing badly."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. напротив» в знамении 6; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "Omen 6 refers to \"see opposite\"; the relevant material is outside the extracted omens and roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:47",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 123,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:47:omen:1",
            "ordinal": 1,
            "text": "Караван телег, толстые ослы тянут тяжелые бревна, с ними двенадцать бородавчатых стражей. Они относятся к Рыцарям с уважением, но настаивают на спешке, доставляя материалы для замка Жабы."
          },
          {
            "id": "mb.myth:47:omen:2",
            "ordinal": 2,
            "text": "Двое разведчиков ищут новости о Жабе. Они слышат, что его замок уже построен."
          },
          {
            "id": "mb.myth:47:omen:3",
            "ordinal": 3,
            "text": "Питомца Жабы, гигантского слизня, ведут на цепях в замок. Шесть бородавчатых стражей стараются изо всех сил и просят помощи. Жаба благодарен за услугу."
          },
          {
            "id": "mb.myth:47:omen:4",
            "ordinal": 4,
            "text": "Среди колючек спрятан свиток с зеленой лентой. Он гласит: «Жаба ценит вашу службу». Прочитавший чувствует гадкую сладость, словно его наполнили медом. Он давится и плюет сиропообразной слюной, теряя d8 СИЛ."
          },
          {
            "id": "mb.myth:47:omen:5",
            "ordinal": 5,
            "text": "Одинокий бородавчатый страж вручает подарок одному из Рыцарей (см. напротив). Проклятие проявляется при использовании предмета, и страж настойчиво рекомендует Рыцарю воспользоваться им позже. Проклятие длится весь Сезон."
          },
          {
            "id": "mb.myth:47:omen:6",
            "ordinal": 6,
            "text": "Дюжина бородавчатых стражей скачет навстречу, требуя от Рыцарей посетить Жабу. Они должны присягнуть ему или умереть."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:47:role:1",
            "title": "Жаба, толстый лорд, рожден править",
            "text": "СИЛ 12, ЯСН 5, ДУХ 16, 5ЗЩ Б4 (жирное тело) Захват и укус (d10), чарующий голос"
          },
          {
            "id": "mb.myth:47:role:2",
            "title": "Бородавчатая стража, Джейбек во главе",
            "text": "СИЛ 12, ЯСН 10, ДУХ 8, 5ЗЩ Б3 (жабий шлем, кольчуга, пухлые латы) Лук (d6 длинное), алебарда (d10 длинное) Испуганный вид, профессиональное поведение."
          },
          {
            "id": "mb.myth:47:role:3",
            "title": "Блотч, любимый питомец Жабы",
            "text": "СИЛ 17, ЯСН 5, ДУХ 2, 5ЗЩ Б4 (тело монструозного слизняка) Слюнявая пасть (3d8) Всегда грустный, всегда голодный. Хочет на волю."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:47:omen:1",
            "ordinal": 1,
            "text": "A caravan of carts, fat donkeys pulling heavy logs, accompanied by twelve warty guards. They treat Knights respectfully, but urge haste as they deliver materials for the Toad's castle."
          },
          {
            "id": "mb.myth:47:omen:2",
            "ordinal": 2,
            "text": "Two scouts seek news of the Toad. They hear that his castle has already been built."
          },
          {
            "id": "mb.myth:47:omen:3",
            "ordinal": 3,
            "text": "The Toad's pet, a giant slug, is led in chains to the castle. Six warty guards struggle mightily and ask for help. The Toad is grateful for the favour."
          },
          {
            "id": "mb.myth:47:omen:4",
            "ordinal": 4,
            "text": "Among the thorns lies a scroll tied with green ribbon. It reads: \"The Toad appreciates your service.\" Anyone reading it feels a sickly sweetness, as if filled with honey. They choke and spit syrupy saliva, losing d8 VIG."
          },
          {
            "id": "mb.myth:47:omen:5",
            "ordinal": 5,
            "text": "A lone warty guard presents a gift to one of the Knights (see opposite). Its curse manifests when the item is used, and the guard strongly recommends the Knight use it later. The curse lasts the entire Season."
          },
          {
            "id": "mb.myth:47:omen:6",
            "ordinal": 6,
            "text": "A dozen warty guards ride towards the Knights, demanding they visit the Toad. They must swear allegiance to him or die."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:47:role:1",
            "title": "The Toad, fat lord, born to rule",
            "text": "VIG 12, CLA 5, SPI 16, 5GD\nA4 (fat body)\nGrab and bite (d10), enchanting voice"
          },
          {
            "id": "mb.myth:47:role:2",
            "title": "Warty Guards, led by Jabeck",
            "text": "VIG 12, CLA 10, SPI 8, 5GD\nA3 (froghelm, mail, plump plate)\nBow (d6 long), halberd (d10 long)\nFearful appearance, professional behaviour."
          },
          {
            "id": "mb.myth:47:role:3",
            "title": "Blotch, Beloved Pet of the Toad",
            "text": "VIG 17, CLA 5, SPI 2, 5GD\nA4 (monstrous slug body)\nSlobbering maw (3d8)\nAlways sad, always hungry. Wants to be free."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Ссылка «см. напротив» в знамении 5; соответствующий материал за пределами извлекаемых знамений и ролей.",
        "descriptionEn": "Omen 5 refers to \"see opposite\"; the relevant material is outside the extracted omens and roles."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:48",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 125,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:48:omen:1",
            "ordinal": 1,
            "text": "Пожилой скульптор трудится, вырезая огромную статую в скале. Он хвастается, что статуя основана на образе его в молодости. Он знает, что умирает, и жаждет бессмертия."
          },
          {
            "id": "mb.myth:48:omen:2",
            "ordinal": 2,
            "text": "По всему королевству земля трясется и грохочет с пробуждением Колосса."
          },
          {
            "id": "mb.myth:48:omen:3",
            "ordinal": 3,
            "text": "Разрушенный каменный дом, мелкие пожитки разбросаны по близлежащему полю. Кажется, будто его забросали камнями."
          },
          {
            "id": "mb.myth:48:omen:4",
            "ordinal": 4,
            "text": "Рыцарь Молота едет, заявляя, что разыскивает Колосса, который терроризирует местность."
          },
          {
            "id": "mb.myth:48:omen:5",
            "ordinal": 5,
            "text": "Два войска наемников сражаются с Колоссом, постепенно понимая, что не могут повредить его каменное тело."
          },
          {
            "id": "mb.myth:48:omen:6",
            "ordinal": 6,
            "text": "Вдали Колосс прислоняется к горному склону. С громким стоном он оседает на землю, его форма сливается с горой. Через несколько мгновений новая скала покрывается красным и зеленым мхом."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:48:role:1",
            "title": "Колосс, пробудившийся из скалы",
            "text": "СИЛ 19, ЯСН 3, ДУХ 2, 6ЗЩ Б4, считается постройкой (колоссальное каменное тело) Крушит (2d12) или сметает (d12 взрыв) Ведом странным поведением (см. ниже)."
          },
          {
            "id": "mb.myth:48:role:2",
            "title": "Рыцарь Молота, Ланшай",
            "text": "СИЛ 14, ЯСН 5, ДУХ 6, 7ЗЩ Б3 (шлем, гамбезон, шипованная броня) Палица (2d10 медл.), осадные бомбы (d8 взрыв) Поклялся никогда не задавать и не отвечать на вопросы."
          },
          {
            "id": "mb.myth:48:role:3",
            "title": "Член осадного наемного отряда",
            "text": "СИЛ 13, ЯСН 7, ДУХ 7, 5ЗЩ Б3 (осадный шлем, черненая кольчуга, башенный щит) Клинок (2d6 тяжелый), башенный щит (d4)"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:48:omen:1",
            "ordinal": 1,
            "text": "An elderly sculptor labours, carving an enormous statue from a cliff. He boasts that the statue is modelled on his younger self. He knows he is dying and craves immortality."
          },
          {
            "id": "mb.myth:48:omen:2",
            "ordinal": 2,
            "text": "Across the Realm, the ground shakes and rumbles as the Colossus awakens."
          },
          {
            "id": "mb.myth:48:omen:3",
            "ordinal": 3,
            "text": "A ruined stone house, small belongings scattered across the nearby field. It looks as though it was pelted with stones."
          },
          {
            "id": "mb.myth:48:omen:4",
            "ordinal": 4,
            "text": "The Hammer Knight rides, declaring that he seeks the Colossus terrorising the area."
          },
          {
            "id": "mb.myth:48:omen:5",
            "ordinal": 5,
            "text": "Two mercenary warbands fight the Colossus, gradually realising that they cannot harm its stone body."
          },
          {
            "id": "mb.myth:48:omen:6",
            "ordinal": 6,
            "text": "In the distance, the Colossus leans against a mountainside. With a loud groan, it sinks to the ground, its form merging with the mountain. Moments later, red and green moss covers the new rock."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:48:role:1",
            "title": "The Colossus, awakened from the rock",
            "text": "VIG 19, CLA 3, SPI 2, 6GD\nA4, treated as a building (colossal stone body)\nCrush (2d12) or sweep (d12 blast)\nDriven by strange behaviour (see below)."
          },
          {
            "id": "mb.myth:48:role:2",
            "title": "Hammer Knight, Lansheigh",
            "text": "VIG 14, CLA 5, SPI 6, 7GD\nA3 (helm, gambeson, spiked plate)\nMaul (2d10 slow), siege bombs (d8 blast)\nSwore never to ask or answer questions."
          },
          {
            "id": "mb.myth:48:role:3",
            "title": "Siege Mercenary",
            "text": "VIG 13, CLA 7, SPI 7, 5GD\nA3 (siege helm, blackened mail, tower shield)\nBlade (2d6 hefty), tower shield (d4)"
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 125, роль1: «см. ниже». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 125, role 1: \"see below\". The reference is retained; its target is not automatically linked in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:49",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 127,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:49:omen:1",
            "ordinal": 1,
            "text": "Терновый Провидец странствует по Королевству, заявляя, что скоро грядет вторжение огромных клацающих чудовищ."
          },
          {
            "id": "mb.myth:49:omen:2",
            "ordinal": 2,
            "text": "Посланник объявляет, что Терновый Провидец отвоевал потерянную крепость (в Гексе Мифа), создав неприступное убежище на случай вторжения."
          },
          {
            "id": "mb.myth:49:omen:3",
            "ordinal": 3,
            "text": "Трое резаков когтистого роя выглядывают из своих тоннелей, разведчики перед вторжением. Если их заметят, они быстро убегают обратно под землю."
          },
          {
            "id": "mb.myth:49:omen:4",
            "ordinal": 4,
            "text": "Кузнец и трое молодых учеников ищут новый дом. Они покинули Крепость, так как Терновый Провидец требовал невозможного, приказывая построить целые стены из железа."
          },
          {
            "id": "mb.myth:49:omen:5",
            "ordinal": 5,
            "text": "Голос Тернового Провидца слышен по всей земле. Война началась, бесчисленные орды когтистого роя атакуют Крепость. На самом деле они не пробьются через Крепость, так как являются творениями Тернового Провидца."
          },
          {
            "id": "mb.myth:49:omen:6",
            "ordinal": 6,
            "text": "После победы над вторжением Терновый Провидец требует, чтобы его сделали правителем Королевства, с Крепостью в качестве Престола."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:49:role:1",
            "title": "Терновый Провидец",
            "text": "СИЛ 9, ЯСН 16, ДУХ 14, 3ЗЩ Б2 (тернистое тело, шлем) Шипастая булава (d8 тяжелая), кинжал (d6) Видит боль в прошлом и будущем."
          },
          {
            "id": "mb.myth:49:role:2",
            "title": "Резак когтистого роя",
            "text": "СИЛ 9, ЯСН 9, ДУХ 3, 3ЗЩ Б1 (зеленый панцирь) Когти (2d6), кислотная слюна (d8) Хитрый инстинкт (см. ниже)."
          },
          {
            "id": "mb.myth:49:role:3",
            "title": "Громила когтистого роя",
            "text": "СИЛ 15, ЯСН 5, ДУХ 5, 6ЗЩ Б2 (красный панцирь) Мощные когти (2d8), тупой инстинкт"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:49:omen:1",
            "ordinal": 1,
            "text": "The Thorn Seer travels the Realm, declaring that an invasion of enormous scuttling monsters is coming soon."
          },
          {
            "id": "mb.myth:49:omen:2",
            "ordinal": 2,
            "text": "A messenger announces that the Thorn Seer has reclaimed a lost fortress (in the Myth Hex), creating an impregnable refuge against the invasion."
          },
          {
            "id": "mb.myth:49:omen:3",
            "ordinal": 3,
            "text": "Three Claw Swarm Cutters peer from their tunnels, scouts ahead of the invasion. If spotted, they quickly flee underground."
          },
          {
            "id": "mb.myth:49:omen:4",
            "ordinal": 4,
            "text": "A smith and three young apprentices seek a new home. They left the Fortress because the Thorn Seer demanded the impossible, ordering entire walls built from iron."
          },
          {
            "id": "mb.myth:49:omen:5",
            "ordinal": 5,
            "text": "The Thorn Seer's voice is heard across the land. War has begun; countless hordes of the Claw Swarm attack the Fortress. They will not actually break through the Fortress, as they are creations of the Thorn Seer."
          },
          {
            "id": "mb.myth:49:omen:6",
            "ordinal": 6,
            "text": "After the invasion is defeated, the Thorn Seer demands to be made ruler of the Realm, with the Fortress as the Seat of Power."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:49:role:1",
            "title": "Thorn Seer",
            "text": "VIG 9, CLA 16, SPI 14, 3GD\nA2 (thorny body, helm)\nSpiked mace (d8 hefty), dagger (d6)\nSees pain in the past and future."
          },
          {
            "id": "mb.myth:49:role:2",
            "title": "Claw Swarm Cutter",
            "text": "VIG 9, CLA 9, SPI 3, 3GD\nA1 (green shell)\nClaws (2d6), acidic spit (d8)\nCunning instinct (see below)."
          },
          {
            "id": "mb.myth:49:role:3",
            "title": "Claw Swarm Hulk",
            "text": "VIG 15, CLA 5, SPI 5, 6GD\nA2 (red shell)\nPowerful claws (2d8), dull instinct"
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 127, роль2: «см. ниже». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 127, role 2: \"see below\". The reference is retained; its target is not automatically linked in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:50",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 129,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:50:omen:1",
            "ordinal": 1,
            "text": "На горизонте появляется силуэт Цитадели, покосившийся и неустойчивый. Все встреченные вами Провидцы предупреждают не приближаться к ней."
          },
          {
            "id": "mb.myth:50:omen:2",
            "ordinal": 2,
            "text": "Ближайший Провидец крадется между деревьями, ищет новое Святилище, чтобы Наблюдатель не нашел его."
          },
          {
            "id": "mb.myth:50:omen:3",
            "ordinal": 3,
            "text": "Железные гончие, выкованные в Цитадели, прочесывают землю, терроризируя, но не причиняя вреда Провидцам. Стая из четырех псов мчится мимо Отряда, направляясь к ближайшему Провидцу."
          },
          {
            "id": "mb.myth:50:omen:4",
            "ordinal": 4,
            "text": "Наблюдатель из Цитадели разыскивает каждого провидца, предупреждая их не вмешиваться в судьбу Королевства."
          },
          {
            "id": "mb.myth:50:omen:5",
            "ordinal": 5,
            "text": "Светящийся шар падает с неба, взрываясь при падении в ближайшем лесу. Из места крушения раздаются крики, и из леса выбегает Пылающий Провидец. В предсмертных муках он атакует всех, кто находится поблизости, теряя по d6 СИЛ каждый раунд."
          },
          {
            "id": "mb.myth:50:omen:6",
            "ordinal": 6,
            "text": "Цитадель начинает светиться, заливая Королевство ярким белым светом. Провидцы кричат. Когда свет угасает, Цитадель исчезает."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:50:role:1",
            "title": "Наблюдатель из Цитадели, Сетизи",
            "text": "СИЛ 12, ЯСН 17, ДУХ 15, 8ЗЩ Б1 (серебряная кольчуга). Владеет подвигом Фокус. Хрустальный длинный меч (2d8 тяжелый), кристальный фонарь (показывает образ места в Королевстве, которое вы посетили. Свет причиняет боль Провидцам) Защищает предначертанное (см. ниже)."
          },
          {
            "id": "mb.myth:50:role:2",
            "title": "Пылающий Провидец",
            "text": "СИЛ 10, ЯСН 7, ДУХ 7, 6ЗЩ Вспышки мучительного пламени (d8 взрыв)"
          },
          {
            "id": "mb.myth:50:role:3",
            "title": "Железная Гончая",
            "text": "СИЛ 10, ЯСН 12, ДУХ 2, 2ЗЩ Б3 (металлическое тело) Закаленные челюсти (d8), сосредоточена на своей добыче"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:50:omen:1",
            "ordinal": 1,
            "text": "The silhouette of the Citadel appears on the horizon, leaning and unstable. Every Seer you meet warns against approaching it."
          },
          {
            "id": "mb.myth:50:omen:2",
            "ordinal": 2,
            "text": "The nearest Seer creeps among the trees, seeking a new Sanctum so the Watcher cannot find them."
          },
          {
            "id": "mb.myth:50:omen:3",
            "ordinal": 3,
            "text": "Iron Hounds, forged in the Citadel, scour the land, terrorising Seers but not harming them. A pack of four rushes past the Company, heading for the nearest Seer."
          },
          {
            "id": "mb.myth:50:omen:4",
            "ordinal": 4,
            "text": "The Watcher from the Citadel seeks out every Seer, warning them not to meddle with the Realm's fate."
          },
          {
            "id": "mb.myth:50:omen:5",
            "ordinal": 5,
            "text": "A glowing sphere falls from the sky, exploding as it crashes into the nearest forest. Screams come from the crash site, and a Immolated Seer runs from the woods. In their death throes, they attack everyone nearby, losing d6 VIG each round."
          },
          {
            "id": "mb.myth:50:omen:6",
            "ordinal": 6,
            "text": "The Citadel begins to glow, flooding the Realm with bright white light. The Seers scream. When the light fades, the Citadel is gone."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:50:role:1",
            "title": "Watcher in the Citadel, Setizi",
            "text": "VIG 12, CLA 17, SPI 15, 8GD\nA1 (silver mail). Can Focus.\nGlassy longsword (2d8 hefty), crystal lantern (looking into it reveals a hazy image of a place in the Realm you have visited. Its light hurts Seers)\nProtects what is destined (see below)."
          },
          {
            "id": "mb.myth:50:role:2",
            "title": "Immolated Seer",
            "text": "VIG 10, CLA 7, SPI 7, 6GD\nBursts of agonising flame (d8 blast)"
          },
          {
            "id": "mb.myth:50:role:3",
            "title": "Iron Hound",
            "text": "VIG 10, CLA 12, SPI 2, 2GD\nA3 (metal body)\nHardened jaws (d8), focused on its prey"
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 129, роль1: «см. ниже». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 129, role 1: \"see below\". The reference is retained; its target is not automatically linked in this slice."
      },
      {
        "type": "unresolved",
        "description": "Стр. 129, роль1: упомянуты Подвиги; справочные правила Подвигов не включены в этот срез.",
        "descriptionEn": "P. 129, role 1 mentions Feats; the reference rules for Feats are not included in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:51",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 131,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:51:omen:1",
            "ordinal": 1,
            "text": "Под увядающим деревом лежит куча кривых костей, будто бы растущих из самой земли. Они кажутся слегка теплыми."
          },
          {
            "id": "mb.myth:51:omen:2",
            "ordinal": 2,
            "text": "Узкая каменная лестница ведет вниз, под огромное почерневшее дерево. Она уходит в разветвленный туннель, в каждой из трех ветвей которого прячется Костерожденный. Они нападают на любого, кто войдет."
          },
          {
            "id": "mb.myth:51:omen:3",
            "ordinal": 3,
            "text": "Скрежет за деревьями. Исследуя источник звука, вы находите бурную реку костей, текущую из Гекса Мифа к ближайшему водоему."
          },
          {
            "id": "mb.myth:51:omen:4",
            "ordinal": 4,
            "text": "Земля разверзается, и отряд оказывается на арене из костей. Им предстоит сражаться с тремя волнами по d6 Костерожденных в каждой. Если они выживут, откроется лестница на поверхность."
          },
          {
            "id": "mb.myth:51:omen:5",
            "ordinal": 5,
            "text": "Три отряда Костяных воинов маршируют вперед. Они бродят по земле, вымещая свою ярость на живых."
          },
          {
            "id": "mb.myth:51:omen:6",
            "ordinal": 6,
            "text": "Появляется Костный убийца, сражающийся от имени всех мертвых. Он вызывает всех подряд на дуэль, отправляя проигравших в подземную костяную тюрьму. Превращается в пепел, если побежден, освобождая всех заключенных"
          }
        ],
        "roles": [
          {
            "id": "mb.myth:51:role:1",
            "title": "Костерожденный, творение смерти",
            "text": "СИЛ 10, ЯСН 10, ДУХ 5, 4ЗЩ Б2 (костяное тело, см. ниже) Зависть к живым."
          },
          {
            "id": "mb.myth:51:role:2",
            "title": "Костяные воины, солдаты смерти",
            "text": "СИЛ 10, ЯСН 6, ДУХ 6, 4ЗЩ Б2 (костяные шлемы и костяные щиты) Костяной молот (d8 тяжелый), костяной щит (d4)"
          },
          {
            "id": "mb.myth:51:role:3",
            "title": "Костяной убийца, защитник закона костей",
            "text": "СИЛ 15, ЯСН 14, ДУХ 11, 8ЗЩ Б3 (костяной шлем, костяной доспех, закаленные кости) Костолом (2d10 длинное, не может быть использовано живыми)"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:51:omen:1",
            "ordinal": 1,
            "text": "Beneath a withering tree lies a pile of crooked bones, seemingly growing from the ground itself. They feel slightly warm."
          },
          {
            "id": "mb.myth:51:omen:2",
            "ordinal": 2,
            "text": "A narrow stone stair descends beneath an enormous blackened tree. It leads into a branching tunnel, with a Boneborn hiding in each of its three branches. They attack anyone who enters."
          },
          {
            "id": "mb.myth:51:omen:3",
            "ordinal": 3,
            "text": "A grinding sound beyond the trees. Investigating its source reveals a turbulent river of bones flowing from the Myth Hex to the nearest body of water."
          },
          {
            "id": "mb.myth:51:omen:4",
            "ordinal": 4,
            "text": "The ground opens, and the Company finds itself in an arena of bones. They must fight three waves of d6 Boneborn each. If they survive, stairs to the surface open."
          },
          {
            "id": "mb.myth:51:omen:5",
            "ordinal": 5,
            "text": "Three warbands of Bones at Arms march forth. They roam the land, venting their fury on the living."
          },
          {
            "id": "mb.myth:51:omen:6",
            "ordinal": 6,
            "text": "The Bone Slayer appears, fighting on behalf of all the dead. It duels with anyone who challenges it, sending the losers to an underground bone prison. If defeated, it turns to ash, freeing all the prisoners."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:51:role:1",
            "title": "Boneborn, creation of death",
            "text": "VIG 10, CLA 10, SPI 5, 4GD\nA2 (bone body, see below)\nEnvious of the living."
          },
          {
            "id": "mb.myth:51:role:2",
            "title": "Bones at Arms, soldiers of death",
            "text": "VIG 10, CLA 6, SPI 6, 4GD\nA2 (bone helms and bone shields)\nBone hammer (d8 hefty), bone shield (d4)"
          },
          {
            "id": "mb.myth:51:role:3",
            "title": "Bone Slayer, defender of bone law",
            "text": "VIG 15, CLA 14, SPI 11, 8GD\nA3 (bone helm, bone armour, hardened bones)\nBonebreaker (2d10 long, cannot be used by the living)"
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 131, роль1: «см. ниже». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 131, role 1: \"see below\". The reference is retained; its target is not automatically linked in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:52",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 133,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:52:omen:1",
            "ordinal": 1,
            "text": "Поисковый отряд. Ищут пожилую женщину, сборщицу трав. Она пропала несколько дней назад."
          },
          {
            "id": "mb.myth:52:omen:2",
            "ordinal": 2,
            "text": "Сначала пятно крови, затем куски плоти, постепенно становится понятно, что это останки пропавшей пожилой женщины."
          },
          {
            "id": "mb.myth:52:omen:3",
            "ordinal": 3,
            "text": "Еще одна куча разорванных останков, на этот раз какой-то олень. Все присутствующие должны пройти спасбросок ЯСН, иначе они почувствуют непреодолимое желание понюхать и потрогать останки. Теперь у них есть Гончая внутри (см. напротив), и ее эффекты будут продолжаться до тех пор, пока этот миф не будет разрешен."
          },
          {
            "id": "mb.myth:52:omen:4",
            "ordinal": 4,
            "text": "Тени начинают разрастаться. Те, кто осмеливается зайти в темноту, подвергаются нападению Гончей в тени. Она не нападает на тех, кто подвержен влиянию Гончей внутри, если они не нападут первыми."
          },
          {
            "id": "mb.myth:52:omen:5",
            "ordinal": 5,
            "text": "Ледяной ветер, затем Гончая на ветру атакует из ниоткуда, сосредотачивая свои атаки на тех, кто подвержен влиянию Гончей внутри. Если ее убить, она возвращается в ветер."
          },
          {
            "id": "mb.myth:52:omen:6",
            "ordinal": 6,
            "text": "Куча плоти и костей. Гончая во плоти вырывается наружу и сражается насмерть."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:52:role:1",
            "title": "Гончая в тени",
            "text": "СИЛ 5, ЯСН 16, ДУХ 5, 5ЗЩ Б2 (мускулистая шкура, жесткая шерсть) Челюсти (2d8), неуязвима во тьме"
          },
          {
            "id": "mb.myth:52:role:2",
            "title": "Гончая на ветру",
            "text": "СИЛ 10, ЯСН 16, ДУХ 5, 7ЗЩ Б2 (мускулистая шкура, жесткая шерсть) Челюсти (2d8), невероятно быстра, передвигается и атакует дважды за ход"
          },
          {
            "id": "mb.myth:52:role:3",
            "title": "Гончая во плоти",
            "text": "СИЛ 15, ЯСН 16, ДУХ 5, 7ЗЩ Б2 (мускулистая шкура, жесткая шерсть) Атаки тех, кто подвержен влиянию Гончей Внутри, ослаблены."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:52:omen:1",
            "ordinal": 1,
            "text": "A search party. They seek an elderly woman who gathers herbs. She disappeared a few days ago."
          },
          {
            "id": "mb.myth:52:omen:2",
            "ordinal": 2,
            "text": "First a bloodstain, then pieces of flesh; gradually it becomes clear that these are the remains of the missing elderly woman."
          },
          {
            "id": "mb.myth:52:omen:3",
            "ordinal": 3,
            "text": "Another heap of torn remains, this time a deer of some kind. Everyone present must pass a CLA Save or feel an irresistible urge to smell and touch the remains. They now have the Hound Within (see opposite), whose effects last until this Myth is resolved."
          },
          {
            "id": "mb.myth:52:omen:4",
            "ordinal": 4,
            "text": "The shadows begin to grow. Those who dare enter the darkness are attacked by the Hound in Shadow. It does not attack those affected by the Hound Within unless they attack first."
          },
          {
            "id": "mb.myth:52:omen:5",
            "ordinal": 5,
            "text": "An icy wind, then the Hound on the Wind attacks from nowhere, focusing on those affected by the Hound Within. If killed, it returns to the wind."
          },
          {
            "id": "mb.myth:52:omen:6",
            "ordinal": 6,
            "text": "A heap of flesh and bones. The Hound in Flesh bursts out and fights to the death."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:52:role:1",
            "title": "Hound in Shadow",
            "text": "VIG 5, CLA 16, SPI 5, 5GD\nA2 (muscular hide, coarse fur)\nJaws (2d8), invulnerable in darkness"
          },
          {
            "id": "mb.myth:52:role:2",
            "title": "Hound on the Wind",
            "text": "VIG 10, CLA 16, SPI 5, 7GD\nA2 (muscular hide, coarse fur)\nJaws (2d8), incredibly fast, moves and attacks twice per turn"
          },
          {
            "id": "mb.myth:52:role:3",
            "title": "Hound in Flesh",
            "text": "VIG 15, CLA 16, SPI 5, 7GD\nA2 (muscular hide, coarse fur)\nAttacks by those affected by the Hound Within are Impaired."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 133, знамение3: «см. напротив». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 133, omen 3: \"see opposite\". The reference is retained; its target is not automatically linked in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:53",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 135,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:53:omen:1",
            "ordinal": 1,
            "text": "Тихая поляна среди густых деревьев. Полная тишина. Три пустых пьедестала, по одному из черного, серого и белого камня. Каждый, кто пытается покинуть поляну, вновь оказывается на ней, пока на каждом пьедестале не будет оставлено подношение, независимо от его ценности."
          },
          {
            "id": "mb.myth:53:omen:2",
            "ordinal": 2,
            "text": "На поляне Охотник белого камня спрашивает: «Кому мне помочь?» у того, кто оставил подношение. Затем он исчезает и совершает добрый поступок для этого человека."
          },
          {
            "id": "mb.myth:53:omen:3",
            "ordinal": 3,
            "text": "На поляне белое подношение возвращается."
          },
          {
            "id": "mb.myth:53:omen:4",
            "ordinal": 4,
            "text": "На поляне Охотник Серого Камня спрашивает: «Кого мне наказать?» у того, кто оставил подношение. Затем он исчезает и выносит наказание, последствия которого будут длиться до следующей весны (см. напротив)."
          },
          {
            "id": "mb.myth:53:omen:5",
            "ordinal": 5,
            "text": "На поляне серое подношение возвращается."
          },
          {
            "id": "mb.myth:53:omen:6",
            "ordinal": 6,
            "text": "На поляне Охотник Черного Камня спрашивает : «Кого мне убить?» у того, кто оставил подношение. Затем он исчезает и пытается убить этого человека. Подношение остается на теле цели, если она убита."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:53:role:1",
            "title": "Охотник белого камня, Серефиллея",
            "text": "СИЛ 12, ЯСН 12, ДУХ 16, 8ЗЩ Б2 (тихая кольчуга, серебряные латы) Охотничье копье (1d10 до 3d10, сделано из материала подношения)"
          },
          {
            "id": "mb.myth:53:role:2",
            "title": "Охотник серого камня, Гравок",
            "text": "СИЛ 13, ЯСН 15, ДУХ 12, 8ЗЩ Б2 (тяжелый плащ, круглый шлем) Охотничий лук (1d8 до 3d8, стрелы сделаны из материала подношения)"
          },
          {
            "id": "mb.myth:53:role:3",
            "title": "Охотник черного камня, Теренас",
            "text": "СИЛ 13, ЯСН 16, ДУХ 17, 8ЗЩ Б2-4 (броня сделана из материала подношения) Лезвие косы (2d10 или 2d8 взрыв, длинное)"
          }
        ],
        "rolePreamble": "Основаны на подношениях:"
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:53:omen:1",
            "ordinal": 1,
            "text": "A quiet glade among dense trees. Complete silence. Three empty pedestals, one each of black, grey, and white stone. Anyone trying to leave the glade finds themselves back inside until an offering, of any value, has been left on each pedestal."
          },
          {
            "id": "mb.myth:53:omen:2",
            "ordinal": 2,
            "text": "In the glade, the White Stone Hunter asks the person who left the offering, \"Whom should I help?\" Then the hunter vanishes and performs a good deed for that person."
          },
          {
            "id": "mb.myth:53:omen:3",
            "ordinal": 3,
            "text": "In the glade, the white offering is returned."
          },
          {
            "id": "mb.myth:53:omen:4",
            "ordinal": 4,
            "text": "In the glade, the Grey Stone Hunter asks the person who left the offering, \"Whom should I punish?\" Then the hunter vanishes and delivers a punishment whose consequences last until next spring (see opposite)."
          },
          {
            "id": "mb.myth:53:omen:5",
            "ordinal": 5,
            "text": "In the glade, the grey offering is returned."
          },
          {
            "id": "mb.myth:53:omen:6",
            "ordinal": 6,
            "text": "In the glade, the Black Stone Hunter asks the person who left the offering, \"Whom should I kill?\" Then the hunter vanishes and tries to kill that person. If the target is killed, the offering is left on their body."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:53:role:1",
            "title": "White Stone Hunter, Serephyllea",
            "text": "VIG 12, CLA 12, SPI 16, 8GD\nA2 (silent mail, silver plate)\nHunting spear (1d10 to 3d10, made from the material of the offering)"
          },
          {
            "id": "mb.myth:53:role:2",
            "title": "Grey Stone Hunter, Gravok",
            "text": "VIG 13, CLA 15, SPI 12, 8GD\nA2 (heavy cloak, round helm)\nHunting bow (1d8 to 3d8, arrows made from the material of the offering)"
          },
          {
            "id": "mb.myth:53:role:3",
            "title": "Black Stone Hunter, Therenas",
            "text": "VIG 13, CLA 16, SPI 17, 8GD\nA2-4 (armour made from the material of the offering)\nScythe blade (2d10 or 2d8 blast, long)"
          }
        ],
        "rolePreamble": "Based on the offering left at each pedestal:"
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 135, знамение4: «см. напротив». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 135, omen 4: \"see opposite\". The reference is retained; its target is not automatically linked in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:54",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 137,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:54:omen:1",
            "ordinal": 1,
            "text": "Механик в сопровождении Часовых Рыцарей. Он хвастается, что на турнире его Рыцари победят всех остальных."
          },
          {
            "id": "mb.myth:54:omen:2",
            "ordinal": 2,
            "text": "Гонец из Престола. Отряд зовут представлять Королевство против Часовых Рыцарей."
          },
          {
            "id": "mb.myth:54:omen:3",
            "ordinal": 3,
            "text": "Нимиод ведет Часовых Рыцарей перед толпой. Отряд представляют зрителям."
          },
          {
            "id": "mb.myth:54:omen:4",
            "ordinal": 4,
            "text": "Отряд соревнуется вместе, сталкиваясь с отрядом Часовых Рыцарей. Это сражение на лошадях, только ближнее оружие, участники исключаются, если получают Смертельную Рану."
          },
          {
            "id": "mb.myth:54:omen:5",
            "ordinal": 5,
            "text": "Теперь Отряду предстоит бой пешком, без использования щитов."
          },
          {
            "id": "mb.myth:54:omen:6",
            "ordinal": 6,
            "text": "Наконец, один Рыцарь должен сразиться с Часовым Чемпионом."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:54:role:1",
            "title": "Нимиод, гениальный механик",
            "text": "СИЛ 10, ЯСН 15, ДУХ 12, 2ЗЩ Изысканный меч (2d6), многослойные шелка, сосредоточенный взгляд"
          },
          {
            "id": "mb.myth:54:role:2",
            "title": "Часовой Рыцарь",
            "text": "СИЛ 13, ЯСН 5, ДУХ 5, 6ЗЩ Б4 (стальное тело, медная броня, шлем, щит) Изысканный меч (2d6), щит (d4) Следует устным приказам Нимиода. Скрежещущий голос, имитирует поведение рыцаря. Подвержен одному нюансу (см. ниже)."
          },
          {
            "id": "mb.myth:54:role:3",
            "title": "Часовой Чемпион",
            "text": "Как выше, но знает все Подвиги, несет прекрасный меч (2d8 тяжелый) и ослушается Нимиода, чтобы сохранить свою жизнь и честь."
          }
        ],
        "omenPreamble": "Начиная с Третьего Знамения, когда выпадает следующее, по всему Королевству раздается рог. Отряд сталкивается со Знамением только по возвращении в Престол, где проводится Турнир. Игнорируйте дальнейшие Знамения этого Мифа до их возвращения."
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:54:omen:1",
            "ordinal": 1,
            "text": "A mechanic accompanied by Clockwork Knights. He boasts that his Knights will defeat all others at the tournament."
          },
          {
            "id": "mb.myth:54:omen:2",
            "ordinal": 2,
            "text": "A messenger from the Seat of Power. The company is summoned to represent the Realm against the Clockwork Knights."
          },
          {
            "id": "mb.myth:54:omen:3",
            "ordinal": 3,
            "text": "Nimiod leads the Clockwork Knights before the crowd. The company is introduced to the spectators."
          },
          {
            "id": "mb.myth:54:omen:4",
            "ordinal": 4,
            "text": "The company competes together against a company of Clockwork Knights. This is a mounted battle with melee weapons only; contestants are eliminated if they suffer a Mortal Wound."
          },
          {
            "id": "mb.myth:54:omen:5",
            "ordinal": 5,
            "text": "The company must now fight on foot, without shields."
          },
          {
            "id": "mb.myth:54:omen:6",
            "ordinal": 6,
            "text": "Finally, one Knight must fight the Clockwork Champion."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:54:role:1",
            "title": "Nimiod, genius tinkerer",
            "text": "VIG 10, CLA 15, SPI 12, 2GD\nFine sword (2d6), layered silks, focused gaze"
          },
          {
            "id": "mb.myth:54:role:2",
            "title": "Clockwork Knight",
            "text": "VIG 13, CLA 5, SPI 5, 6GD\nA4 (steel body, copper armour, helm, shield)\nFine sword (2d6), shield (d4)\nFollows Nimiod's spoken orders. A grinding voice, imitates a Knight's behaviour. Subject to one quirk (see below)."
          },
          {
            "id": "mb.myth:54:role:3",
            "title": "Clockwork Champion",
            "text": "As above, but knows all Feats, carries a fine longsword (2d8 hefty), and will disobey Nimiod to preserve its life and honour."
          }
        ],
        "omenPreamble": "From the third Omen onward, whenever the next Omen is rolled, a horn sounds throughout the Realm. The company encounters the Omen only upon returning to the Seat of Power, where the tournament is held. Ignore further Omens of this Myth until they return."
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 137, роль2: «см. ниже». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 137, role 2: \"see below\". The instruction is retained; its target is not linked automatically in this slice."
      },
      {
        "type": "resolved",
        "description": "Стр. 137, роль3: «Как выше» отсылает к предыдущей роли «Часовой Рыцарь»; исходная ссылка сохранена без дублирования характеристик.",
        "descriptionEn": "P. 137, role 3: \"As above\" refers to the preceding role, \"Clockwork Knight\"; the original reference is retained without duplicating the statistics."
      },
      {
        "type": "unresolved",
        "description": "Стр. 137, роль3: упомянуты Подвиги; справочные правила Подвигов не включены в этот срез.",
        "descriptionEn": "P. 137, role 3: Feats are mentioned; the reference rules for Feats are not included in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:55",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 139,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:55:omen:1",
            "ordinal": 1,
            "text": "Послушники в листве ведут парадом новорожденного зеленого быка, провозглашая благословение на Королевство. Они собираются отвести его в секретное место для сохранности."
          },
          {
            "id": "mb.myth:55:omen:2",
            "ordinal": 2,
            "text": "Народ радуется Благословению Быка, которое теперь явно проявляется (см. напротив)."
          },
          {
            "id": "mb.myth:55:omen:3",
            "ordinal": 3,
            "text": "На пыльной дороге лежит мертвый Бык. Вдалеке раздается крик, двое детей бегут, крича, что видели Рыцарей, стоящих над телом. Благословения Быка утрачены."
          },
          {
            "id": "mb.myth:55:omen:4",
            "ordinal": 4,
            "text": "Пятеро стражников в листве немедленно атакуют Рыцарей, объявляя их врагами Королевства за убийство Быка."
          },
          {
            "id": "mb.myth:55:omen:5",
            "ordinal": 5,
            "text": "Вдалеке видны два крылатых демона, издевающихся над заблудшей лошадью, терзая ее своими клинками. Они убегают, если им противостоять."
          },
          {
            "id": "mb.myth:55:omen:6",
            "ordinal": 6,
            "text": "Одинокий стражник в листве отбивается от пяти крылатых демонов, которые обрели смелость благодаря своему численному превосходству. Если стражник выживет, он поручится за невиновность Рыцарей."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:55:role:1",
            "title": "Бык, зеленорогий и зеленошкурый",
            "text": "СИЛ 10, ЯСН 5, ДУХ 3, 2ЗЩ Рога (d6), спокойный нрав"
          },
          {
            "id": "mb.myth:55:role:2",
            "title": "Стражники в листве, Солас во главе",
            "text": "СИЛ 11, ЯСН 8, ДУХ 8, 4ЗЩ Б2 (кольчуга в листве, шлем) Широкая гвизарма (d10) Глубокая любовь к Быку. Солас несет великую гвизарму (2d10 медленная)."
          },
          {
            "id": "mb.myth:55:role:3",
            "title": "Крылатые демоны, вестники печали",
            "text": "СИЛ 8, ЯСН 17, ДУХ 4, 5ЗЩ Б1 только на земле (кожистые крылья) Клинковые руки (2d6), неуклюжий полет Желают сеять горе и наблюдать издалека."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:55:omen:1",
            "ordinal": 1,
            "text": "Leaf-clad acolytes parade a newborn green bull, proclaiming a blessing upon the Realm. They intend to take it to a secret place for safekeeping."
          },
          {
            "id": "mb.myth:55:omen:2",
            "ordinal": 2,
            "text": "The people rejoice in the Bull's Blessing, which is now clearly manifest (see opposite)."
          },
          {
            "id": "mb.myth:55:omen:3",
            "ordinal": 3,
            "text": "The Bull lies dead on a dusty road. A cry sounds in the distance; two children run past, shouting that they saw the Knights standing over the body. The Bull's blessings are lost."
          },
          {
            "id": "mb.myth:55:omen:4",
            "ordinal": 4,
            "text": "Five leaf-clad guards immediately attack the Knights, declaring them enemies of the Realm for killing the Bull."
          },
          {
            "id": "mb.myth:55:omen:5",
            "ordinal": 5,
            "text": "Two winged fiends can be seen in the distance tormenting a stray horse, tearing at it with their blades. They flee if confronted."
          },
          {
            "id": "mb.myth:55:omen:6",
            "ordinal": 6,
            "text": "A lone leaf-clad guard fights off five winged fiends, emboldened by their numerical advantage. If the guard survives, they will vouch for the Knights' innocence."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:55:role:1",
            "title": "The Bull, green-horned and green-skinned",
            "text": "VIG 10, CLA 5, SPI 3, 2GD\nHorns (d6), calm temperament"
          },
          {
            "id": "mb.myth:55:role:2",
            "title": "Leaf-clad guards, led by Solas",
            "text": "VIG 11, CLA 8, SPI 8, 4GD\nA2 (leaf-covered mail, helm)\nBroad guisarme (d10)\nDeeply love the Bull. Solas carries a great guisarme (2d10 slow)."
          },
          {
            "id": "mb.myth:55:role:3",
            "title": "Winged fiends, bringers of sorrow",
            "text": "VIG 8, CLA 17, SPI 4, 5GD\nA1 only while on the ground (leathery wings)\nBlade-arms (2d6), clumsy flight\nWant to spread grief and watch from afar."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 139, знамение2: «см. напротив». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 139, Omen 2: \"see opposite\". The instruction is retained; its target is not linked automatically in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:56",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 141,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:56:omen:1",
            "ordinal": 1,
            "text": "Рыцарь Свечи лежит сломленный на дороге, не в состоянии идти. Он рассказывает о Гидре, восставшей из застоявшегося водоема. Она убила остальных членов его Отряда. Ее нельзя убить. Ее нужно выдержать."
          },
          {
            "id": "mb.myth:56:omen:2",
            "ordinal": 2,
            "text": "Широкая дыра, ведущая в сырую тьму. Любое беспокойство пробуждает Гидру, которая вырывается наружу и атакует Отряд. Она не реагирует на любые атаки."
          },
          {
            "id": "mb.myth:56:omen:3",
            "ordinal": 3,
            "text": "На вершине холма Гидра торжествующе кричит в руинах разрушенного каменного укрепления. Она вступает в бой, если ее потревожить, насмехаясь над Отрядом, если они не понимают, что ее нельзя убить."
          },
          {
            "id": "mb.myth:56:omen:4",
            "ordinal": 4,
            "text": "Быстро распространяющийся огонь среди деревьев. Гидра устраивает засаду, теперь способна дышать огнем (d8 взрыв)."
          },
          {
            "id": "mb.myth:56:omen:5",
            "ordinal": 5,
            "text": "Рев сверху, и Гидра спускается вниз, теперь с крыльями и способностью летать."
          },
          {
            "id": "mb.myth:56:omen:6",
            "ordinal": 6,
            "text": "Явно ослабленная, Гидра ползет к бурлящему источнику. Когда она погружается в воду, вода начинает кипеть, становится черной, и Гидра исчезает."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:56:role:1",
            "title": "Гидра, наказание за прошлые грехи",
            "text": "СИЛ 19, ЯСН 10, ДУХ 7, 12ЗЩ Б5 (непробиваемые чешуйки) Шквал голов (2d10 взрыв) Невозможно повредить. Регенерирует любую потерянную часть тела и залечивает раны. Иногда притворяется слабой, чтобы обмануть нападающих, будто у них есть шанс. Одна из голов всегда держит какое-то сокровище (см. ниже), привлекая жертв."
          },
          {
            "id": "mb.myth:56:role:2",
            "title": "Рыцарь Свечи, Аллуан",
            "text": "СИЛ 14, ЯСН 13, ДУХ 8, 8ЗЩ Б3 (кольчуга, латы, белый шлем) Длинный меч (2d8 тяжелый), короткий меч (2d6) Может шептать в свечу, чтобы передать сообщение в любую точку Королевства. Хочет уйти подальше от Гидры."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:56:omen:1",
            "ordinal": 1,
            "text": "The Candle Knight lies broken on the road, unable to walk. He tells of the Hydra that rose from a stagnant pool. It killed the rest of his company. It cannot be killed. It must be endured."
          },
          {
            "id": "mb.myth:56:omen:2",
            "ordinal": 2,
            "text": "A wide hole leading into damp darkness. Any disturbance awakens the Hydra, which bursts out and attacks the company. It is unaffected by any attacks."
          },
          {
            "id": "mb.myth:56:omen:3",
            "ordinal": 3,
            "text": "Atop a hill, the Hydra cries triumphantly among the ruins of a shattered stone fortification. It fights if disturbed, mocking the company if they fail to understand that it cannot be killed."
          },
          {
            "id": "mb.myth:56:omen:4",
            "ordinal": 4,
            "text": "Fire spreads rapidly through the trees. The Hydra ambushes the company, now able to breathe fire (d8 blast)."
          },
          {
            "id": "mb.myth:56:omen:5",
            "ordinal": 5,
            "text": "A roar from above, and the Hydra descends, now with wings and the ability to fly."
          },
          {
            "id": "mb.myth:56:omen:6",
            "ordinal": 6,
            "text": "Visibly weakened, the Hydra crawls towards a bubbling spring. As it submerges, the water boils and turns black, and the Hydra disappears."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:56:role:1",
            "title": "The Hydra, punishment for past sins",
            "text": "VIG 19, CLA 10, SPI 7, 12GD\nA5 (impenetrable scales)\nFlurry of heads (2d10 blast)\nCannot be harmed. Regenerates any lost body part and heals its wounds. Sometimes feigns weakness to fool attackers into believing they have a chance. One head always holds some treasure (see below), luring victims."
          },
          {
            "id": "mb.myth:56:role:2",
            "title": "The Candle Knight, Aluane",
            "text": "VIG 14, CLA 13, SPI 8, 8GD\nA3 (mail, plate, white helm)\nLongsword (2d8 hefty), shortsword (2d6)\nCan whisper into a candle to send a message anywhere in the Realm. Wants to get far away from the Hydra."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 141, роль1: «см. ниже». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 141, role 1: \"see below\". The instruction is retained; its target is not linked automatically in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:57",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 143,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:57:omen:1",
            "ordinal": 1,
            "text": "Щеголевато одетый собиратель грибов жалуется на скудный урожай. Он говорит, что великий грибной шпиль уже должен был появиться, чтобы распространить новые грибы по всему Королевству."
          },
          {
            "id": "mb.myth:57:omen:2",
            "ordinal": 2,
            "text": "Желтые споры разносятся ветром. Те, кто их вдыхает, начинают видеть, как мир вокруг них гнется и дышит, на земле открываются рты. Это вскоре проходит."
          },
          {
            "id": "mb.myth:57:omen:3",
            "ordinal": 3,
            "text": "Шесть грибных слуг собирают еду, чтобы доставить ее обратно к Шпилю. Они берут, не спрашивая, но у них нет воли к борьбе."
          },
          {
            "id": "mb.myth:57:omen:4",
            "ordinal": 4,
            "text": "Круглая хижина на лесистом холме, изнутри доносится крик. Две звездочетки, сестры, каждая кричит, что другая — оборотень с небес. Обе были обмануты галлюциногенными спорами."
          },
          {
            "id": "mb.myth:57:omen:5",
            "ordinal": 5,
            "text": "Грибной рыцарь шаркает вперед, удостоверяясь, что никто не собирается вмешиваться в дела Шпиля. У него мало желания сражаться, он просто хочет разложиться до состояния жижи."
          },
          {
            "id": "mb.myth:57:omen:6",
            "ordinal": 6,
            "text": "Плеск, слышимый по всему Королевству. Шпиль и все грибные существа тают в слизь, просачиваясь в землю. В следующем сезоне грибов будет вдоволь."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:57:role:1",
            "title": "Шпиль, великая грибная башня",
            "text": "9ЗЩ, считается постройкой Б2 (упругая плоть) Споры вызывают приятные галлюцинации у друзей и кошмары у врагов."
          },
          {
            "id": "mb.myth:57:role:2",
            "title": "Грибной слуга, рожден Шпилем",
            "text": "СИЛ 10, ЯСН 5, ДУХ 5, 1ЗЩ Тяжелый кулак (d6), яркая окраска Хочет собирать еду для Шпиля. Не понимает идеи собственности."
          },
          {
            "id": "mb.myth:57:role:3",
            "title": "Грибной рыцарь, гниет",
            "text": "СИЛ 13, ЯСН 7, ДУХ 8, 3ЗЩ Б2 (плесневелая кольчуга, щит) Грибная булава (d8 тяжелая), щит (d4) Нетерпелив, хочет полностью сгнить."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:57:omen:1",
            "ordinal": 1,
            "text": "A dapper mushroom gatherer complains of a poor harvest. He says the great fungal spire should have appeared by now to spread new mushrooms throughout the Realm."
          },
          {
            "id": "mb.myth:57:omen:2",
            "ordinal": 2,
            "text": "Yellow spores drift on the wind. Those who inhale them see the world around them bend and breathe, with mouths opening in the ground. This soon passes."
          },
          {
            "id": "mb.myth:57:omen:3",
            "ordinal": 3,
            "text": "Six fungal serfs gather food to carry back to the Spire. They take without asking, but have no will to fight."
          },
          {
            "id": "mb.myth:57:omen:4",
            "ordinal": 4,
            "text": "A round hut on a wooded hill, with screams coming from within. Two stargazing sisters each shout that the other is a shapeshifter from the heavens. Both have been deceived by hallucinogenic spores."
          },
          {
            "id": "mb.myth:57:omen:5",
            "ordinal": 5,
            "text": "A Fungal Knight shuffles forward, making sure nobody intends to interfere with the Spire. He has little desire to fight; he simply wants to decompose into slurry."
          },
          {
            "id": "mb.myth:57:omen:6",
            "ordinal": 6,
            "text": "A splash heard throughout the Realm. The Spire and all fungal creatures melt into slime, seeping into the ground. Mushrooms will be plentiful next Season."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:57:role:1",
            "title": "The Spire, great fungal tower",
            "text": "9GD, treated as a structure\nA2 (springy flesh)\nSpores cause pleasant hallucinations in friends and nightmares in enemies."
          },
          {
            "id": "mb.myth:57:role:2",
            "title": "Fungal serf, born of the Spire",
            "text": "VIG 10, CLA 5, SPI 5, 1GD\nHeavy fist (d6), vivid colouring\nWants to gather food for the Spire. Does not understand the idea of ownership."
          },
          {
            "id": "mb.myth:57:role:3",
            "title": "Fungal Knight, rotting",
            "text": "VIG 13, CLA 7, SPI 8, 3GD\nA2 (mouldy mail, shield)\nFungal mace (d8 hefty), shield (d4)\nImpatient, wants to rot away completely."
          }
        ]
      }
    },
    "references": []
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:58",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 145,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:58:omen:1",
            "ordinal": 1,
            "text": "Полусонный рыбак у пруда, покрытого ряской. Он предупреждает, что «старая леди из пруда» не заслуживает доверия."
          },
          {
            "id": "mb.myth:58:omen:2",
            "ordinal": 2,
            "text": "Пруд густо покрыт ряской, из воды появляется Спрайт — старая женщина с голосом и движениями ребенка. Она проявляет интерес к одному из членов Отряда и задает множество вопросов о нем, прежде чем скрыться в пруду."
          },
          {
            "id": "mb.myth:58:omen:3",
            "ordinal": 3,
            "text": "Еще один пруд, покрытый ряской. Спрайт появляется в центре, на этот раз серьезная. Она просит своего избранного назвать любой предмет, из прошлого, настоящего или будущего. Она настаивает, пока не получит ответ, затем уходит под воду."
          },
          {
            "id": "mb.myth:58:omen:4",
            "ordinal": 4,
            "text": "Два существа из зеленоватой воды (см. напротив) ссорятся, громко заявляя: «Она любит только меня»."
          },
          {
            "id": "mb.myth:58:omen:5",
            "ordinal": 5,
            "text": "Тихое озеро, зеленые руки Спрайт появляются на берегу, держа в руках запрошенный предмет для своего избранного. Она нападает, если дар отвергают."
          },
          {
            "id": "mb.myth:58:omen:6",
            "ordinal": 6,
            "text": "Спрайт, теперь уже в гневе, приходит, чтобы вернуть подарок. Она заберет его силой, если понадобится."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:58:role:1",
            "title": "Спрайт, Старая леди из пруда, Врундл",
            "text": "СИЛ 12, ЯСН 16, ДУХ 16, 7ЗЩ Б1 (мантия из густой ряски) Созданный из воды клинок (3d6) или стрелы (2d6) Стремится вмешаться в естественный порядок вещей. Испытывает яркую любовь к одной вещи за раз, но скоро забывает о ней."
          },
          {
            "id": "mb.myth:58:role:2",
            "title": "Водяное существо",
            "text": "СИЛ 10, ЯСН 4, ДУХ 4, 3ЗЩ В прошлом люди, утопленные Спрайт. Жаждут ее любви, но она их забыла."
          },
          {
            "id": "mb.myth:58:role:3",
            "title": "Сонный рыбак, Мукс",
            "text": "СИЛ 12, ЯСН 6, ДУХ 10, 4ЗЩ Б1 (ржавый шлем-котелок), лоскутная одежда Планирует мелко отомстить Спрайт, но она его уже забыла."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:58:omen:1",
            "ordinal": 1,
            "text": "A half-asleep fisher by a duckweed-covered pond. He warns that the \"old lady of the pond\" cannot be trusted."
          },
          {
            "id": "mb.myth:58:omen:2",
            "ordinal": 2,
            "text": "A pond thick with duckweed. The Sprite emerges from the water: an old woman with a child's voice and movements. She takes an interest in one member of the company and asks many questions about them before disappearing into the pond."
          },
          {
            "id": "mb.myth:58:omen:3",
            "ordinal": 3,
            "text": "Another duckweed-covered pond. The Sprite appears in the centre, serious this time. She asks her chosen one to name any object from the past, present, or future. She insists until she receives an answer, then slips underwater."
          },
          {
            "id": "mb.myth:58:omen:4",
            "ordinal": 4,
            "text": "Two beings of greenish water (see opposite) quarrel, each loudly declaring, \"She loves only me.\""
          },
          {
            "id": "mb.myth:58:omen:5",
            "ordinal": 5,
            "text": "A still lake. The Sprite's green arms emerge at the shore, holding the requested object for her chosen one. She attacks if the gift is rejected."
          },
          {
            "id": "mb.myth:58:omen:6",
            "ordinal": 6,
            "text": "The Sprite, now angry, comes to reclaim her gift. She will take it by force if necessary."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:58:role:1",
            "title": "The Sprite, old girl of the pond, Wrundl",
            "text": "VIG 12, CLA 16, SPI 16, 7GD\nA1 (mantle of thick duckweed)\nBlade formed from water (3d6) or arrows (2d6)\nWants to interfere with the natural order. Feels passionate love for one thing at a time, but soon forgets it."
          },
          {
            "id": "mb.myth:58:role:2",
            "title": "Watery being",
            "text": "VIG 10, CLA 4, SPI 4, 3GD\nOnce people drowned by the Sprite. Yearn for her love, but she has forgotten them."
          },
          {
            "id": "mb.myth:58:role:3",
            "title": "Drowsy fisherman, Mucks",
            "text": "VIG 12, CLA 6, SPI 10, 4GD\nA1 (rusty kettle helm), patchwork clothes\nPlans petty revenge against the Sprite, but she has already forgotten him."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 145, знамение4: «см. напротив». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 145, Omen 4: \"see opposite\". The instruction is retained; its target is not linked automatically in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:59",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 147,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:59:omen:1",
            "ordinal": 1,
            "text": "В земле раскрывается дыра, разрастаясь, поглощая деревья и камни. Маленький серый дыролюд, Графф, забирается на дерево. Она стесняется, но объясняет, что им нужно поработать на поверхности. Люди сверху не могут зайти в Дыру, им мешает невидимая сила."
          },
          {
            "id": "mb.myth:59:omen:2",
            "ordinal": 2,
            "text": "Четыре дыролюда пробегают мимо с криками. Злой мужчина на лошади преследует их, считая шпионами из злого королевства. На самом деле они просто любопытны."
          },
          {
            "id": "mb.myth:59:omen:3",
            "ordinal": 3,
            "text": "Команда долбителей сколачивает свой великий проект (см. Напротив). Объясняют что это, но не почему и не будут поддерживать разговор."
          },
          {
            "id": "mb.myth:59:omen:4",
            "ordinal": 4,
            "text": "Медвепрь вываливается из леса, бросая вызов любому животному, которое оспорит его независимость. Жалкое зрелище."
          },
          {
            "id": "mb.myth:59:omen:5",
            "ordinal": 5,
            "text": "Банда дыролюдов заковала Медвепря в цепи и ведет его обратно в Дыру, куда его ранее изгнали"
          },
          {
            "id": "mb.myth:59:omen:6",
            "ordinal": 6,
            "text": "Команда долбителей запечатывает дыру в земле, последний вход в их мир, после того, как выполнили свою работу."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:59:role:1",
            "title": "Дыролюды, крохи из Дыры",
            "text": "СИЛ 7, ЯСН 7, ДУХ 15, 5ЗЩ Хорошо прячутся. Не хотят и не могут драться. Хотят исследовать каждый угол каждого Королевства."
          },
          {
            "id": "mb.myth:59:role:2",
            "title": "Долбители, нефритовые строители",
            "text": "СИЛ 10, ЯСН 15, ДУХ 3, 1ЗЩ Б2 (зеленый шлем и латы) Каменный молот (d8 тяжелый, соединяет природные объекты, словно мощный клей) Хотят, чтобы все делали их работу."
          },
          {
            "id": "mb.myth:59:role:3",
            "title": "Медвепрь, сверженный король зверей",
            "text": "СИЛ 15, ЯСН 12, ДУХ 4, 6ЗЩ Б2 (крупное тело, побитая кольчуга) Усталые когти (2d8) Хочет, чтобы его уважали или боялись."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:59:omen:1",
            "ordinal": 1,
            "text": "A hole opens in the ground, widening and swallowing trees and stones. A small grey Holfolk, Gruff, climbs a tree. She is shy, but explains that they have work to do on the surface. Those from above cannot enter the Hole, held back by an invisible force."
          },
          {
            "id": "mb.myth:59:omen:2",
            "ordinal": 2,
            "text": "Four Holfolk run past screaming. An angry man on horseback pursues them, believing them spies from an evil Realm. They are merely curious."
          },
          {
            "id": "mb.myth:59:omen:3",
            "ordinal": 3,
            "text": "A team of Ardwrights constructs their great project (see opposite). They explain what it is, but not why, and will not sustain a conversation."
          },
          {
            "id": "mb.myth:59:omen:4",
            "ordinal": 4,
            "text": "A Bear-a-boar tumbles out of the woods, challenging any animal that would dispute its independence. A pitiful sight."
          },
          {
            "id": "mb.myth:59:omen:5",
            "ordinal": 5,
            "text": "A gang of Holfolk has chained the Bear-a-boar and leads it back to the Hole, from which it was previously exiled."
          },
          {
            "id": "mb.myth:59:omen:6",
            "ordinal": 6,
            "text": "Having completed their work, a team of Ardwrights seals the hole in the ground, the last entrance to their world."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:59:role:1",
            "title": "Holfolk, little ones of the Hole",
            "text": "VIG 7, CLA 7, SPI 15, 5GD\nGood at hiding. Unwilling and unable to fight. Want to explore every corner of every Realm."
          },
          {
            "id": "mb.myth:59:role:2",
            "title": "Ardwright, the jade architects",
            "text": "VIG 10, CLA 15, SPI 3, 1GD\nA2 (green helm and plate)\nRockhammer (d8 hefty, joins natural objects like a powerful glue)\nWant everyone to do their work."
          },
          {
            "id": "mb.myth:59:role:3",
            "title": "Bear-a-boar, deposed king of beasts",
            "text": "VIG 15, CLA 12, SPI 4, 6GD\nA2 (large body, battered mail)\nWeary claws (2d8)\nWants to be respected or feared."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 147, знамение3: «см. Напротив». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 147, Omen 3: \"see opposite\". The instruction is retained; its target is not linked automatically in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:60",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 149,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:60:omen:1",
            "ordinal": 1,
            "text": "Воздух становится прохладным, и начинает подниматься слабый туман. Мимо пролетает стая красных ворон, издающих пронзительные крики, как будто спеша куда-то."
          },
          {
            "id": "mb.myth:60:omen:2",
            "ordinal": 2,
            "text": "Туман сгущается, превращаясь в холодную свинцовую завесу. Видимость за пределами каждого Гекса становится нулевой."
          },
          {
            "id": "mb.myth:60:omen:3",
            "ordinal": 3,
            "text": "Шесть ужасов скрываются за пределами видимости, издавая пугающие звуки и слабые тени. Они преследуют Отряд, но атакуют только если кто-то останется один."
          },
          {
            "id": "mb.myth:60:omen:4",
            "ordinal": 4,
            "text": "Туман становится еще гуще, видимость ограничивается несколькими футами. Даже яркий свет угасает до тусклого свечения. Все передвижения происходят вслепую."
          },
          {
            "id": "mb.myth:60:omen:5",
            "ordinal": 5,
            "text": "Отколовшееся от ближайшего Удела войско ополченцев открывает огонь по Отряду, принимая их за ужасы, скрывающиеся в Тумане."
          },
          {
            "id": "mb.myth:60:omen:6",
            "ordinal": 6,
            "text": "Глухо звонит колокол, едва видимый через Туман силуэт огромной фигуры проходит мимо. К нему невозможно приблизиться. Когда он исчезает вдалеке, Туман начинает рассеиваться. К утру он полностью исчезает, оставляя серебристую росу. В Тумане навсегда исчезает Провидец."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:60:role:1",
            "title": "Туман",
            "text": "Отгоняется дымом сжигаемых костей."
          },
          {
            "id": "mb.myth:60:role:2",
            "title": "Смятенные ополченцы, Харльгер во главе",
            "text": "СИЛ 10, ЯСН 10, ДУХ 8, 4ЗЩ Б2 (кольчужный плащ, полный шлем) Короткий лук (d6), топор (d8), топорик (d6) У Харльгер есть длинный лук (d8 длинный), она хочет свергнуть своего бывшего господина."
          },
          {
            "id": "mb.myth:60:role:3",
            "title": "Ужас в тумане, отчаянный сталкер",
            "text": "СИЛ 7, ЯСН 14, ДУХ 4, 4ЗЩ Б1 (холодная шкура) Когти и клыки (2d6) Боится колоколов и быть замеченным. Изменяющаяся форма (см. ниже, часто перебрасывайте)."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:60:omen:1",
            "ordinal": 1,
            "text": "The air cools and a faint mist begins to rise. A flock of red crows flies past, shrieking as though in a hurry."
          },
          {
            "id": "mb.myth:60:omen:2",
            "ordinal": 2,
            "text": "The mist thickens into a cold, leaden veil. Nothing can be seen beyond each Hex."
          },
          {
            "id": "mb.myth:60:omen:3",
            "ordinal": 3,
            "text": "Six horrors lurk out of sight, making frightening sounds and faint shadows. They stalk the company, but attack only if somebody is left alone."
          },
          {
            "id": "mb.myth:60:omen:4",
            "ordinal": 4,
            "text": "The mist grows even thicker, limiting visibility to a few feet. Even bright light fades to a dim glow. All travel is blind."
          },
          {
            "id": "mb.myth:60:omen:5",
            "ordinal": 5,
            "text": "A breakaway militia warband from the nearest Holding opens fire on the company, mistaking them for the horrors lurking in the Mist."
          },
          {
            "id": "mb.myth:60:omen:6",
            "ordinal": 6,
            "text": "A bell tolls dully. The silhouette of an enormous figure passes, barely visible through the Mist. It cannot be approached. As it vanishes into the distance, the Mist begins to clear. By morning it is gone, leaving silvery dew. A Seer disappears forever in the Mist."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:60:role:1",
            "title": "The Mist",
            "text": "Driven away by smoke from burning bones."
          },
          {
            "id": "mb.myth:60:role:2",
            "title": "Bewildered militia, led by Harlger",
            "text": "VIG 10, CLA 10, SPI 8, 4GD\nA2 (mail cloak, full helm)\nShortbow (d6), axe (d8), hatchet (d6)\nHarlger has a longbow (d8 long). She wants to overthrow her former lord."
          },
          {
            "id": "mb.myth:60:role:3",
            "title": "Horror in the Mist, desperate stalker",
            "text": "VIG 7, CLA 14, SPI 4, 4GD\nA1 (cold hide)\nClaws and fangs (2d6)\nFears bells and being seen. A changing shape (see below; reroll often)."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 149, роль3: «см. ниже». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 149, role 3: \"see below\". The instruction is retained; its target is not linked automatically in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:61",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 151,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:61:omen:1",
            "ordinal": 1,
            "text": "Два шумных парня карабкаются по руинам храма и разбивают потрепанную статую тяжелым молотом. Они говорят, что просто выполняют приказы ближайшего Провидца."
          },
          {
            "id": "mb.myth:61:omen:2",
            "ordinal": 2,
            "text": "Гаргулья спускается на Отряд, крича, что не причинит вреда. Она ищет потерянный предмет и ожидает, что Рыцари его найдут. Она устроит ссору для своего удовольствия, если сможет, иначе просто уйдет."
          },
          {
            "id": "mb.myth:61:omen:3",
            "ordinal": 3,
            "text": "На вершине огромных каменных руин Гаргулья руками вырезает из камня зверей. Два таких зверя наблюдают за ней, с нетерпением ожидая нового спутника."
          },
          {
            "id": "mb.myth:61:omen:4",
            "ordinal": 4,
            "text": "В тени серого дерева Гаргулья спорит с ближайшим Провидцем. Она утверждает, что именно она один дарует Провидцам их знания. Это ложь."
          },
          {
            "id": "mb.myth:61:omen:5",
            "ordinal": 5,
            "text": "Двое парней, разбивавших статуи, лежат окаменевшие от укуса одного из созданных зверей."
          },
          {
            "id": "mb.myth:61:omen:6",
            "ordinal": 6,
            "text": "В карьере Гаргулья разбивает своих созданных зверей в щебень одного за другим. Они не сопротивляются. После этого она улетает в другое Королевство, объявив это скучным."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:61:role:1",
            "title": "Гаргулья, Астергрист",
            "text": "СИЛ 14, ЯСН 17, ДУХ 12, 6ЗЩ Б4 (огромное каменное тело), неуклюжий полет Большие когти (2d8) и хвост (d10 взрыв) Начитана, характер скверный. Ненавидит солнце. Хочет вернуть все старое. Всегда ищет конкретный предмет (см. ниже)."
          },
          {
            "id": "mb.myth:61:role:2",
            "title": "Высеченный зверь",
            "text": "СИЛ 10, ЯСН 6, ДУХ 6, 3ЗЩ Б3 (каменное тело, волкоподобный) Каменный укус (2d8, раны вызывают медленное окаменение жертвы в течение недели, отменяется только если Гаргулья дарует прощение) Бездумно служит прихотям Гаргульи."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:61:omen:1",
            "ordinal": 1,
            "text": "Two rowdy lads climb through a ruined temple and smash a weathered statue with a heavy hammer. They say they are simply following orders from the nearest Seer."
          },
          {
            "id": "mb.myth:61:omen:2",
            "ordinal": 2,
            "text": "The Gargoyle swoops down towards the company, shouting that he means no harm. He seeks a lost object and expects the Knights to find it. He will stir up an argument for his own amusement if he can; otherwise he simply leaves."
          },
          {
            "id": "mb.myth:61:omen:3",
            "ordinal": 3,
            "text": "Atop vast stone ruins, the Gargoyle carves beasts from stone with his hands. Two such beasts watch, eagerly awaiting a new companion."
          },
          {
            "id": "mb.myth:61:omen:4",
            "ordinal": 4,
            "text": "In the shade of a grey tree, the Gargoyle argues with the nearest Seer. He claims that he alone grants the Seers their knowledge. This is a lie."
          },
          {
            "id": "mb.myth:61:omen:5",
            "ordinal": 5,
            "text": "The two statue-smashing lads lie petrified, bitten by one of the sculpted beasts."
          },
          {
            "id": "mb.myth:61:omen:6",
            "ordinal": 6,
            "text": "In a quarry, the Gargoyle smashes his sculpted beasts into rubble, one by one. They do not resist. He then flies away to another Realm, declaring this one boring."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:61:role:1",
            "title": "The Gargoyle, Astergrist",
            "text": "VIG 14, CLA 17, SPI 12, 6GD\nA4 (enormous stone body), clumsy flight\nGreat claws (2d8) and tail (d10 blast)\nWell read, foul tempered. Hates sunlight. Wants to reclaim everything old. Always seeks a particular object (see below)."
          },
          {
            "id": "mb.myth:61:role:2",
            "title": "Sculpted beast",
            "text": "VIG 10, CLA 6, SPI 6, 3GD\nA3 (stone body, wolf-like)\nStone bite (2d8; wounds slowly petrify the victim over a week, reversed only if the Gargoyle grants forgiveness)\nMindlessly serves the Gargoyle's whims."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 151, роль1: «см. ниже». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 151, role 1: \"see below\". The instruction is retained; its target is not linked automatically in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:62",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 153,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:62:omen:1",
            "ordinal": 1,
            "text": "Порыв теплого ветра. Голубь смотрит на одного из Рыцарей вопросительно, а затем улетает. Тайно выберите жертву или бросьте кость (см. напротив); Подменыш ее захватил, украл ее облик, воспоминания и место в рамках Королевства."
          },
          {
            "id": "mb.myth:62:omen:2",
            "ordinal": 2,
            "text": "Пожилой всадник сидит на стене, его коня прогнали рогатые волки. Он передает предупреждение от Провидца: Подменыш ходит по Королевству. Никому не доверяйте."
          },
          {
            "id": "mb.myth:62:omen:3",
            "ordinal": 3,
            "text": "Зрелая Рыцарь (сгенерируйте как обычно) прибывает в Королевство, стремясь предложить свои услуги Престолу. Если она не Подменыш, у нее добрые намерения."
          },
          {
            "id": "mb.myth:62:omen:4",
            "ordinal": 4,
            "text": "Дверь из плоти в стволе дерева. Она захлопывается, как только ее заметили, не оставляя следов."
          },
          {
            "id": "mb.myth:62:omen:5",
            "ordinal": 5,
            "text": "Пара рогатых волков выскакивает из засады, атакуя случайного члена Отряда, пытаясь утащить его."
          },
          {
            "id": "mb.myth:62:omen:6",
            "ordinal": 6,
            "text": "Тот, кто является Подменышем, стоит на поляне, повернувшись к Отряду спиной. Если его потревожат, он развернется в свою истинную форму и сбежит, ища проход обратно в свой мир."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:62:role:1",
            "title": "Подменыш, в своей истинной форме",
            "text": "СИЛ 10, ЯСН 16, ДУХ 17, 8ЗЩ Б2 (меняющаяся, бесформенная оболочка) Искажающее касание (d8, Смертельная рана превращает жертву в мягкую дрожащую массу)"
          },
          {
            "id": "mb.myth:62:role:2",
            "title": "Пожилой всадник, Бельтор",
            "text": "СИЛ 6, ЯСН 6, ДУХ 9, 9ЗЩ Б2 (кольчуга, кожаный шлем) Длин.меч (2d8 тяжелый), метательные топоры (d6) Хриплый голос. Отказался от рыцарства."
          },
          {
            "id": "mb.myth:62:role:3",
            "title": "Рогатые волки, Маликорн",
            "text": "СИЛ 12, ЯСН 8, ДУХ 3, 3ЗЩ Напороть и порвать (2d8), стараются ослабить цель и вернуться позже, чтобы завершить дело."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:62:omen:1",
            "ordinal": 1,
            "text": "A gust of warm wind. A dove looks questioningly at one of the Knights, then flies away. Secretly choose a victim or roll a die (see opposite); the Changeling has captured them, stealing their appearance, memories, and place within the Realm."
          },
          {
            "id": "mb.myth:62:omen:2",
            "ordinal": 2,
            "text": "An elderly rider sits on a wall, his horse driven away by horned wolves. He brings a Seer's warning: a Changeling walks the Realm. Trust nobody."
          },
          {
            "id": "mb.myth:62:omen:3",
            "ordinal": 3,
            "text": "A mature Knight (generate as usual) arrives in the Realm, keen to offer her services to the Seat of Power. If she is not the Changeling, her intentions are good."
          },
          {
            "id": "mb.myth:62:omen:4",
            "ordinal": 4,
            "text": "A door of flesh in a tree trunk. It slams shut as soon as it is noticed, leaving no trace."
          },
          {
            "id": "mb.myth:62:omen:5",
            "ordinal": 5,
            "text": "A pair of horned wolves springs from ambush, attacking a random member of the company and trying to drag them away."
          },
          {
            "id": "mb.myth:62:omen:6",
            "ordinal": 6,
            "text": "Whoever is the Changeling stands in a clearing with their back to the company. If disturbed, they unfold into their true form and flee, seeking a passage back to their world."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:62:role:1",
            "title": "The Changeling, in its true form",
            "text": "VIG 10, CLA 16, SPI 17, 8GD\nA2 (shifting, formless shell)\nWarping touch (d8; a Mortal Wound turns the victim into a soft, trembling mass)"
          },
          {
            "id": "mb.myth:62:role:2",
            "title": "Elderly rider, Beltor",
            "text": "VIG 6, CLA 6, SPI 9, 9GD\nA2 (mail, leather helm)\nLongsword (2d8 hefty), throwing axes (d6)\nHoarse voice. Turned down knighthood."
          },
          {
            "id": "mb.myth:62:role:3",
            "title": "Horned wolves, Malicorn",
            "text": "VIG 12, CLA 8, SPI 3, 3GD\nGore and rend (2d8); try to weaken their target and return later to finish the job."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 153, знамение1: «см. напротив». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 153, Omen 1: \"see opposite\". The instruction is retained; its target is not linked automatically in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:63",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 155,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:63:omen:1",
            "ordinal": 1,
            "text": "От мягких участков земли ощущается слабое тепло, как от углей вчерашнего костра."
          },
          {
            "id": "mb.myth:63:omen:2",
            "ordinal": 2,
            "text": "Из-за ряда деревьев поднимается дым. В лесу бушует огонь. Его можно остановить, если Отряд быстро примет меры, иначе этот небольшой участок леса сгорит дотла."
          },
          {
            "id": "mb.myth:63:omen:3",
            "ordinal": 3,
            "text": "Сад превращен в пепел, молодой фермер плачет среди углей. У него не остается выбора, кроме как просить о помощи в ближайшем Уделе."
          },
          {
            "id": "mb.myth:63:omen:4",
            "ordinal": 4,
            "text": "Из тлеющей трещины в земле вырывается Красный змей, извиваясь в горячем воздухе, как огромный угорь. Он требует золота и отказывается обсуждать что-либо другое."
          },
          {
            "id": "mb.myth:63:omen:5",
            "ordinal": 5,
            "text": "Каменная сторожевая башня, в которой находятся двое стражников, медленно погружается в землю. Камень, кажется, плавится, а земля открывается, поглощая башню в пламени."
          },
          {
            "id": "mb.myth:63:omen:6",
            "ordinal": 6,
            "text": "Змей обхватывает груду сокровищ, собранных со всего Королевства, медленно погружаясь обратно в расплавленную землю."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:63:role:1",
            "title": "Красный змей, Гиврегюль",
            "text": "СИЛ 18, ЯСН 10, ДУХ 10, 10ЗЩ Б4 (пылающая чешуя, полосы золотой брони) Щелкающая пасть (2d10), хвост-кнут (d10), огненное дыхание (3d10 взрыв, один раз за фазу). Царский голос. Хочет золота превыше всего и готов играть в долгую, чтобы получить больше."
          },
          {
            "id": "mb.myth:63:role:2",
            "title": "Молодой фермер, Итан",
            "text": "СИЛ 12, ЯСН 10, ДУХ 6, 2ЗЩ Пожитки, поврежденные дымом. Хочет построить новую жизнь, забыв прошлое."
          },
          {
            "id": "mb.myth:63:role:3",
            "title": "Стражи башни, Хендон и Терон",
            "text": "СИЛ 10, ЯСН 12, ДУХ 9, 3ЗЩ Б2 (гамбезон, шлем) Боевые вилы (d10 длин.), обед с собой (см. ниже) Хочет тихую жизнь и уважаемую работу."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:63:omen:1",
            "ordinal": 1,
            "text": "A faint warmth rises from soft patches of earth, like the embers of last night's fire."
          },
          {
            "id": "mb.myth:63:omen:2",
            "ordinal": 2,
            "text": "Smoke rises beyond a line of trees. Fire rages in the woods. The company can stop it by acting quickly; otherwise this small patch of woodland burns to the ground."
          },
          {
            "id": "mb.myth:63:omen:3",
            "ordinal": 3,
            "text": "An orchard reduced to ash. A young farmer weeps among the embers. He has no choice but to seek help at the nearest Holding."
          },
          {
            "id": "mb.myth:63:omen:4",
            "ordinal": 4,
            "text": "The Red Serpent bursts from a smouldering crack in the earth, writhing through the hot air like an enormous eel. It demands gold and refuses to discuss anything else."
          },
          {
            "id": "mb.myth:63:omen:5",
            "ordinal": 5,
            "text": "A stone watchtower, occupied by two guards, slowly sinks into the ground. Its stone seems to melt as the earth opens, engulfing the tower in flames."
          },
          {
            "id": "mb.myth:63:omen:6",
            "ordinal": 6,
            "text": "The Serpent coils around a heap of treasure gathered from across the Realm, slowly sinking back into the molten earth."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:63:role:1",
            "title": "The Red Serpent, Guivregule",
            "text": "VIG 18, CLA 10, SPI 10, 10GD\nA4 (blazing scales, strips of golden mail)\nSnapping jaws (2d10), whip-tail (d10), fire breath (3d10 blast, once per Phase)\nRegal voice. Wants gold above all else and is willing to play a long game to gain more."
          },
          {
            "id": "mb.myth:63:role:2",
            "title": "Young farmer, Etane",
            "text": "VIG 12, CLA 10, SPI 6, 2GD\nSmoke-damaged belongings. Wants to build a new life and forget the past."
          },
          {
            "id": "mb.myth:63:role:3",
            "title": "Tower guards, Hendon and Terone",
            "text": "VIG 10, CLA 12, SPI 9, 3GD\nA2 (gambeson, helm)\nWar forks (d10 long), packed lunch (see below)\nWant a quiet life and respectable work."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 155, роль3: «см. ниже». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 155, role 3: \"see below\". The instruction is retained; its target is not linked automatically in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:64",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 157,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:64:omen:1",
            "ordinal": 1,
            "text": "Ветер усиливается, шуршание ветвей ближайших деревьев на мгновение начинает напоминать музыку."
          },
          {
            "id": "mb.myth:64:omen:2",
            "ordinal": 2,
            "text": "Хилый плотник копается в лесу, ворча в поисках нужного вида дерева. Он говорит, что работает над великим проектом, но неохотно делится деталями."
          },
          {
            "id": "mb.myth:64:omen:3",
            "ordinal": 3,
            "text": "Плотник вскрикивает, отбиваясь от шести древесных сороконожек, пытаясь донести свежесрубленное дерево до мастерской."
          },
          {
            "id": "mb.myth:64:omen:4",
            "ordinal": 4,
            "text": "Ветер раскачивает ветви и листья, сверкающая музыка наполняет воздух, теперь достаточно громко, чтобы услышать ее отчетливо (см. напротив). Это затрагивает всех в Королевстве."
          },
          {
            "id": "mb.myth:64:omen:5",
            "ordinal": 5,
            "text": "Плотник едет на шаткой телеге, Арфа скрыта под серым одеялом. Он выглядит обеспокоенным, настаивая на том, чтобы Рыцари взяли Арфу и убедились, что она не попадет не в те руки."
          },
          {
            "id": "mb.myth:64:omen:6",
            "ordinal": 6,
            "text": "Парад послушников в белых плащах ведет совет Провидцев со всего Королевства. Они заявляют, что Арфа должна быть захоронена до тех пор, пока в ней не возникнет настоящая необходимость."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:64:role:1",
            "title": "Арфа, Орлиндра",
            "text": "Если играть с злым умыслом, это дальнобойная атака d12. Если играть успокаивающе, те, кто засыпает под ее музыку, восстанавливают все Добродетели. Если играть плохо, это наносит d12 Урона исполнителю. Если на арфе играет создатель, см. ниже."
          },
          {
            "id": "mb.myth:64:role:2",
            "title": "Хилый плотник, Квилфри",
            "text": "СИЛ 6, ЯСН 14, ДУХ 17, 2ЗЩ Неуклюжий топор (d8 длинный), растрепанная борода. Дрожащий голос и руки, оптимистичный дух. Знает, что Арфа будет его последней и самой важной работой."
          },
          {
            "id": "mb.myth:64:role:3",
            "title": "Древесная сороконожка, Фибрекс",
            "text": "СИЛ 7, ЯСН 5, ДУХ 2, 1ЗЩ Б1 (глянцевый панцирь), неутолимый аппетит. Челюсти (2d6 или пожирание деревянного предмета)."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:64:omen:1",
            "ordinal": 1,
            "text": "The wind picks up. For a moment, the rustling branches of nearby trees sound like music."
          },
          {
            "id": "mb.myth:64:omen:2",
            "ordinal": 2,
            "text": "A frail carpenter rummages through the woods, grumbling as he searches for the right kind of timber. He says he is working on a great project, but is reluctant to share details."
          },
          {
            "id": "mb.myth:64:omen:3",
            "ordinal": 3,
            "text": "The carpenter cries out, fighting off six wood centipedes as he tries to carry a freshly felled tree to his workshop."
          },
          {
            "id": "mb.myth:64:omen:4",
            "ordinal": 4,
            "text": "The wind sways branches and leaves. Shimmering music fills the air, now loud enough to hear clearly (see opposite). It affects everyone in the Realm."
          },
          {
            "id": "mb.myth:64:omen:5",
            "ordinal": 5,
            "text": "The carpenter rides a rickety cart, the Harp hidden beneath a grey blanket. He looks worried, insisting that the Knights take the Harp and ensure it does not fall into the wrong hands."
          },
          {
            "id": "mb.myth:64:omen:6",
            "ordinal": 6,
            "text": "A parade of white-cloaked acolytes leads a council of Seers from across the Realm. They declare that the Harp must be buried until there is a true need for it."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:64:role:1",
            "title": "The Harp, Orlyndra",
            "text": "Played with malicious intent, it makes a d12 ranged attack. Played soothingly, anyone who falls asleep to its music restores all Virtues. Played badly, it deals d12 Damage to the performer. If its maker plays it, see below."
          },
          {
            "id": "mb.myth:64:role:2",
            "title": "Frail carpenter, Quilfrey",
            "text": "VIG 6, CLA 14, SPI 17, 2GD\nClumsy axe (d8 long), unkempt beard\nTrembling voice and hands, optimistic spirit. Knows the Harp will be his last and most important work."
          },
          {
            "id": "mb.myth:64:role:3",
            "title": "Wood centipede, Fibrex, Scuttermum",
            "text": "VIG 7, CLA 5, SPI 2, 1GD\nA1 (glossy shell), insatiable appetite\nMandibles (2d6, or devour a wooden object)."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 157, знамение4: «см. напротив». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 157, Omen 4: \"see opposite\". The instruction is retained; its target is not linked automatically in this slice."
      },
      {
        "type": "unresolved",
        "description": "Стр. 157, роль1: «см. ниже». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 157, role 1: \"see below\". The instruction is retained; its target is not linked automatically in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:65",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 159,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:65:omen:1",
            "ordinal": 1,
            "text": "На горизонте виднеются извивающиеся ветви великого древа, черные и синие."
          },
          {
            "id": "mb.myth:65:omen:2",
            "ordinal": 2,
            "text": "Ветви на горизонте кажутся растущими с каждым мгновением, постепенно переходя в серый, а затем белый цвет, уходя в облака и распространяясь над каждой частью Королевства."
          },
          {
            "id": "mb.myth:65:omen:3",
            "ordinal": 3,
            "text": "Ветви скребут облака во всех уголках Королевства. С резким скрежетом шесть облачных разбойников падают с небес, приземляясь невредимыми и готовыми захватить все, что смогут унести обратно в облака."
          },
          {
            "id": "mb.myth:65:omen:4",
            "ordinal": 4,
            "text": "Ополченцы направляются к Древу, намереваясь его срубить. Они не знают, что земные инструменты не могут навредить Древу."
          },
          {
            "id": "mb.myth:65:omen:5",
            "ordinal": 5,
            "text": "Огромные ветви падают с неба по всему Королевству. Одна из них падает поблизости, и пара облачных существ, уцепившихся за нее, атакует в панике."
          },
          {
            "id": "mb.myth:65:omen:6",
            "ordinal": 6,
            "text": "С громовым скрипом Древо начинает наклоняться. Мгновение спустя оно падает, сопровождаемое дождем из веток. Гекс Мифа и все прилегающие Гексы оказываются опустошены, причиняя 2d12 урона всем, кто находится в их пределах."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:65:role:1",
            "title": "Облачные разбойники",
            "text": "СИЛ 14, ЯСН 8, ДУХ 8, 5ЗЩ Б1 (неясная форма), трезубец с крюком (d10) Желают забрать земные богатства обратно в облака, ценя все, что растет в почве."
          },
          {
            "id": "mb.myth:65:role:2",
            "title": "Ополченцы-лесорубы, Мелка во главе",
            "text": "СИЛ 11, ЯСН 8, ДУХ 8, 3ЗЩ Валящие топоры (d8 длин.), слабая мотивация У Мелки Б2 (шлем, кольчуга), театральный голос"
          },
          {
            "id": "mb.myth:65:role:3",
            "title": "Облачное существо",
            "text": "СИЛ 12, ЯСН 8, ДУХ 4, 3ЗЩ Б1 (сформировано из облака, см. ниже) Удар (d8), молния (d12, раз за Фазу) Просто хочет вернуться в облака."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:65:omen:1",
            "ordinal": 1,
            "text": "The twisting branches of a great tree appear on the horizon, black and blue."
          },
          {
            "id": "mb.myth:65:omen:2",
            "ordinal": 2,
            "text": "The branches on the horizon seem to grow with every moment, gradually turning grey, then white, rising into the clouds and spreading over every part of the Realm."
          },
          {
            "id": "mb.myth:65:omen:3",
            "ordinal": 3,
            "text": "Branches scrape the clouds throughout the Realm. With a harsh screech, six cloud raiders fall from the sky, landing unharmed and ready to seize everything they can carry back into the clouds."
          },
          {
            "id": "mb.myth:65:omen:4",
            "ordinal": 4,
            "text": "Militia march towards the Tree, intending to chop it down. They do not know that earthly tools cannot harm it."
          },
          {
            "id": "mb.myth:65:omen:5",
            "ordinal": 5,
            "text": "Enormous branches fall from the sky throughout the Realm. One lands nearby; a pair of cloud creatures clinging to it attack in panic."
          },
          {
            "id": "mb.myth:65:omen:6",
            "ordinal": 6,
            "text": "With a thunderous creak, the Tree begins to lean. A moment later it falls amid a rain of branches. The Myth's Hex and all adjacent Hexes are devastated, dealing 2d12 Damage to everyone within them."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:65:role:1",
            "title": "Cloud raiders",
            "text": "VIG 14, CLA 8, SPI 8, 5GD\nA1 (indistinct form), hooked trident (d10)\nWant to carry earthly riches back to the clouds, valuing anything that grows in soil."
          },
          {
            "id": "mb.myth:65:role:2",
            "title": "Woodcutting militia, led by Melca",
            "text": "VIG 11, CLA 8, SPI 8, 3GD\nFelling axes (d8 long), little motivation\nMelca has A2 (helm, mail) and a theatrical voice."
          },
          {
            "id": "mb.myth:65:role:3",
            "title": "Cloud creature",
            "text": "VIG 12, CLA 8, SPI 4, 3GD\nA1 (formed from cloud, see below)\nSlam (d8), lightning (d12, once per Phase)\nSimply wants to return to the clouds."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 159, роль3: «см. ниже». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 159, role 3: \"see below\". The instruction is retained; its target is not linked automatically in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:66",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 161,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:66:omen:1",
            "ordinal": 1,
            "text": "Радостная фермерша скачет и поет, ведя быка, целиком сделанного из золота. Она утверждает, что загадала желание на быка после того, как выпила воды из Пруда. Пока у нее нет особого плана, что делать с быком."
          },
          {
            "id": "mb.myth:66:omen:2",
            "ordinal": 2,
            "text": "Пожилой человек, молит о помощи. Утверждает, что проклятие сделало его старым, хотя раньше он был молодым и здоровым охотником."
          },
          {
            "id": "mb.myth:66:omen:3",
            "ordinal": 3,
            "text": "Под тенистым пологом, сквозь который пробивается свет, внимание привлекает Пруд, окруженный круглыми камнями."
          },
          {
            "id": "mb.myth:66:omen:4",
            "ordinal": 4,
            "text": "Два тела лежат в большом кровавом пятне, по-видимому, заколов друг друга. Между ними находится высохший пруд."
          },
          {
            "id": "mb.myth:66:omen:5",
            "ordinal": 5,
            "text": "Пруд снова появляется, на этот раз на вершине холма, среди зазубренных скал."
          },
          {
            "id": "mb.myth:66:omen:6",
            "ordinal": 6,
            "text": "В воздухе раздается журчание. Мшистая земля зевает, и поднимается большой каменный котел. Здесь Пруд дает достаточно воды, чтобы Отряд мог напиться вволю, но каждый получает только один эффект. Он останется здесь до конца Сезона."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:66:role:1",
            "title": "Пруд",
            "text": "Когда кто-то пьет мутную воду из Пруда, он делает спасбросок ДУХ. Если спасбросок успешен, он получает благословение, если провален — проклятие (см. ниже). Единственное исцеление — кровь великого кита. После этого Источник пересыхает."
          },
          {
            "id": "mb.myth:66:role:2",
            "title": "Фермерша, Долм, с Золотым Быком",
            "text": "СИЛ 10, ЯСН 6, ДУХ 13, 3ЗЩ Порывистая и импульсивная. Ищет другой пруд."
          },
          {
            "id": "mb.myth:66:role:3",
            "title": "Старый Нищий, Аластиг",
            "text": "СИЛ 8, ЯСН 8, ДУХ 7, 2ЗЩ Лук (d6), одежда, подбитая листьями. Выглядит старым, утверждает, что он молод."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:66:omen:1",
            "ordinal": 1,
            "text": "A joyful farmer skips and sings, leading a ox made entirely of gold. She claims she wished for the ox after drinking from the Pool. She has no particular plan for what to do with it yet."
          },
          {
            "id": "mb.myth:66:omen:2",
            "ordinal": 2,
            "text": "An elderly man begs for help. He claims a curse made him old, though he was previously a young, healthy hunter."
          },
          {
            "id": "mb.myth:66:omen:3",
            "ordinal": 3,
            "text": "Beneath a shady canopy pierced by shafts of light, a Pool surrounded by rounded stones draws attention."
          },
          {
            "id": "mb.myth:66:omen:4",
            "ordinal": 4,
            "text": "Two bodies lie in a great bloodstain, apparently having stabbed each other. A dried-up pool lies between them."
          },
          {
            "id": "mb.myth:66:omen:5",
            "ordinal": 5,
            "text": "The Pool appears again, this time atop a hill among jagged rocks."
          },
          {
            "id": "mb.myth:66:omen:6",
            "ordinal": 6,
            "text": "A gurgling fills the air. Mossy earth yawns open and a great stone cauldron rises. Here the Pool provides enough water for the company to drink their fill, but each receives only one effect. It remains here until the end of the Season."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:66:role:1",
            "title": "The Pool",
            "text": "Anyone drinking the Pool's murky water makes a SPI Save. On a success they receive a blessing; on a failure, a curse (see below). The only cure is the blood of a great whale. The Pool then dries up."
          },
          {
            "id": "mb.myth:66:role:2",
            "title": "Farmer, Dolm, with the Golden Ox",
            "text": "VIG 10, CLA 6, SPI 13, 3GD\nImpetuous and impulsive. Seeks another pool."
          },
          {
            "id": "mb.myth:66:role:3",
            "title": "Old beggar, Alastig",
            "text": "VIG 8, CLA 8, SPI 7, 2GD\nBow (d6), leaf-lined clothes\nLooks old, claims to be young."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 161, роль1: «см. ниже». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 161, role 1: \"see below\". The instruction is retained; its target is not linked automatically in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:67",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 163,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:67:omen:1",
            "ordinal": 1,
            "text": "С громкими шагами Рыцарь Слона проходит мимо вместе с вооруженными солдатами. Она марширует к Престолу, где ее должны принять, как подобает герою."
          },
          {
            "id": "mb.myth:67:omen:2",
            "ordinal": 2,
            "text": "Взбудораженные дети спорят, какие подвиги Рыцаря Слона были самыми великими (см. напротив)."
          },
          {
            "id": "mb.myth:67:omen:3",
            "ordinal": 3,
            "text": "Жестокий охотник наблюдает из тени, тихо предупреждая Отряд и спрашивая, не видели ли они Слона. Он охотится на него ради спорта."
          },
          {
            "id": "mb.myth:67:omen:4",
            "ordinal": 4,
            "text": "Слон лежит мертвый, Рыцарь Слона кричит от гнева, убегая в даль. Охотник затаился, ожидая подходящего момента, чтобы получить свой трофей."
          },
          {
            "id": "mb.myth:67:omen:5",
            "ordinal": 5,
            "text": "В грязной яме Рыцарь Слона мажет себя мокрой глиной, крича в небо на языке, который вы не понимаете. Она с боем отказывается от попыток остановить ее, уходя, когда полностью покрыта глиной."
          },
          {
            "id": "mb.myth:67:omen:6",
            "ordinal": 6,
            "text": "Глиняный монстр-слон ломает деревья, трубит в небо. Начинается сильный дождь, смывая существо в сырую землю."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:67:role:1",
            "title": "Слон, Балихантор",
            "text": "СИЛ 18, ЯСН 5, ДУХ 5, 6ЗЩ Б3 (крепкая шкура, кольчуга) Бивни (d10) и топот (2d10) Чувствует себя в безопасности только с Рыцарем Слона."
          },
          {
            "id": "mb.myth:67:role:2",
            "title": "Рыцарь Слона, Кастин",
            "text": "СИЛ 16, ЯСН 9, ДУХ 13, 8ЗЩ Б2 (гамбезон с синей вышивкой, шлем) Двуручный меч с крюком (2d10 медленный) Устала от скитаний. Хочет покоя и комфорта."
          },
          {
            "id": "mb.myth:67:role:3",
            "title": "Жестокий Охотник, Берах",
            "text": "СИЛ 14, ЯСН 16, ДУХ 6, 6ЗЩ Арбалет (2d8 медленный), тенистый плащ, бесчисленные горшки с приманкой и отпугивателями. Может Карать, стреляя в добычу."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:67:omen:1",
            "ordinal": 1,
            "text": "The Elephant Knight passes with thunderous footsteps, accompanied by armoured soldiers. She marches to the Seat of Power, where she is to receive a hero's welcome."
          },
          {
            "id": "mb.myth:67:omen:2",
            "ordinal": 2,
            "text": "Excited children argue over which of the Elephant Knight's deeds were greatest (see opposite)."
          },
          {
            "id": "mb.myth:67:omen:3",
            "ordinal": 3,
            "text": "A cruel hunter watches from the shadows, quietly alerting the company and asking whether they have seen the Elephant. He hunts it for sport."
          },
          {
            "id": "mb.myth:67:omen:4",
            "ordinal": 4,
            "text": "The Elephant lies dead. The Elephant Knight screams in fury and runs into the distance. The hunter lies hidden, waiting for the right moment to claim his trophy."
          },
          {
            "id": "mb.myth:67:omen:5",
            "ordinal": 5,
            "text": "In a muddy pit, the Elephant Knight smears herself with wet clay, shouting at the sky in a language you do not understand. She fights off any attempt to stop her, leaving once completely covered in clay."
          },
          {
            "id": "mb.myth:67:omen:6",
            "ordinal": 6,
            "text": "A monstrous clay elephant smashes trees and trumpets at the sky. Heavy rain begins, washing the creature into the damp earth."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:67:role:1",
            "title": "The Elephant, Balihanthor",
            "text": "VIG 18, CLA 5, SPI 5, 6GD\nA3 (tough hide, mail)\nTusks (d10) and trample (2d10)\nFeels safe only with the Elephant Knight."
          },
          {
            "id": "mb.myth:67:role:2",
            "title": "The Elephant Knight, Castine",
            "text": "VIG 16, CLA 9, SPI 13, 8GD\nA2 (gambeson with blue embroidery, helm)\nHooked greatsword (2d10 slow)\nTired of wandering. Wants peace and comfort."
          },
          {
            "id": "mb.myth:67:role:3",
            "title": "Cruel hunter, Berach",
            "text": "VIG 14, CLA 16, SPI 6, 6GD\nCrossbow (2d8 slow), shadowy cloak, countless pots of bait and repellents\nCan Smite when shooting his prey."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 163, знамение2: «см. напротив». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 163, Omen 2: \"see opposite\". The instruction is retained; its target is not linked automatically in this slice."
      },
      {
        "type": "unresolved",
        "description": "Стр. 163, роль3: упомянута Кара; справочные правила Кары не включены в этот срез.",
        "descriptionEn": "P. 163, role 3: Smite is mentioned; the reference rules for Smite are not included in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:68",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 165,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:68:omen:1",
            "ordinal": 1,
            "text": "На кривых камнях след от слизи оставил рунические надписи. Никто не узнает язык, но каждый может их понять. Они обещают «истину со временем»."
          },
          {
            "id": "mb.myth:68:omen:2",
            "ordinal": 2,
            "text": "Узкий проход, покрытый слизью, ведет вниз в темноту. На стенах внутри светятся руны, обещающие «путь туда, куда пожелаешь». Туннель ведет в нужное место всего за одну Фазу путешествия, закрывается, и пять спиральных существ устраивают засаду."
          },
          {
            "id": "mb.myth:68:omen:3",
            "ordinal": 3,
            "text": "Огромная пустая раковина улитки, напоминающая большую пещеру. Внутри показывается насмешливое видение будущего (см. напротив)."
          },
          {
            "id": "mb.myth:68:omen:4",
            "ordinal": 4,
            "text": "Спираль рун на белом утесе советует «избегать коротких путей»."
          },
          {
            "id": "mb.myth:68:omen:5",
            "ordinal": 5,
            "text": "Вся Область покрыта густой слизью. Животные отказываются двигаться по ней."
          },
          {
            "id": "mb.myth:68:omen:6",
            "ordinal": 6,
            "text": "Приближается Улитка. Она спрашивает, чему члены Отряда научились из ее уроков. Принимает любой ответ как доказательство своих методов и философии, затем скользит в другое Королевство, и ее слизь исчезает."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:68:role:1",
            "title": "Улитка, учитель времени, Глоссли",
            "text": "СИЛ 10, ЯСН 5, ДУХ 5, 1ЗЩ Б2 (или Б4, когда втянут в раковину) Медленный меч (2d6 медленный) Считает себя ответственным за поддержание структуры времени во всей реальности, но не знает, как это делать. Прикрывает это самодовольной уверенностью."
          },
          {
            "id": "mb.myth:68:role:2",
            "title": "Спиральное Существо",
            "text": "СИЛ 7, ЯСН 7, ДУХ 2, 3ЗЩ Кислотный укус (d8) Вызывает впечатление массы свернутых червей в форме пса. Распадается на мертвых червей при ранении."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:68:omen:1",
            "ordinal": 1,
            "text": "A slime trail has left runic inscriptions on crooked stones. Nobody recognises the language, but everyone can understand it. They promise \"truth in time\"."
          },
          {
            "id": "mb.myth:68:omen:2",
            "ordinal": 2,
            "text": "A narrow, slime-coated passage descends into darkness. Glowing runes on its walls promise \"a path to wherever you desire\". The tunnel reaches the desired place in just one Phase of travel, closes, and five helix beasts ambush the travellers."
          },
          {
            "id": "mb.myth:68:omen:3",
            "ordinal": 3,
            "text": "An enormous empty snail shell, like a large cavern. Inside, a mocking vision of the future appears (see opposite)."
          },
          {
            "id": "mb.myth:68:omen:4",
            "ordinal": 4,
            "text": "A spiral of runes on a white cliff advises, \"Avoid shortcuts.\""
          },
          {
            "id": "mb.myth:68:omen:5",
            "ordinal": 5,
            "text": "The entire Realm is covered in thick slime. Animals refuse to travel over it."
          },
          {
            "id": "mb.myth:68:omen:6",
            "ordinal": 6,
            "text": "The Snail approaches. He asks what the company has learned from his lessons. He accepts any answer as proof of his methods and philosophy, then glides into another Realm, his slime disappearing."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:68:role:1",
            "title": "The Snail, tutor of time, Glossly",
            "text": "VIG 10, CLA 5, SPI 5, 1GD\nA2 (or A4 while withdrawn into its shell)\nSlow sword (2d6 slow)\nBelieves itself responsible for maintaining the structure of time throughout reality, but does not know how. Covers this with smug confidence."
          },
          {
            "id": "mb.myth:68:role:2",
            "title": "Helix beast",
            "text": "VIG 7, CLA 7, SPI 2, 3GD\nAcid bite (d8)\nAppears to be a mass of coiled worms in the shape of a dog. Falls apart into dead worms when wounded."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 165, знамение3: «см. напротив». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 165, Omen 3: \"see opposite\". The instruction is retained; its target is not linked automatically in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:69",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 167,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:69:omen:1",
            "ordinal": 1,
            "text": "Из широкой пещеры на заросшем лозами утесе исходит глухой звук. Она кажется пустой, но эхо звучит странно."
          },
          {
            "id": "mb.myth:69:omen:2",
            "ordinal": 2,
            "text": "Трое железных паломников пытаются запечатать пещеру, утверждая, что та лишь навредит."
          },
          {
            "id": "mb.myth:69:omen:3",
            "ordinal": 3,
            "text": "Пещера, знакомая форма и эхо. На этот раз изнутри исходит сияние, освещающее три полезных кристалла (см. напротив)."
          },
          {
            "id": "mb.myth:69:omen:4",
            "ordinal": 4,
            "text": "Пещера вновь появляется на новом утесе, изнутри раздается слово «золото». Любой, кто войдет, пробудит зверя окаменевшей тьмы, который сражается лишь для того, чтобы предотвратить доступ к пещере. За зверем скрыт тяжелый сундук с золотом."
          },
          {
            "id": "mb.myth:69:omen:5",
            "ordinal": 5,
            "text": "Пещера появляется на валуне, теперь с отверстиями, как глаза, и сталактитами, как зубы. Она медленно начинает вещать, давая по одному ответу на вопрос каждому присутствующему рыцарю. Пещера знает все и отвечает максимально точно."
          },
          {
            "id": "mb.myth:69:omen:6",
            "ordinal": 6,
            "text": "Из тени выходит громадная фигура, словно сшитая из ткани тьмы. Это Собиратель Долгов, пришедший взыскать плату за Пещеру. Он принимает все, что имеет ценность, и пытается убить тех, кто отказывается платить."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:69:role:1",
            "title": "Зверь окаменевшей тьмы",
            "text": "СИЛ 12, ЯСН 12, ДУХ 7, 8ЗЩ Б3 (железной прочности тьма) Меч из тьмы (3d10) или вспышка несвета (d8 взрыв)"
          },
          {
            "id": "mb.myth:69:role:2",
            "title": "Железные паломники, Лаймон, Сид, Хайма",
            "text": "СИЛ 12, ЯСН 10, ДУХ 13, 3ЗЩ Робы и цепи, кузнечные инструменты"
          },
          {
            "id": "mb.myth:69:role:3",
            "title": "Собиратель долгов, Амбраллеон",
            "text": "СИЛ 16, ЯСН 16, ДУХ 7, 8ЗЩ Б2 (форма тени, холодные латы) Черное копье (2d8 тяжелое, можно бросить и призвать обратно в руку). Владеет Карой."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:69:omen:1",
            "ordinal": 1,
            "text": "A wide cave mouth looms in a vine-covered cliff. It seems empty, but its echoes sound strange."
          },
          {
            "id": "mb.myth:69:omen:2",
            "ordinal": 2,
            "text": "Three iron pilgrims try to seal the cave, claiming it will bring only harm."
          },
          {
            "id": "mb.myth:69:omen:3",
            "ordinal": 3,
            "text": "The Cave, with its familiar shape and echo. This time a glow comes from within, illuminating three useful crystals (see opposite)."
          },
          {
            "id": "mb.myth:69:omen:4",
            "ordinal": 4,
            "text": "The Cave appears again in another cliff, the word \"gold\" sounding from within. Anyone entering awakens a beast of solid darkness, which fights only to prevent access to the Cave. A heavy chest of gold lies hidden behind the beast."
          },
          {
            "id": "mb.myth:69:omen:5",
            "ordinal": 5,
            "text": "The Cave appears in a boulder, now with eye-like openings and tooth-like stalactites. It slowly begins to speak, answering one question from each Knight present. The Cave knows everything and answers as well as it can."
          },
          {
            "id": "mb.myth:69:omen:6",
            "ordinal": 6,
            "text": "A huge figure emerges from the shadows, as though stitched from the fabric of darkness. This is the Debt Collector, come to collect payment for the Cave. He accepts anything of value and tries to kill those who refuse to pay."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:69:role:1",
            "title": "Beast of solid darkness",
            "text": "VIG 12, CLA 12, SPI 7, 8GD\nA3 (darkness as strong as iron)\nSword of darkness (3d10) or flash of unlight (d8 blast)"
          },
          {
            "id": "mb.myth:69:role:2",
            "title": "Iron pilgrims, Lymon, Sid, Hayma",
            "text": "VIG 12, CLA 10, SPI 13, 3GD\nRobes and chains, smithing tools"
          },
          {
            "id": "mb.myth:69:role:3",
            "title": "Debt Collector, Ambralleon",
            "text": "VIG 16, CLA 16, SPI 7, 8GD\nA2 (shadow form, cold plate)\nBlack spear (2d8 hefty; can be thrown and summoned back to his hand). Can Smite."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 167, знамение3: «см. напротив». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 167, Omen 3: \"see opposite\". The instruction is retained; its target is not linked automatically in this slice."
      },
      {
        "type": "unresolved",
        "description": "Стр. 167, роль3: упомянута Кара; справочные правила Кары не включены в этот срез.",
        "descriptionEn": "P. 167, role 3: Smite is mentioned; the reference rules for Smite are not included in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:70",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 169,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:70:omen:1",
            "ordinal": 1,
            "text": "Мать и дочь, охотницы на уток, заметили, что недавно в Королевстве стало происходить нечто странное (см. напротив)."
          },
          {
            "id": "mb.myth:70:omen:2",
            "ordinal": 2,
            "text": "Ученый счетовод и его молодой писарь записывают наблюдения за природой. Он утверждает, что время порядка может быть близко, и тогда будущее можно предсказать с помощью расчетов, а не прихотей Провидцев."
          },
          {
            "id": "mb.myth:70:omen:3",
            "ordinal": 3,
            "text": "Великий мост, перекинутый через ущелье. На перилах сидит Рыцарь Драк. Она говорит, что обычно сражается с теми, кто проходит через мост, но теперь не видит смысла."
          },
          {
            "id": "mb.myth:70:omen:4",
            "ordinal": 4,
            "text": "Писарь счетовода едет, трубя в горн. Он объявляет, что Аппарат готов, и счетовод может предсказывать будущее с абсолютной точностью. Эпоха Провидцев закончилась!"
          },
          {
            "id": "mb.myth:70:omen:5",
            "ordinal": 5,
            "text": "Войско рыцарей, верных Провидцам, мчится к Аппарату, чтобы уничтожить его, требуя от Отряда присоединиться к ним."
          },
          {
            "id": "mb.myth:70:omen:6",
            "ordinal": 6,
            "text": "Счетовод едет на старом коне, умоляя Отряд о защите. Если его оставить без помощи, рыцари, верные Провидцам, доберутся до Аппарата и разрушат его."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:70:role:1",
            "title": "Аппарат, Пророческое устройство",
            "text": "Медные пружины и шестеренки. Предсказывает будущее с абсолютной точностью, но требует много времени."
          },
          {
            "id": "mb.myth:70:role:2",
            "title": "Ученый счетовод, Альфгер",
            "text": "СИЛ 10, ЯСН 17, ДУХ 14, 2ЗЩ Мешок со свитками, занятый ум"
          },
          {
            "id": "mb.myth:70:role:3",
            "title": "Циничный Рыцарь Драк, Чаркабол",
            "text": "СИЛ 15, ЯСН 6, ДУХ 6, 7ЗЩ Б2 (слоеная кольчуга, ведро-шлем) Тяжелые рукавицы (d8 каждая) Чувствует, что все тщетно. Не может объяснить."
          },
          {
            "id": "mb.myth:70:role:4",
            "title": "Рыцари, верные Провидцам",
            "text": "СИЛ 12, ЯСН 12, ДУХ 12, 7ЗЩ Б3 (кольчуга, шлем, каплевидный щит) Топор (d8 тяжелый), каплевидный щит (d4)"
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:70:omen:1",
            "ordinal": 1,
            "text": "A mother and daughter, duck trappers, have noticed a strange order in the Realm recently (see opposite)."
          },
          {
            "id": "mb.myth:70:omen:2",
            "ordinal": 2,
            "text": "A learned numerator and his young scribe record observations of nature. He claims that a time of order may be close, when calculations will predict the future, rather than the whims of Seers."
          },
          {
            "id": "mb.myth:70:omen:3",
            "ordinal": 3,
            "text": "A great bridge spans a gorge. The Brawler Knight sits on its railing. She says she usually fights those who cross the bridge, but no longer sees the point."
          },
          {
            "id": "mb.myth:70:omen:4",
            "ordinal": 4,
            "text": "The numerator's scribe rides past, sounding a horn. He announces that the Apparatus is ready and the numerator can predict the future with absolute accuracy. The age of Seers is over!"
          },
          {
            "id": "mb.myth:70:omen:5",
            "ordinal": 5,
            "text": "A warband of Knights loyal to the Seers races towards the Apparatus to destroy it, demanding that the company join them."
          },
          {
            "id": "mb.myth:70:omen:6",
            "ordinal": 6,
            "text": "The numerator rides an old horse, begging the company for protection. Without help, the Knights loyal to the Seers reach the Apparatus and destroy it."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:70:role:1",
            "title": "The Apparatus, oracular device",
            "text": "Copper springs and gears. Predicts the future with absolute accuracy, but takes a great deal of time."
          },
          {
            "id": "mb.myth:70:role:2",
            "title": "Learned numerator, Alfger",
            "text": "VIG 10, CLA 17, SPI 14, 2GD\nSack of scrolls, busy mind"
          },
          {
            "id": "mb.myth:70:role:3",
            "title": "Cynical Brawler Knight, Charcabol",
            "text": "VIG 15, CLA 6, SPI 6, 7GD\nA2 (layered mail, bucket helm)\nHeavy gauntlets (d8 each)\nFeels that everything is futile. Cannot explain why."
          },
          {
            "id": "mb.myth:70:role:4",
            "title": "Knights loyal to the Seers",
            "text": "VIG 12, CLA 12, SPI 12, 7GD\nA3 (mail, full helm, kite shield)\nAxe (d8 hefty), kite shield (d4)"
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 169, знамение1: «см. напротив». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 169, Omen 1: \"see opposite\". The instruction is retained; its target is not linked automatically in this slice."
      }
    ]
  },
  {
    "definitionId": "mb.myth",
    "definitionVersion": 1,
    "entryId": "mb.myth:71",
    "materialVersion": 1,
    "sourceEdition": "mythic-bastionland-ru-core-v1",
    "sourcePage": 171,
    "locales": {
      "ru": {
        "omens": [
          {
            "id": "mb.myth:71:omen:1",
            "ordinal": 1,
            "text": "Ветер, несущий запах стали и крови."
          },
          {
            "id": "mb.myth:71:omen:2",
            "ordinal": 2,
            "text": "Танцующий фермер гонит гусей и тащит за собой скелет, завернутый в ткань. Она радостно говорит, что несет своего деда к Скале, единственному месту для такого воина."
          },
          {
            "id": "mb.myth:71:omen:3",
            "ordinal": 3,
            "text": "Рыцарь Алебастра стоит на страже у засохшего дерева, на ветвях которого осталось всего несколько плодов (см. напротив). Он объясняет, что эти плоды предназначены для воинов, возвращающихся со Скалы. Наказание за поедание плодов может быть снято Провидцем."
          },
          {
            "id": "mb.myth:71:omen:4",
            "ordinal": 4,
            "text": "Группа из девяти паломников ищет Скалу. Они предлагают защитные талисманы рыцарям. Эти талисманы гарантируют, что воины, возвращающиеся со Скалы, не примут рыцарей за врагов Королевства."
          },
          {
            "id": "mb.myth:71:omen:5",
            "ordinal": 5,
            "text": "Освежающая, бодрящая буря. С каждой вспышкой молнии слышен звук битвы."
          },
          {
            "id": "mb.myth:71:omen:6",
            "ordinal": 6,
            "text": "Туман отступает от озера, открывая скалистый остров в середине, на берегу стоит лодка. Три ревущих войска, готовые к смерти, хотят служить Королевству в бою последний раз."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:71:role:1",
            "title": "Рыцарь Алебастра, Денебод",
            "text": "СИЛ 15, ЯСН 8, ДУХ 8, 4ЗЩ Б4 (тело из белого камня) Клеймор из черного камня (3d10 медленный) Носит белого питона, который нашептывает мудрые советы, но не может кусать или вредить."
          },
          {
            "id": "mb.myth:71:role:2",
            "title": "Паломники Скалы, Марик во главе",
            "text": "СИЛ 10, ЯСН 10, ДУХ 13, 2ЗЩ Красные плащи, мешки с оружием, предназначенным в качестве подношений воинам Скалы"
          },
          {
            "id": "mb.myth:71:role:3",
            "title": "Воины Скалы, Олтиар во главе",
            "text": "СИЛ 16, ЯСН 10, ДУХ 16, 8ЗЩ Б2 (древняя кольчуга, шлем) Меч из сгинувшего металла (2d8 длинный) Хотят сражаться в достойной битве. Владеют Карой."
          }
        ]
      },
      "en": {
        "omens": [
          {
            "id": "mb.myth:71:omen:1",
            "ordinal": 1,
            "text": "A wind carrying the scent of steel and blood."
          },
          {
            "id": "mb.myth:71:omen:2",
            "ordinal": 2,
            "text": "A dancing farmer drives geese before her and drags a cloth-wrapped skeleton behind. She cheerfully says she is taking her grandfather to the Rock, the only place for such a warrior."
          },
          {
            "id": "mb.myth:71:omen:3",
            "ordinal": 3,
            "text": "The Alabaster Knight guards a withered tree with only a few fruits left on its branches (see opposite). He explains that these fruits are for warriors returning from the Rock. A Seer can lift the punishment for eating them."
          },
          {
            "id": "mb.myth:71:omen:4",
            "ordinal": 4,
            "text": "A group of nine pilgrims seeks the Rock. They offer protective charms to the Knights. These charms ensure that warriors returning from the Rock will not mistake the Knights for enemies of the Realm."
          },
          {
            "id": "mb.myth:71:omen:5",
            "ordinal": 5,
            "text": "A refreshing, invigorating storm. With every flash of lightning comes the sound of battle."
          },
          {
            "id": "mb.myth:71:omen:6",
            "ordinal": 6,
            "text": "Mist retreats from a lake, revealing a rocky island at its centre, with a rowboat on the shore. Three roaring warbands of warriors wait in death, ready to serve the Realm in battle one last time."
          }
        ],
        "roles": [
          {
            "id": "mb.myth:71:role:1",
            "title": "The Alabaster Knight, Denebawde",
            "text": "VIG 15, CLA 8, SPI 8, 4GD\nA4 (body of white stone)\nBlack stone greatsword (3d10 slow)\nCarries a white python that whispers wise advice, but cannot bite or harm."
          },
          {
            "id": "mb.myth:71:role:2",
            "title": "Pilgrims of the Rock, led by Marik",
            "text": "VIG 10, CLA 10, SPI 13, 2GD\nRed cloaks, sacks of weapons intended as offerings to the warriors of the Rock"
          },
          {
            "id": "mb.myth:71:role:3",
            "title": "Warriors of the Rock, led by Olthiar",
            "text": "VIG 16, CLA 10, SPI 16, 8GD\nA2 (ancient mail, helm)\nSword of extinct metal (2d8 long)\nWant to fight a worthy battle. Can Smite."
          }
        ]
      }
    },
    "references": [
      {
        "type": "unresolved",
        "description": "Стр. 171, знамение3: «см. напротив». Указание сохранено; целевой фрагмент не связан автоматически в этом срезе.",
        "descriptionEn": "P. 171, Omen 3: \"see opposite\". The instruction is retained; its target is not linked automatically in this slice."
      },
      {
        "type": "unresolved",
        "description": "Стр. 171, роль3: упомянута Кара; справочные правила Кары не включены в этот срез.",
        "descriptionEn": "P. 171, role 3: Smite is mentioned; the reference rules for Smite are not included in this slice."
      }
    ]
  }
]);
export default mythMaterialRecords;
