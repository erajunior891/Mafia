/**
 * mafia-city-bedrock - Global Game Configuration
 * Все параметры баланса, таймингов и ролей из ТЗ v1.3
 */

export interface RoleDistribution {
  mafia_boss: number;
  mafia_goon: number;
  doctor: number;
  investigator: number;
  grandpa: number;
  citizen: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  weight: number;
  isSilent: boolean;
  modelNumber?: string;
}

export const GAME_CONFIG = {
  // --- Режим разработки и отладки ---
  debug: {
    enabled: true,
    commandPrefix: "!mafia",
    logVerbose: true
  },

  // --- Настройка распределения ролей ---
  roles: {
    // Базовые пресеты распределения
    presets: {
      6: {
        mafia_boss: 1,
        mafia_goon: 1,
        doctor: 1,
        investigator: 1,
        grandpa: 1,
        citizen: 1
      },
      8: {
        mafia_boss: 1,
        mafia_goon: 2,
        doctor: 1,
        investigator: 1,
        grandpa: 1,
        citizen: 2
      }
    } as Record<number, RoleDistribution>,

    /**
     * Динамический расчёт ролей для любого количества игроков
     */
    calculateRoster(playerCount: number): RoleDistribution {
      if (playerCount <= 6) {
        return { ...this.presets[6] };
      }
      if (playerCount <= 8) {
        return { ...this.presets[8] };
      }
      // При игроках > 8: состав как при 8, все остальные становятся Горожанами
      const base = { ...this.presets[8] };
      const citizenCount = playerCount - (base.mafia_boss + base.mafia_goon + base.doctor + base.investigator + base.grandpa);
      base.citizen = Math.max(0, citizenCount);
      return base;
    }
  },

  // --- Тайминги фаз (в секундах) ---
  timings: {
    preparationSeconds: 15,
    daySeconds: 300,        // 5 минут
    votingSeconds: 60,      // 60 секунд
    nightSeconds: 180,      // 3 минуты
    morningSeconds: 120,    // 2 минуты
    roleAnimation: {
      totalTicks: 160,      // 8 секунд слепоты и темноты
      cardShowTick: 70,     // 3.5 сек - показ карточки
      cardDurationTicks: 50 // 2.5 сек - длительность показа
    }
  },

  // --- Взлом дверей и замки ---
  doorLock: {
    pickDurationTicks: 40,   // ~2 сек удержания
    successChance: 0.65,     // 65% тихий взлом
    alarmSound: "random.break",
    quietSound: "random.door_open",
    ownerAlertMessage: "§c[Тревога] Кто-то ломится в вашу дверь!"
  },

  // --- Свет и саботаж ---
  lighting: {
    sabotagePerGoonPerDay: 1, // 1 саботаж в день на Шестёрку
    nightBlackoutChance: 0.12 // 12% шанс случайного отключения света ночью на дом
  },

  // --- Оружие и улики ---
  weapons: {
    pool: [
      { id: "knife", name: "Нож", weight: 30, isSilent: true },
      { id: "rev_214", name: "Револьвер 214", weight: 25, isSilent: false, modelNumber: "214" },
      { id: "rev_387", name: "Револьвер 387", weight: 25, isSilent: false, modelNumber: "387" },
      { id: "rev_529", name: "Револьвер 529", weight: 20, isSilent: false, modelNumber: "529" }
    ] as WeaponDef[],
    serialKillsForGuaranteedKnife: 2, // 2 убийства граждан подряд -> 3-е гарантированно нож с отпечатками
    gunshotRadius: 32                // Радиус в блоках, где слышен звук выстрела
  },

  // --- Перчатки и перенос трупа ---
  corpse: {
    carrierSlownessAmplifier: 1, // Slowness II (значение 1 в Bedrock Effect API)
    carrierSlownessDurationTicks: 40, // Накладывается тиком пока несёт
    crimeSceneDetectionRadius: 2.5,   // Радиус осмотра места преступления
    corpseInspectRadius: 2.5
  },

  // --- Дед (Grandpa) ---
  grandpa: {
    patrolChance: 0.40,               // 40% шанс выхода на патруль ночью
    nightSlownessAmplifier: 2,        // Slowness III ночью
    rifleMaxAmmo: 3,                  // 3 заряда ружья за ночь
    hitDebuffDurationTicks: 600,      // 30 секунд слабости и замедления мафиози
    mafiaAttackDeathChance: 0.90      // 90% шанс гибели при атаке мафии
  },

  // --- Доктор ---
  doctor: {
    allowConsecutiveSameTarget: false // Запрет защиты одного игрока 2 ночи подряд
  },

  // --- Досье (генерация) ---
  dossier: {
    names: [
      "Джеймс Уилсон", "Роберт Смит", "Майкл Браун", "Томас Андерсон",
      "Уильям Кларк", "Дэвид Миллер", "Ричард Дэвис", "Чарльз Мартин",
      "Джозеф Холл", "Джон Уайт", "Эдвард Харрис", "Артур Морган",
      "Джордж Бейкер", "Генри Тейлор", "Фрэнк Капоне", "Винсент Моретти"
    ],
    jobs: [
      "Пекарь", "Библиотекарь", "Автомеханик", "Банковский клерк",
      "Учитель", "Портной", "Фармацевт", "Часовщик", "Столяр",
      "Почтальон", "Бухгалтер", "Журналист", "Электрик"
    ],
    licenses: [
      "Лицензия на охоту",
      "Водительское удостоверение",
      "Лицензия на хранение оружия",
      "Разрешение на торговлю",
      "Лицензия пилота",
      "Нет лицензий"
    ],
    verdicts: {
      citizen: "Выглядит нормально",
      doctor: "Выглядит нормально",
      investigator: "Выглядит нормально",
      grandpa: "Есть вопросы",
      mafia_goon: "Нечисто",
      mafia_boss: "Преступник"
    } as Record<string, string>
  }
};
