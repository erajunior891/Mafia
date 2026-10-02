// BP/scripts/src/main.ts
import {
  world as world8,
  system as system5,
  Player as Player9
} from "@minecraft/server";

// BP/scripts/src/modules/debug/debugManager.ts
import { Player as Player7, world as world6 } from "@minecraft/server";

// BP/scripts/src/modules/game/gameManager.ts
import { system as system3, world as world5 } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

// BP/scripts/src/config.ts
var GAME_CONFIG = {
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
    },
    /**
     * Динамический расчёт ролей для любого количества игроков
     */
    calculateRoster(playerCount) {
      if (playerCount <= 6) {
        return { ...this.presets[6] };
      }
      if (playerCount <= 8) {
        return { ...this.presets[8] };
      }
      const base = { ...this.presets[8] };
      const citizenCount = playerCount - (base.mafia_boss + base.mafia_goon + base.doctor + base.investigator + base.grandpa);
      base.citizen = Math.max(0, citizenCount);
      return base;
    }
  },
  // --- Тайминги фаз (в секундах) ---
  timings: {
    preparationSeconds: 15,
    daySeconds: 300,
    // 5 минут
    votingSeconds: 60,
    // 60 секунд
    nightSeconds: 180,
    // 3 минуты
    morningSeconds: 120,
    // 2 минуты
    roleAnimation: {
      totalTicks: 160,
      // 8 секунд слепоты и темноты
      cardShowTick: 70,
      // 3.5 сек - показ карточки
      cardDurationTicks: 50
      // 2.5 сек - длительность показа
    }
  },
  // --- Взлом дверей и замки ---
  doorLock: {
    pickDurationTicks: 40,
    // ~2 сек удержания
    successChance: 0.65,
    // 65% тихий взлом
    alarmSound: "random.break",
    quietSound: "random.door_open",
    ownerAlertMessage: "\xA7c[\u0422\u0440\u0435\u0432\u043E\u0433\u0430] \u041A\u0442\u043E-\u0442\u043E \u043B\u043E\u043C\u0438\u0442\u0441\u044F \u0432 \u0432\u0430\u0448\u0443 \u0434\u0432\u0435\u0440\u044C!"
  },
  // --- Свет и саботаж ---
  lighting: {
    sabotagePerGoonPerDay: 1,
    // 1 саботаж в день на Шестёрку
    nightBlackoutChance: 0.12
    // 12% шанс случайного отключения света ночью на дом
  },
  // --- Оружие и улики ---
  weapons: {
    pool: [
      { id: "knife", name: "\u041D\u043E\u0436", weight: 30, isSilent: true },
      { id: "rev_214", name: "\u0420\u0435\u0432\u043E\u043B\u044C\u0432\u0435\u0440 214", weight: 25, isSilent: false, modelNumber: "214" },
      { id: "rev_387", name: "\u0420\u0435\u0432\u043E\u043B\u044C\u0432\u0435\u0440 387", weight: 25, isSilent: false, modelNumber: "387" },
      { id: "rev_529", name: "\u0420\u0435\u0432\u043E\u043B\u044C\u0432\u0435\u0440 529", weight: 20, isSilent: false, modelNumber: "529" }
    ],
    serialKillsForGuaranteedKnife: 2,
    // 2 убийства граждан подряд -> 3-е гарантированно нож с отпечатками
    gunshotRadius: 32
    // Радиус в блоках, где слышен звук выстрела
  },
  // --- Перчатки и перенос трупа ---
  corpse: {
    carrierSlownessAmplifier: 1,
    // Slowness II (значение 1 в Bedrock Effect API)
    carrierSlownessDurationTicks: 40,
    // Накладывается тиком пока несёт
    crimeSceneDetectionRadius: 2.5,
    // Радиус осмотра места преступления
    corpseInspectRadius: 2.5
  },
  // --- Дед (Grandpa) ---
  grandpa: {
    patrolChance: 0.4,
    // 40% шанс выхода на патруль ночью
    nightSlownessAmplifier: 2,
    // Slowness III ночью
    rifleMaxAmmo: 3,
    // 3 заряда ружья за ночь
    hitDebuffDurationTicks: 600,
    // 30 секунд слабости и замедления мафиози
    mafiaAttackDeathChance: 0.9
    // 90% шанс гибели при атаке мафии
  },
  // --- Доктор ---
  doctor: {
    allowConsecutiveSameTarget: false
    // Запрет защиты одного игрока 2 ночи подряд
  },
  // --- Досье (генерация) ---
  dossier: {
    names: [
      "\u0414\u0436\u0435\u0439\u043C\u0441 \u0423\u0438\u043B\u0441\u043E\u043D",
      "\u0420\u043E\u0431\u0435\u0440\u0442 \u0421\u043C\u0438\u0442",
      "\u041C\u0430\u0439\u043A\u043B \u0411\u0440\u0430\u0443\u043D",
      "\u0422\u043E\u043C\u0430\u0441 \u0410\u043D\u0434\u0435\u0440\u0441\u043E\u043D",
      "\u0423\u0438\u043B\u044C\u044F\u043C \u041A\u043B\u0430\u0440\u043A",
      "\u0414\u044D\u0432\u0438\u0434 \u041C\u0438\u043B\u043B\u0435\u0440",
      "\u0420\u0438\u0447\u0430\u0440\u0434 \u0414\u044D\u0432\u0438\u0441",
      "\u0427\u0430\u0440\u043B\u044C\u0437 \u041C\u0430\u0440\u0442\u0438\u043D",
      "\u0414\u0436\u043E\u0437\u0435\u0444 \u0425\u043E\u043B\u043B",
      "\u0414\u0436\u043E\u043D \u0423\u0430\u0439\u0442",
      "\u042D\u0434\u0432\u0430\u0440\u0434 \u0425\u0430\u0440\u0440\u0438\u0441",
      "\u0410\u0440\u0442\u0443\u0440 \u041C\u043E\u0440\u0433\u0430\u043D",
      "\u0414\u0436\u043E\u0440\u0434\u0436 \u0411\u0435\u0439\u043A\u0435\u0440",
      "\u0413\u0435\u043D\u0440\u0438 \u0422\u0435\u0439\u043B\u043E\u0440",
      "\u0424\u0440\u044D\u043D\u043A \u041A\u0430\u043F\u043E\u043D\u0435",
      "\u0412\u0438\u043D\u0441\u0435\u043D\u0442 \u041C\u043E\u0440\u0435\u0442\u0442\u0438"
    ],
    jobs: [
      "\u041F\u0435\u043A\u0430\u0440\u044C",
      "\u0411\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0430\u0440\u044C",
      "\u0410\u0432\u0442\u043E\u043C\u0435\u0445\u0430\u043D\u0438\u043A",
      "\u0411\u0430\u043D\u043A\u043E\u0432\u0441\u043A\u0438\u0439 \u043A\u043B\u0435\u0440\u043A",
      "\u0423\u0447\u0438\u0442\u0435\u043B\u044C",
      "\u041F\u043E\u0440\u0442\u043D\u043E\u0439",
      "\u0424\u0430\u0440\u043C\u0430\u0446\u0435\u0432\u0442",
      "\u0427\u0430\u0441\u043E\u0432\u0449\u0438\u043A",
      "\u0421\u0442\u043E\u043B\u044F\u0440",
      "\u041F\u043E\u0447\u0442\u0430\u043B\u044C\u043E\u043D",
      "\u0411\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440",
      "\u0416\u0443\u0440\u043D\u0430\u043B\u0438\u0441\u0442",
      "\u042D\u043B\u0435\u043A\u0442\u0440\u0438\u043A"
    ],
    licenses: [
      "\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F \u043D\u0430 \u043E\u0445\u043E\u0442\u0443",
      "\u0412\u043E\u0434\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u043E\u0435 \u0443\u0434\u043E\u0441\u0442\u043E\u0432\u0435\u0440\u0435\u043D\u0438\u0435",
      "\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F \u043D\u0430 \u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u043E\u0440\u0443\u0436\u0438\u044F",
      "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u043D\u0430 \u0442\u043E\u0440\u0433\u043E\u0432\u043B\u044E",
      "\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F \u043F\u0438\u043B\u043E\u0442\u0430",
      "\u041D\u0435\u0442 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0439"
    ],
    verdicts: {
      citizen: "\u0412\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u043D\u043E\u0440\u043C\u0430\u043B\u044C\u043D\u043E",
      doctor: "\u0412\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u043D\u043E\u0440\u043C\u0430\u043B\u044C\u043D\u043E",
      investigator: "\u0412\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u043D\u043E\u0440\u043C\u0430\u043B\u044C\u043D\u043E",
      grandpa: "\u0415\u0441\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441\u044B",
      mafia_goon: "\u041D\u0435\u0447\u0438\u0441\u0442\u043E",
      mafia_boss: "\u041F\u0440\u0435\u0441\u0442\u0443\u043F\u043D\u0438\u043A"
    }
  }
};

// BP/scripts/src/modules/roles/roleManager.ts
import { system, world } from "@minecraft/server";

// BP/scripts/src/modules/roles/types.ts
var ROLE_DEFINITIONS = {
  mafia_boss: {
    id: "mafia_boss",
    name: "\u0413\u043B\u0430\u0432\u0430 \u041C\u0430\u0444\u0438\u0438",
    team: "mafia",
    description: "\u0417\u043D\u0430\u0435\u0442 \u0432\u0441\u0435\u0445 \u0447\u043B\u0435\u043D\u043E\u0432 \u043C\u0430\u0444\u0438\u0438. \u0412\u044B\u0431\u0438\u0440\u0430\u0435\u0442 \u043D\u043E\u0447\u043D\u0443\u044E \u0436\u0435\u0440\u0442\u0432\u0443. \u0418\u043C\u0435\u0435\u0442 \u043E\u0442\u043C\u044B\u0447\u043A\u0443.",
    colorTag: "\xA74"
  },
  mafia_goon: {
    id: "mafia_goon",
    name: "\u0428\u0435\u0441\u0442\u0451\u0440\u043A\u0430",
    team: "mafia",
    description: "\u041F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u0413\u043B\u0430\u0432\u0435. \u0414\u043D\u0451\u043C \u043C\u043E\u0436\u0435\u0442 \u0441\u0430\u0431\u043E\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0432\u0435\u0442 \u0432 1 \u0434\u043E\u043C\u0435. \u0418\u043C\u0435\u0435\u0442 \u043E\u0442\u043C\u044B\u0447\u043A\u0443.",
    colorTag: "\xA7c"
  },
  doctor: {
    id: "doctor",
    name: "\u0414\u043E\u043A\u0442\u043E\u0440",
    team: "civilian",
    description: "\u041D\u043E\u0447\u044C\u044E \u0437\u0430\u0449\u0438\u0449\u0430\u0435\u0442 1 \u0438\u0433\u0440\u043E\u043A\u0430 \u043E\u0442 \u043D\u0430\u043F\u0430\u0434\u0435\u043D\u0438\u044F \u043C\u0430\u0444\u0438\u0438.",
    colorTag: "\xA7a"
  },
  investigator: {
    id: "investigator",
    name: "\u0421\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C",
    team: "civilian",
    description: "\u041E\u0441\u043C\u0430\u0442\u0440\u0438\u0432\u0430\u0435\u0442 \u0442\u0440\u0443\u043F\u044B \u0438 \u043C\u0435\u0441\u0442\u043E \u043F\u0440\u0435\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F, \u0430 \u0442\u0430\u043A\u0436\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u0442 \u0434\u043E\u0441\u044C\u0435 \u0438\u0433\u0440\u043E\u043A\u043E\u0432.",
    colorTag: "\xA7b"
  },
  grandpa: {
    id: "grandpa",
    name: "\u0414\u0435\u0434",
    team: "civilian",
    description: "\u041D\u043E\u0447\u044C\u044E \u043C\u043E\u0436\u0435\u0442 \u0432\u044B\u0439\u0442\u0438 \u043D\u0430 \u043F\u0430\u0442\u0440\u0443\u043B\u044C \u0441\u043E \u0441\u0432\u043E\u0438\u043C \u0440\u0443\u0436\u044C\u0451\u043C. \u0417\u0430\u043C\u0435\u0434\u043B\u0435\u043D \u043D\u043E\u0447\u044C\u044E.",
    colorTag: "\xA7e"
  },
  citizen: {
    id: "citizen",
    name: "\u0413\u043E\u0440\u043E\u0436\u0430\u043D\u0438\u043D",
    team: "civilian",
    description: "\u041C\u0438\u0440\u043D\u044B\u0439 \u0436\u0438\u0442\u0435\u043B\u044C. \u0414\u043D\u0451\u043C \u0443\u0447\u0430\u0441\u0442\u0432\u0443\u0435\u0442 \u0432 \u0440\u0430\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0438 \u0438 \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043D\u0438\u0438.",
    colorTag: "\xA7f"
  }
};

// BP/scripts/src/modules/dossier/dossierManager.ts
var DossierManager = class {
  dossiers = /* @__PURE__ */ new Map();
  /**
   * Сгенерировать досье для игрока при старте игры
   */
  generateDossier(playerId, playerName, roleId) {
    const names = GAME_CONFIG.dossier.names;
    const jobs = GAME_CONFIG.dossier.jobs;
    const licensesPool = GAME_CONFIG.dossier.licenses;
    const fakeName = names[Math.floor(Math.random() * names.length)];
    const age = roleId === "grandpa" ? Math.floor(Math.random() * 15) + 65 : Math.floor(Math.random() * 40) + 22;
    const currentYear = 1950;
    const birthYear = currentYear - age;
    const job = roleId === "doctor" ? "\u0412\u0440\u0430\u0447-\u0442\u0435\u0440\u0430\u043F\u0435\u0432\u0442" : jobs[Math.floor(Math.random() * jobs.length)];
    const licenses = [];
    if (roleId === "grandpa") {
      licenses.push("\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F \u043D\u0430 \u043E\u0445\u043E\u0442\u0443 \u0438 \u0440\u0443\u0436\u044C\u0451");
    } else {
      const randomLicense = licensesPool[Math.floor(Math.random() * licensesPool.length)];
      if (randomLicense !== "\u041D\u0435\u0442 \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0439") {
        licenses.push(randomLicense);
      }
    }
    const verdict = GAME_CONFIG.dossier.verdicts[roleId] || "\u0412\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u043D\u043E\u0440\u043C\u0430\u043B\u044C\u043D\u043E";
    const dossier = {
      playerId,
      playerName,
      fakeName,
      age,
      birthYear,
      job,
      licenses,
      verdict
    };
    this.dossiers.set(playerId, dossier);
    return dossier;
  }
  getDossier(playerId) {
    return this.dossiers.get(playerId);
  }
  clear() {
    this.dossiers.clear();
  }
};
var dossierManager = new DossierManager();

// BP/scripts/src/modules/roles/roleManager.ts
var RoleManager = class {
  playerRoles = /* @__PURE__ */ new Map();
  alivePlayers = /* @__PURE__ */ new Set();
  getRole(playerId) {
    return this.playerRoles.get(playerId);
  }
  setRole(playerId, role) {
    this.playerRoles.set(playerId, role);
    this.alivePlayers.add(playerId);
  }
  isAlive(playerId) {
    return this.alivePlayers.has(playerId);
  }
  markDead(playerId) {
    this.alivePlayers.delete(playerId);
    const deadRole = this.getRole(playerId);
    if (deadRole === "mafia_boss") {
      this.promoteGoonToBoss();
    }
  }
  /**
   * Назначение случайной Шестёрки новым Главой Мафии
   */
  promoteGoonToBoss() {
    const livingGoons = [];
    for (const player of world.getAllPlayers()) {
      if (this.isAlive(player.id) && this.getRole(player.id) === "mafia_goon") {
        livingGoons.push(player);
      }
    }
    if (livingGoons.length > 0) {
      const luckyGoon = livingGoons[Math.floor(Math.random() * livingGoons.length)];
      this.playerRoles.set(luckyGoon.id, "mafia_boss");
      luckyGoon.sendMessage("\xA74\xA7l[!] \u0412\u0430\u0448 \u0413\u043B\u0430\u0432\u0430 \u043F\u043E\u0433\u0438\u0431. \u0422\u0435\u043F\u0435\u0440\u044C \u0412\u042B \u2014 \u043D\u043E\u0432\u044B\u0439 \u0413\u043B\u0430\u0432\u0430 \u041C\u0430\u0444\u0438\u0438!");
      this.playRoleRevealAnimation(luckyGoon, "mafia_boss", "\u0412\u044B \u0432\u043E\u0437\u0433\u043B\u0430\u0432\u0438\u043B\u0438 \u0441\u0435\u043C\u044C\u044E!");
    } else {
      world.sendMessage("\xA7c\u0413\u043B\u0430\u0432\u0430 \u041C\u0430\u0444\u0438\u0438 \u043F\u043E\u0433\u0438\u0431, \u0438 \u0443 \u043C\u0430\u0444\u0438\u0438 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0428\u0435\u0441\u0442\u0451\u0440\u043E\u043A!");
    }
  }
  /**
   * Распределение ролей между всеми подключенными игроками
   */
  distributeRoles(players) {
    this.playerRoles.clear();
    this.alivePlayers.clear();
    dossierManager.clear();
    const count = players.length;
    const rosterDef = GAME_CONFIG.roles.calculateRoster(count);
    const roleDeck = [];
    for (let i = 0; i < rosterDef.mafia_boss; i++) roleDeck.push("mafia_boss");
    for (let i = 0; i < rosterDef.mafia_goon; i++) roleDeck.push("mafia_goon");
    for (let i = 0; i < rosterDef.doctor; i++) roleDeck.push("doctor");
    for (let i = 0; i < rosterDef.investigator; i++) roleDeck.push("investigator");
    for (let i = 0; i < rosterDef.grandpa; i++) roleDeck.push("grandpa");
    for (let i = 0; i < rosterDef.citizen; i++) roleDeck.push("citizen");
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    shuffledPlayers.forEach((player, index) => {
      const assignedRole = roleDeck[index] || "citizen";
      this.setRole(player.id, assignedRole);
      dossierManager.generateDossier(player.id, player.name, assignedRole);
      this.playRoleRevealAnimation(player, assignedRole);
    });
    this.notifyMafiaTeam(players);
  }
  /**
   * Анимация выдачи роли (п. 4 ТЗ)
   * 1. Темнота + Слепота на 8 сек
   * 2. На 3.5–4 сек карточка роли
   * 3. Карточка показывается 2–3 сек
   */
  playRoleRevealAnimation(player, roleId, customSubtitle) {
    const role = ROLE_DEFINITIONS[roleId];
    player.runCommandAsync("effect @s blindness 8 1 true").catch(() => {
    });
    player.runCommandAsync("effect @s darkness 8 1 true").catch(() => {
    });
    player.playSound("ambient.cave", { pitch: 0.8, volume: 1 });
    system.runTimeout(() => {
      if (!player.isValid()) return;
      const subtitle = customSubtitle || role.description;
      player.onScreenDisplay.setTitle(`${role.colorTag}\xA7l${role.name}`, {
        fadeInDuration: 10,
        stayDuration: GAME_CONFIG.timings.roleAnimation.cardDurationTicks,
        fadeOutDuration: 10,
        subtitle: `\xA77${subtitle}`
      });
      player.playSound("random.totem", { pitch: 1, volume: 0.7 });
    }, GAME_CONFIG.timings.roleAnimation.cardShowTick);
  }
  /**
   * Оповещение членов мафии друг о друге
   */
  notifyMafiaTeam(allPlayers) {
    const mafiaMembers = allPlayers.filter((p) => {
      const r = this.getRole(p.id);
      return r === "mafia_boss" || r === "mafia_goon";
    });
    const mafiaNames = mafiaMembers.map((p) => {
      const r = this.getRole(p.id);
      const title = r === "mafia_boss" ? "\xA74\u0413\u043B\u0430\u0432\u0430" : "\xA7c\u0428\u0435\u0441\u0442\u0451\u0440\u043A\u0430";
      return `\xA7f${p.name} (${title}\xA7f)`;
    }).join(", ");
    for (const member of mafiaMembers) {
      system.runTimeout(() => {
        if (member.isValid()) {
          member.sendMessage(`\xA78[\xA74\u041C\u0430\u0444\u0438\u044F\xA78] \xA77\u0427\u043B\u0435\u043D\u044B \u0441\u0435\u043C\u044C\u0438: ${mafiaNames}`);
        }
      }, 180);
    }
  }
  /**
   * Подсчёт живых игроков по командам
   */
  getTeamCounts() {
    let mafia = 0;
    let civilian = 0;
    for (const playerId of this.alivePlayers) {
      const role = this.getRole(playerId);
      if (!role) continue;
      if (ROLE_DEFINITIONS[role].team === "mafia") {
        mafia++;
      } else {
        civilian++;
      }
    }
    return { mafia, civilian };
  }
  getAllLivingPlayers() {
    return world.getAllPlayers().filter((p) => this.alivePlayers.has(p.id));
  }
};
var roleManager = new RoleManager();

// BP/scripts/src/modules/crime/crimeManager.ts
var CrimeManager = class {
  crimeScenes = /* @__PURE__ */ new Map();
  corpses = /* @__PURE__ */ new Map();
  // История убийств для отслеживания серий и повторов оружия
  consecutiveKillCount = 0;
  lastUsedWeaponId = null;
  weaponUsageCount = /* @__PURE__ */ new Map();
  /**
   * Выбор оружия для убийства по правилам ТЗ
   */
  selectWeaponForKill() {
    if (this.consecutiveKillCount >= GAME_CONFIG.weapons.serialKillsForGuaranteedKnife) {
      const knife = GAME_CONFIG.weapons.pool.find((w) => w.id === "knife");
      return { weapon: knife, guaranteedFingerprints: true };
    }
    const pool = GAME_CONFIG.weapons.pool;
    const totalWeight = pool.reduce((sum, w) => sum + w.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosen = pool[0];
    for (const w of pool) {
      if (rand < w.weight) {
        chosen = w;
        break;
      }
      rand -= w.weight;
    }
    return { weapon: chosen, guaranteedFingerprints: false };
  }
  /**
   * Регистрация убийства
   */
  registerKill(victimId, victimName, position, dimensionId) {
    const { weapon, guaranteedFingerprints } = this.selectWeaponForKill();
    const prevUsage = this.weaponUsageCount.get(weapon.id) || 0;
    const currentUsage = prevUsage + 1;
    this.weaponUsageCount.set(weapon.id, currentUsage);
    let hasFingerprints = guaranteedFingerprints;
    if (weapon.id === "knife") {
      if (this.lastUsedWeaponId === "knife") {
        hasFingerprints = true;
      }
    }
    let casingClue = void 0;
    if (weapon.modelNumber) {
      if (currentUsage >= 2) {
        const fullSerial = Math.floor(100 + Math.random() * 900);
        casingClue = `${weapon.modelNumber}.${fullSerial}`;
      } else {
        casingClue = `${weapon.modelNumber}.???`;
      }
    }
    const crimeSceneId = `crime_${Date.now()}_${Math.floor(Math.random() * 1e3)}`;
    const crimeScene = {
      id: crimeSceneId,
      victimId,
      victimName,
      position: { x: position.x, y: position.y, z: position.z },
      dimensionId,
      weapon,
      casingClue,
      casingFound: false,
      timestamp: Date.now()
    };
    this.crimeScenes.set(crimeSceneId, crimeScene);
    const corpseId = `corpse_${victimId}`;
    const corpse = {
      id: corpseId,
      victimId,
      victimName,
      currentPosition: { x: position.x, y: position.y, z: position.z },
      dimensionId,
      weapon,
      hasFingerprints,
      crimeSceneId
    };
    this.corpses.set(corpseId, corpse);
    if (guaranteedFingerprints) {
      this.consecutiveKillCount = 0;
    } else {
      this.consecutiveKillCount++;
    }
    this.lastUsedWeaponId = weapon.id;
    return { crimeScene, corpse };
  }
  /**
   * Сброс серии (при ночи без убийств или спасении Доктором)
   */
  resetKillStreak() {
    this.consecutiveKillCount = 0;
    this.lastUsedWeaponId = null;
  }
  getCrimeScene(id) {
    return this.crimeScenes.get(id);
  }
  getCorpse(id) {
    return this.corpses.get(id);
  }
  getCorpseByVictim(victimId) {
    return this.corpses.get(`corpse_${victimId}`);
  }
  getAllCorpses() {
    return Array.from(this.corpses.values());
  }
  getAllCrimeScenes() {
    return Array.from(this.crimeScenes.values());
  }
  clear() {
    this.crimeScenes.clear();
    this.corpses.clear();
    this.consecutiveKillCount = 0;
    this.lastUsedWeaponId = null;
    this.weaponUsageCount.clear();
  }
};
var crimeManager = new CrimeManager();

// BP/scripts/src/modules/abilities/abilitiesManager.ts
import { world as world2 } from "@minecraft/server";
var AbilitiesManager = class {
  // Доктор
  doctorProtectedTargetId = null;
  doctorLastProtectedTargetId = null;
  // Дед
  grandpaOnPatrol = false;
  grandpaRifleAmmo = 0;
  // Следователь: проверенные за сегодня игроки (playerId)
  investigatorCheckedToday = /* @__PURE__ */ new Set();
  onNightStart() {
    this.doctorProtectedTargetId = null;
    const livingGrandpa = world2.getAllPlayers().find(
      (p) => roleManager.isAlive(p.id) && roleManager.getRole(p.id) === "grandpa"
    );
    if (livingGrandpa) {
      const willPatrol = Math.random() < GAME_CONFIG.grandpa.patrolChance;
      this.grandpaOnPatrol = willPatrol;
      if (willPatrol) {
        this.grandpaRifleAmmo = GAME_CONFIG.grandpa.rifleMaxAmmo;
        livingGrandpa.sendMessage(`\xA76[\u041F\u0430\u0442\u0440\u0443\u043B\u044C] \u0412\u044B \u0441\u043D\u0430\u0440\u044F\u0434\u0438\u043B\u0438 \u0441\u0442\u0430\u0440\u043E\u0435 \u0440\u0443\u0436\u044C\u0451 (${this.grandpaRifleAmmo} \u0437\u0430\u0440\u044F\u0434\u0430) \u0438 \u0432\u044B\u0448\u043B\u0438 \u043D\u0430 \u043D\u043E\u0447\u043D\u043E\u0439 \u043F\u0430\u0442\u0440\u0443\u043B\u044C \u0433\u043E\u0440\u043E\u0434\u0430!`);
        livingGrandpa.runCommandAsync("give @s mafia:grandpa_rifle 1").catch(() => {
        });
      } else {
        livingGrandpa.sendMessage("\xA77[\u041D\u043E\u0447\u044C] \u0412\u044B \u0440\u0435\u0448\u0438\u043B\u0438 \u043E\u0441\u0442\u0430\u0442\u044C\u0441\u044F \u0434\u043E\u043C\u0430 \u044D\u0442\u043E\u0439 \u043D\u043E\u0447\u044C\u044E.");
      }
      livingGrandpa.runCommandAsync(`effect @s slowness 180 ${GAME_CONFIG.grandpa.nightSlownessAmplifier} true`).catch(() => {
      });
    }
  }
  onDayStart() {
    this.doctorLastProtectedTargetId = this.doctorProtectedTargetId;
    this.doctorProtectedTargetId = null;
    this.investigatorCheckedToday.clear();
    if (this.grandpaOnPatrol) {
      this.grandpaOnPatrol = false;
      this.grandpaRifleAmmo = 0;
      const grandpa = world2.getAllPlayers().find((p) => roleManager.getRole(p.id) === "grandpa");
      if (grandpa) {
        grandpa.runCommandAsync("clear @s mafia:grandpa_rifle").catch(() => {
        });
        grandpa.sendMessage("\xA77[\u0423\u0442\u0440\u043E] \u0412\u044B \u0432\u0435\u0440\u043D\u0443\u043B\u0438\u0441\u044C \u0441 \u043F\u0430\u0442\u0440\u0443\u043B\u044F \u0438 \u0441\u043F\u0440\u044F\u0442\u0430\u043B\u0438 \u0440\u0443\u0436\u044C\u0451.");
      }
    }
  }
  // --- Доктор ---
  setDoctorProtection(doctor, targetId) {
    const role = roleManager.getRole(doctor.id);
    if (role !== "doctor") return false;
    if (!GAME_CONFIG.doctor.allowConsecutiveSameTarget && targetId === this.doctorLastProtectedTargetId) {
      doctor.sendMessage("\xA7c\u0412\u044B \u043D\u0435 \u043C\u043E\u0436\u0435\u0442\u0435 \u0437\u0430\u0449\u0438\u0449\u0430\u0442\u044C \u043E\u0434\u043D\u043E\u0433\u043E \u0438 \u0442\u043E\u0433\u043E \u0436\u0435 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430 \u0434\u0432\u0435 \u043D\u043E\u0447\u0438 \u043F\u043E\u0434\u0440\u044F\u0434!");
      return false;
    }
    this.doctorProtectedTargetId = targetId;
    const targetPlayer = world2.getAllPlayers().find((p) => p.id === targetId);
    doctor.sendMessage(`\xA7a\u0412\u044B \u0432\u0437\u044F\u043B\u0438 \u043F\u043E\u0434 \u0437\u0430\u0449\u0438\u0442\u0443 \u0438\u0433\u0440\u043E\u043A\u0430 \xA7f${targetPlayer?.name || targetId}\xA7a \u043D\u0430 \u044D\u0442\u0443 \u043D\u043E\u0447\u044C.`);
    return true;
  }
  isProtectedByDoctor(targetId) {
    return this.doctorProtectedTargetId === targetId;
  }
  // --- Дед: выстрел из ружья ---
  fireGrandpaRifle(grandpa, target) {
    const role = roleManager.getRole(grandpa.id);
    if (role !== "grandpa") return;
    if (this.grandpaRifleAmmo <= 0) {
      grandpa.sendMessage("\xA7c\u0412 \u0440\u0443\u0436\u044C\u0435 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0438\u0441\u044C \u0437\u0430\u0440\u044F\u0434\u044B \u043D\u0430 \u044D\u0442\u0443 \u043D\u043E\u0447\u044C!");
      grandpa.playSound("random.click", { pitch: 1.5, volume: 1 });
      return;
    }
    this.grandpaRifleAmmo--;
    grandpa.playSound("random.explode", { pitch: 1.8, volume: 1 });
    grandpa.sendMessage(`\xA7e[\u0412\u044B\u0441\u0442\u0440\u0435\u043B!] \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0440\u044F\u0434\u043E\u0432: ${this.grandpaRifleAmmo}`);
    const targetRole = roleManager.getRole(target.id);
    if (targetRole === "mafia_boss" || targetRole === "mafia_goon") {
      const durationSeconds = Math.floor(GAME_CONFIG.grandpa.hitDebuffDurationTicks / 20);
      target.runCommandAsync(`effect @s slowness ${durationSeconds} 2 true`).catch(() => {
      });
      target.runCommandAsync(`effect @s weakness ${durationSeconds} 2 true`).catch(() => {
      });
      target.sendMessage("\xA74\u0412 \u0432\u0430\u0441 \u043F\u043E\u043F\u0430\u043B\u0430 \u043A\u0430\u0440\u0442\u0435\u0447\u044C \u0414\u0435\u0434\u0430! \u0412\u044B \u0442\u044F\u0436\u0435\u043B\u043E \u0440\u0430\u043D\u0435\u043D\u044B, \u043E\u0441\u043B\u0430\u0431\u043B\u0435\u043D\u044B \u0438 \u0437\u0430\u043C\u0435\u0434\u043B\u0435\u043D\u044B \u043D\u0430 30 \u0441\u0435\u043A!");
      grandpa.sendMessage("\xA7a\u0412\u044B \u043F\u043E\u043F\u0430\u043B\u0438 \u0432 \u043F\u043E\u0434\u043E\u0437\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u0443\u044E \u0444\u0438\u0433\u0443\u0440\u0443! \u0426\u0435\u043B\u044C \u0441\u0438\u043B\u044C\u043D\u043E \u0440\u0430\u043D\u0435\u043D\u0430 \u0438 \u0445\u0440\u043E\u043C\u0430\u0435\u0442.");
    } else {
      grandpa.sendMessage("\xA77\u0412\u044B\u0441\u0442\u0440\u0435\u043B \u043F\u0440\u0438\u0448\u0451\u043B\u0441\u044F \u0432 \u043C\u0438\u0440\u043D\u043E\u0433\u043E \u0436\u0438\u0442\u0435\u043B\u044F \u0438\u043B\u0438 \u043F\u0440\u043E\u043C\u0430\u0445! \u041A \u0441\u0447\u0430\u0441\u0442\u044C\u044E, \u0441\u043E\u043B\u044C \u043B\u0438\u0448\u044C \u043D\u0430\u043F\u0443\u0433\u0430\u043B\u0430 \u0446\u0435\u043B\u044C.");
    }
  }
  // --- Следователь: проверка досье ---
  investigatePlayer(investigator, target) {
    const role = roleManager.getRole(investigator.id);
    if (role !== "investigator") {
      investigator.sendMessage("\xA7c\u0422\u043E\u043B\u044C\u043A\u043E \u0421\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043C\u043E\u0436\u0435\u0442 \u0437\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0442\u044C \u0434\u043E\u0441\u044C\u0435 \u0433\u0440\u0430\u0436\u0434\u0430\u043D.");
      return;
    }
    if (this.investigatorCheckedToday.has(investigator.id)) {
      investigator.sendMessage("\xA7c\u0412\u044B \u0443\u0436\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043B\u0438 \u0437\u0430\u043F\u0440\u043E\u0441 \u0434\u043E\u0441\u044C\u0435 \u0441\u0435\u0433\u043E\u0434\u043D\u044F (1 \u0440\u0430\u0437 \u0432 \u0441\u0443\u0442\u043A\u0438).");
      return;
    }
    const dossier = dossierManager.getDossier(target.id);
    if (!dossier) {
      investigator.sendMessage("\xA7c\u0414\u043E\u0441\u044C\u0435 \u043D\u0430 \u044D\u0442\u043E\u0433\u043E \u0436\u0438\u0442\u0435\u043B\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0432 \u043F\u043E\u043B\u0438\u0446\u0435\u0439\u0441\u043A\u043E\u043C \u0430\u0440\u0445\u0438\u0432\u0435.");
      return;
    }
    this.investigatorCheckedToday.add(investigator.id);
    investigator.sendMessage("\xA7b=== [\u0410\u0420\u0425\u0418\u0412\u041D\u041E\u0415 \u0414\u041E\u0421\u042C\u0415 \u0413\u0420\u0410\u0416\u0414\u0410\u041D\u0418\u041D\u0410] ===");
    investigator.sendMessage(`\xA77\u0418\u0433\u0440\u043E\u043A: \xA7f${target.name}`);
    investigator.sendMessage(`\xA77\u0418\u043C\u044F \u043F\u043E \u043F\u0430\u0441\u043F\u043E\u0440\u0442\u0443: \xA7f${dossier.fakeName}`);
    investigator.sendMessage(`\xA77\u0412\u043E\u0437\u0440\u0430\u0441\u0442: \xA7f${dossier.age} \u043B\u0435\u0442 (\xA77${dossier.birthYear} \u0433.\u0440.\xA7f)`);
    investigator.sendMessage(`\xA77\u041F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u044F: \xA7f${dossier.job}`);
    investigator.sendMessage(`\xA77\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u0438: \xA7e${dossier.licenses.join(", ") || "\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442"}`);
    investigator.sendMessage(`\xA76\u0412\u0415\u0420\u0414\u0418\u041A\u0422 \u041F\u0420\u041E\u0412\u0415\u0420\u041A\u0418: \xA7l${dossier.verdict}`);
    investigator.sendMessage("\xA7b==================================");
    investigator.playSound("random.levelup", { pitch: 1.5, volume: 0.8 });
  }
  clear() {
    this.doctorProtectedTargetId = null;
    this.doctorLastProtectedTargetId = null;
    this.grandpaOnPatrol = false;
    this.grandpaRifleAmmo = 0;
    this.investigatorCheckedToday.clear();
  }
};
var abilitiesManager = new AbilitiesManager();

// BP/scripts/src/modules/lights/lightManager.ts
import { world as world4 } from "@minecraft/server";

// BP/scripts/src/modules/doors/doorManager.ts
import { world as world3 } from "@minecraft/server";

// BP/scripts/src/modules/doors/lockpickMinigame.ts
import { system as system2 } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
var LockpickMinigame = class {
  activeSessions = /* @__PURE__ */ new Map();
  /**
   * Запуск интерактивной мини-игры взлома замка
   */
  startMinigame(player, door, onFinish) {
    const totalPins = 3;
    const pinSolutions = [
      Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 3)
    ];
    const state = {
      currentPin: 0,
      totalPins,
      durability: 3,
      pinSolutions,
      door,
      lastHint: "\xA77\u0417\u0430\u043C\u043E\u043A \u0437\u0430\u043F\u0435\u0440\u0442. \u041F\u043E\u0434\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0434\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0438\u0437 3 \u0448\u0442\u0438\u0444\u0442\u043E\u0432."
    };
    this.activeSessions.set(player.id, state);
    this.showMinigameStep(player, onFinish);
  }
  showMinigameStep(player, onFinish) {
    const state = this.activeSessions.get(player.id);
    if (!state || !player.isValid()) return;
    const durabilityStr = "\xA7a" + "\u25A0 ".repeat(state.durability) + "\xA77" + "\u25A1 ".repeat(3 - state.durability);
    const pinStatusTexts = [];
    for (let i = 0; i < state.totalPins; i++) {
      if (i < state.currentPin) {
        pinStatusTexts.push(`\xA7a\u0428\u0442\u0438\u0444\u0442 ${i + 1}: [\u2713 \u0417\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D]`);
      } else if (i === state.currentPin) {
        pinStatusTexts.push(`\xA7e\u0428\u0442\u0438\u0444\u0442 ${i + 1}: [\u25B6 \u041F\u043E\u0434\u0431\u043E\u0440 \u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u044F...]`);
      } else {
        pinStatusTexts.push(`\xA78\u0428\u0442\u0438\u0444\u0442 ${i + 1}: [? \u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D]`);
      }
    }
    const form = new ActionFormData();
    form.title("\xA74\xA7l\u0412\u0437\u043B\u043E\u043C \u0434\u0432\u0435\u0440\u043D\u043E\u0433\u043E \u0437\u0430\u043C\u043A\u0430");
    form.body(
      `\xA77\u0414\u043E\u043C \u0436\u0438\u0442\u0435\u043B\u044F: \xA7f${state.door.ownerName}
\xA77\u041F\u0440\u043E\u0447\u043D\u043E\u0441\u0442\u044C \u043E\u0442\u043C\u044B\u0447\u043A\u0438: ${durabilityStr} \xA78(${state.durability}/3)

` + pinStatusTexts.join("\n") + `

${state.lastHint || ""}
\xA76\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043E\u0442\u043C\u044B\u0447\u043A\u043E\u0439:`
    );
    form.button("\xA7e[ \u2191 ] \u041F\u0440\u0438\u043F\u043E\u0434\u043D\u044F\u0442\u044C \u0448\u0442\u0438\u0444\u0442 \u0432\u0432\u0435\u0440\u0445");
    form.button("\xA7b[ \u2190 ] \u0421\u0434\u0432\u0438\u043D\u0443\u0442\u044C \u0446\u0438\u043B\u0438\u043D\u0434\u0440 \u0432\u043B\u0435\u0432\u043E");
    form.button("\xA76[ \u2192 ] \u041D\u0430\u0434\u0430\u0432\u0438\u0442\u044C \u043D\u0430 \u043F\u0440\u0443\u0436\u0438\u043D\u0443 \u0432\u0433\u043B\u0443\u0431\u044C");
    form.button("\xA7c[ \u2715 ] \u041E\u0442\u0441\u0442\u0443\u043F\u0438\u0442\u044C (\u043F\u0440\u0435\u0440\u0432\u0430\u0442\u044C \u0432\u0437\u043B\u043E\u043C)");
    system2.runTimeout(() => {
      form.show(player).then((response) => {
        if (response.canceled || response.selection === 3 || response.selection === void 0) {
          this.activeSessions.delete(player.id);
          player.sendMessage("\xA77\u0412\u044B \u0430\u043A\u043A\u0443\u0440\u0430\u0442\u043D\u043E \u0438\u0437\u0432\u043B\u0435\u043A\u043B\u0438 \u043E\u0442\u043C\u044B\u0447\u043A\u0443 \u0438 \u043E\u0442\u0441\u0442\u0443\u043F\u0438\u043B\u0438 \u043E\u0442 \u0434\u0432\u0435\u0440\u0438.");
          return;
        }
        const actionChosen = response.selection;
        const requiredAction = state.pinSolutions[state.currentPin];
        if (actionChosen === requiredAction) {
          state.currentPin++;
          player.playSound("random.orb", { pitch: 1.8, volume: 0.8 });
          if (state.currentPin >= state.totalPins) {
            this.activeSessions.delete(player.id);
            onFinish(true);
            return;
          }
          state.lastHint = `\xA7a[\u0429\u0435\u043B\u0447\u043E\u043A!] \u0428\u0442\u0438\u0444\u0442 ${state.currentPin} \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D!`;
          this.showMinigameStep(player, onFinish);
        } else {
          state.durability--;
          player.playSound("random.break", { pitch: 1, volume: 0.7 });
          if (state.durability <= 0) {
            this.activeSessions.delete(player.id);
            onFinish(false);
            return;
          }
          state.lastHint = `\xA7c[\u0421\u0440\u044B\u0432!] \u041E\u0442\u043C\u044B\u0447\u043A\u0430 \u0441\u043E\u0441\u043A\u043E\u0447\u0438\u043B\u0430 \u0438 \u0443\u043F\u0451\u0440\u043B\u0430\u0441\u044C \u0432 \u043F\u0430\u0437. \u041F\u0440\u043E\u0447\u043D\u043E\u0441\u0442\u044C \u0443\u043C\u0435\u043D\u044C\u0448\u0435\u043D\u0430!`;
          this.showMinigameStep(player, onFinish);
        }
      }).catch(() => {
        this.activeSessions.delete(player.id);
      });
    }, 2);
  }
};
var lockpickMinigame = new LockpickMinigame();

// BP/scripts/src/modules/doors/doorManager.ts
var STORAGE_KEY = "mafia_saved_doors";
var DoorManager = class {
  doors = /* @__PURE__ */ new Map();
  constructor() {
    this.loadDoorsFromStorage();
  }
  /**
   * Нормализация позиции двери к её нижнему блоку
   */
  getNormalizedDoorPos(block) {
    const loc = block.location;
    try {
      const blockBelow = block.dimension.getBlock({ x: loc.x, y: loc.y - 1, z: loc.z });
      if (blockBelow && blockBelow.typeId.includes("door")) {
        return { x: loc.x, y: loc.y - 1, z: loc.z };
      }
    } catch (_) {
    }
    return { x: loc.x, y: loc.y, z: loc.z };
  }
  getDoorKey(pos, dimensionId) {
    return `${Math.floor(pos.x)}_${Math.floor(pos.y)}_${Math.floor(pos.z)}_${dimensionId}`;
  }
  getDoorAt(pos, dimensionId) {
    return this.doors.get(this.getDoorKey(pos, dimensionId));
  }
  getDoorByBlock(block) {
    const pos = this.getNormalizedDoorPos(block);
    return this.getDoorAt(pos, block.dimension.id);
  }
  /**
   * Установка замка на дверь предметом mafia:door_lock
   */
  installLock(player, block) {
    const pos = this.getNormalizedDoorPos(block);
    const key = this.getDoorKey(pos, block.dimension.id);
    const existingDoor = this.doors.get(key);
    if (existingDoor) {
      if (existingDoor.ownerId === player.id) {
        if (player.isSneaking) {
          this.doors.delete(key);
          this.saveDoorsToStorage();
          player.sendMessage("\xA7e\u0412\u044B \u0441\u043D\u044F\u043B\u0438 \u0437\u0430\u043C\u043E\u043A \u0441\u043E \u0441\u0432\u043E\u0435\u0439 \u0434\u0432\u0435\u0440\u0438. \u0414\u0432\u0435\u0440\u044C \u0442\u0435\u043F\u0435\u0440\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u0430 \u0434\u043B\u044F \u0432\u0441\u0435\u0445.");
          player.runCommandAsync("give @s mafia:door_lock 1").catch(() => {
          });
          player.playSound("random.chestclosed", { pitch: 1.2, volume: 0.8 });
          return true;
        } else {
          player.sendMessage("\xA7e\u042D\u0442\u043E \u0432\u0430\u0448\u0430 \u0434\u0432\u0435\u0440\u044C. \u041F\u0440\u0438\u0441\u044F\u0434\u044C\u0442\u0435 (Sneak) + \u041F\u041A\u041C \u0437\u0430\u043C\u043A\u043E\u043C, \u0447\u0442\u043E\u0431\u044B \u0441\u043D\u044F\u0442\u044C \u0435\u0433\u043E.");
          return false;
        }
      } else {
        player.sendMessage(`\xA7c\u041D\u0430 \u044D\u0442\u043E\u0439 \u0434\u0432\u0435\u0440\u0438 \u0443\u0436\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u0437\u0430\u043C\u043E\u043A \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0436\u0438\u0442\u0435\u043B\u044F (${existingDoor.ownerName})!`);
        return false;
      }
    }
    const newDoor = {
      id: key,
      ownerId: player.id,
      ownerName: player.name,
      doorBlockPos: pos,
      dimensionId: block.dimension.id,
      isLocked: true,
      hasLight: true
    };
    this.doors.set(key, newDoor);
    this.saveDoorsToStorage();
    player.sendMessage(`\xA7a[\u0417\u0430\u043C\u043E\u043A \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D] \u042D\u0442\u0430 \u0434\u0432\u0435\u0440\u044C \u0442\u0435\u043F\u0435\u0440\u044C \u0437\u0430\u043F\u0435\u0440\u0442\u0430 \u0438 \u043F\u0440\u0438\u043D\u0430\u0434\u043B\u0435\u0436\u0438\u0442 \u0432\u0430\u043C!`);
    player.sendMessage("\xA77\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u0432\u0445\u043E\u0434\u0438\u0442\u044C \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E. \u041C\u0430\u0444\u0438\u0438 \u043F\u043E\u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043E\u0442\u043C\u044B\u0447\u043A\u0430.");
    player.playSound("block.iron_door.close", { pitch: 1, volume: 1 });
    return true;
  }
  /**
   * Проверка и обработка обычного взаимодействия с дверью (попытка открыть)
   * Возвращает true, если взаимодействие нужно заблокировать (дверь заперта)
   */
  handleDoorInteract(player, block) {
    const door = this.getDoorByBlock(block);
    if (!door) {
      return false;
    }
    if (door.ownerId === player.id) {
      if (player.isSneaking) {
        door.isLocked = !door.isLocked;
        this.saveDoorsToStorage();
        const status = door.isLocked ? "\xA7c\u0437\u0430\u043F\u0435\u0440\u043B\u0438" : "\xA7a\u043E\u0442\u043F\u0435\u0440\u043B\u0438";
        player.sendMessage(`\xA7e\u0412\u044B ${status} \u0437\u0430\u043C\u043E\u043A \u043D\u0430 \u0441\u0432\u043E\u0435\u0439 \u0434\u0432\u0435\u0440\u0438.`);
        player.playSound("random.click", { pitch: 1.2, volume: 0.6 });
        return true;
      }
      return false;
    }
    if (door.isLocked) {
      player.sendMessage(`\xA7c[\u0417\u0430\u043F\u0435\u0440\u0442\u043E] \u0414\u0432\u0435\u0440\u044C \u0437\u0430\u0449\u0438\u0449\u0435\u043D\u0430 \u0437\u0430\u043C\u043A\u043E\u043C. \u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446: \xA7f${door.ownerName}`);
      player.playSound("random.door_close", { pitch: 0.8, volume: 0.8 });
      return true;
    }
    return false;
  }
  /**
   * Запуск мини-игры взлома отмычкой
   */
  startLockpicking(player, block) {
    const role = roleManager.getRole(player.id);
    if (role !== "mafia_boss" && role !== "mafia_goon") {
      player.sendMessage("\xA7c\u0412\u044B \u043D\u0435 \u0443\u043C\u0435\u0435\u0442\u0435 \u043E\u0431\u0440\u0430\u0449\u0430\u0442\u044C\u0441\u044F \u0441 \u0432\u043E\u0440\u043E\u0432\u0441\u043A\u043E\u0439 \u043E\u0442\u043C\u044B\u0447\u043A\u043E\u0439.");
      return;
    }
    const door = this.getDoorByBlock(block);
    if (!door) {
      player.sendMessage("\xA77\u041D\u0430 \u044D\u0442\u043E\u0439 \u0434\u0432\u0435\u0440\u0438 \u043D\u0435\u0442 \u0437\u0430\u043C\u043A\u0430, \u043E\u043D\u0430 \u0438 \u0442\u0430\u043A \u043E\u0442\u043A\u0440\u044B\u0442\u0430.");
      return;
    }
    if (!door.isLocked) {
      player.sendMessage("\xA7a\u0417\u0430\u043C\u043E\u043A \u043D\u0430 \u044D\u0442\u043E\u0439 \u0434\u0432\u0435\u0440\u0438 \u0443\u0436\u0435 \u043E\u0442\u043A\u0440\u044B\u0442!");
      return;
    }
    lockpickMinigame.startMinigame(player, door, (isSuccess) => {
      if (isSuccess) {
        door.isLocked = false;
        this.saveDoorsToStorage();
        player.sendMessage("\xA7a[\u0423\u0441\u043F\u0435\u0445] \u0412\u0441\u0435 \u0448\u0442\u0438\u0444\u0442\u044B \u043F\u043E\u0434\u0434\u0430\u043B\u0438\u0441\u044C! \u0414\u0432\u0435\u0440\u044C \u0442\u0438\u0445\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u0430.");
        player.playSound("random.door_open", { pitch: 1, volume: 0.8 });
        try {
          const dim = world3.getDimension(door.dimensionId);
          const b = dim.getBlock(door.doorBlockPos);
          if (b) {
            b.setPermutation(b.permutation.withState("open_bit", true));
          }
        } catch (_) {
        }
      } else {
        player.sendMessage("\xA7c[\u0421\u0440\u044B\u0432] \u041E\u0442\u043C\u044B\u0447\u043A\u0430 \u0441 \u0433\u0440\u043E\u0445\u043E\u0442\u043E\u043C \u0441\u043B\u043E\u043C\u0430\u043B\u0430\u0441\u044C!");
        player.playSound("random.break", { pitch: 0.8, volume: 1 });
        if (door.hasLight) {
          const owner = world3.getAllPlayers().find((p) => p.id === door.ownerId);
          if (owner && owner.isValid()) {
            owner.sendMessage(GAME_CONFIG.doorLock.ownerAlertMessage);
            owner.playSound("random.orb", { pitch: 0.5, volume: 1 });
          }
        } else {
          player.sendMessage("\xA78(\u0421\u0432\u0435\u0442 \u0432 \u0434\u043E\u043C\u0435 \u0431\u044B\u043B \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D \u2014 \u0445\u043E\u0437\u044F\u0438\u043D \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0437\u0430\u043F\u043E\u0434\u043E\u0437\u0440\u0438\u043B)");
        }
      }
    });
  }
  setLightState(doorKey, hasLight) {
    const door = this.doors.get(doorKey);
    if (door) {
      door.hasLight = hasLight;
      this.saveDoorsToStorage();
    }
  }
  getAllDoors() {
    return Array.from(this.doors.values());
  }
  clearAllDoors() {
    this.doors.clear();
    world3.setDynamicProperty(STORAGE_KEY, "");
  }
  // --- Сохранение и загрузка для независимости от карты ---
  saveDoorsToStorage() {
    try {
      const data = JSON.stringify(Array.from(this.doors.values()));
      world3.setDynamicProperty(STORAGE_KEY, data);
    } catch (err) {
      console.warn("Failed to save doors to dynamic properties:", err);
    }
  }
  loadDoorsFromStorage() {
    try {
      const data = world3.getDynamicProperty(STORAGE_KEY);
      if (data && data.length > 0) {
        const parsed = JSON.parse(data);
        for (const d of parsed) {
          this.doors.set(d.id, d);
        }
      }
    } catch (err) {
      console.warn("Failed to load doors from dynamic properties:", err);
    }
  }
};
var doorManager = new DoorManager();

// BP/scripts/src/modules/lights/lightManager.ts
var LightManager = class {
  // Количество саботажей, совершённых Шестёркой за текущий день (goonId -> count)
  goonSabotageCount = /* @__PURE__ */ new Map();
  onNewDay() {
    this.goonSabotageCount.clear();
  }
  /**
   * Случайные ночные аварии со светом (12% шанс на каждый дом)
   */
  triggerNightBlackouts() {
    const doors = doorManager.getAllDoors();
    let blackoutsCount = 0;
    for (const door of doors) {
      if (Math.random() < GAME_CONFIG.lighting.nightBlackoutChance) {
        door.hasLight = false;
        blackoutsCount++;
        const owner = world4.getAllPlayers().find((p) => p.id === door.ownerId);
        if (owner && owner.isValid()) {
          owner.sendMessage("\xA7e[\u0421\u0435\u0442\u044C] \u0412 \u0432\u0430\u0448\u0435\u043C \u0434\u043E\u043C\u0435 \u0432\u043D\u0435\u0437\u0430\u043F\u043D\u043E \u043F\u043E\u0433\u0430\u0441 \u0441\u0432\u0435\u0442 \u0438\u0437-\u0437\u0430 \u0430\u0432\u0430\u0440\u0438\u0438 \u043D\u0430 \u043F\u043E\u0434\u0441\u0442\u0430\u043D\u0446\u0438\u0438!");
        }
      }
    }
    if (blackoutsCount > 0) {
      world4.sendMessage(`\xA77[\u0413\u043E\u0440\u043E\u0434] \u041D\u043E\u0447\u044C\u044E \u0432 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u0445 \u0434\u043E\u043C\u0430\u0445 (${blackoutsCount}) \u043F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u043E \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0441\u0432\u0435\u0442\u0430.`);
    }
  }
  /**
   * Саботаж света Шестёркой днём
   */
  sabotageHouseLight(goon, houseDoorKey) {
    const role = roleManager.getRole(goon.id);
    if (role !== "mafia_goon") {
      goon.sendMessage("\xA7c\u0422\u043E\u043B\u044C\u043A\u043E \u0428\u0435\u0441\u0442\u0451\u0440\u043A\u0430 \u043C\u043E\u0436\u0435\u0442 \u0441\u0430\u0431\u043E\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0449\u0438\u0442\u043A\u0438 \u044D\u043B\u0435\u043A\u0442\u0440\u043E\u043F\u0438\u0442\u0430\u043D\u0438\u044F.");
      return false;
    }
    const usedCount = this.goonSabotageCount.get(goon.id) || 0;
    if (usedCount >= GAME_CONFIG.lighting.sabotagePerGoonPerDay) {
      goon.sendMessage("\xA7c\u0412\u044B \u0443\u0436\u0435 \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043B\u0438 \u043B\u0438\u043C\u0438\u0442 \u0441\u0430\u0431\u043E\u0442\u0430\u0436\u0430 \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F (1 \u0434\u043E\u043C \u0432 \u0434\u0435\u043D\u044C).");
      return false;
    }
    doorManager.setLightState(houseDoorKey, false);
    this.goonSabotageCount.set(goon.id, usedCount + 1);
    goon.sendMessage("\xA7a[\u0421\u0430\u0431\u043E\u0442\u0430\u0436] \u0412\u044B \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0431\u0435\u0441\u0442\u043E\u0447\u0438\u043B\u0438 \u044D\u0442\u043E\u0442 \u0434\u043E\u043C! \u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u0442 \u0441\u0438\u0433\u043D\u0430\u043B \u0442\u0440\u0435\u0432\u043E\u0433\u0438 \u043F\u0440\u0438 \u0432\u0437\u043B\u043E\u043C\u0435.");
    goon.playSound("random.fuse", { pitch: 1.2, volume: 0.8 });
    return true;
  }
  /**
   * Починка света хозяином дома
   */
  repairLight(owner, houseDoorKey) {
    doorManager.setLightState(houseDoorKey, true);
    owner.sendMessage("\xA7a\u0412\u044B \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u043B\u0438 \u043F\u0440\u0435\u0434\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435\u043B\u044C! \u0421\u0432\u0435\u0442 \u0432 \u0434\u043E\u043C\u0435 \u0441\u043D\u043E\u0432\u0430 \u0433\u043E\u0440\u0438\u0442.");
    owner.playSound("random.click", { pitch: 1, volume: 0.7 });
  }
  clear() {
    this.goonSabotageCount.clear();
  }
};
var lightManager = new LightManager();

// BP/scripts/src/modules/game/gameManager.ts
var GameManager = class {
  currentPhase = "LOBBY";
  phaseTimerSeconds = 0;
  phaseIntervalId = null;
  dayCount = 1;
  // Ночная атака мафии
  mafiaChosenTargetId = null;
  // Голосование: voterId -> targetPlayerId
  votes = /* @__PURE__ */ new Map();
  getPhase() {
    return this.currentPhase;
  }
  getDayCount() {
    return this.dayCount;
  }
  /**
   * Запуск игры
   */
  startGame() {
    const players = world5.getAllPlayers();
    if (players.length < 2 && !GAME_CONFIG.debug.enabled) {
      world5.sendMessage("\xA7c\u0414\u043B\u044F \u0441\u0442\u0430\u0440\u0442\u0430 \u0438\u0433\u0440\u044B \u043D\u0443\u0436\u043D\u043E \u043A\u0430\u043A \u043C\u0438\u043D\u0438\u043C\u0443\u043C 2 \u0438\u0433\u0440\u043E\u043A\u0430 (\u0438\u043B\u0438 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0440\u0435\u0436\u0438\u043C \u043E\u0442\u043B\u0430\u0434\u043A\u0438).");
      return;
    }
    world5.sendMessage("\xA76\xA7l=== \u041D\u0410\u0427\u0410\u041B\u041E \u0418\u0413\u0420\u042B \xAB\u041C\u0410\u0424\u0418\u042F: \u0413\u041E\u0420\u041E\u0414\xBB ===");
    this.dayCount = 1;
    this.currentPhase = "PREPARATION";
    crimeManager.clear();
    abilitiesManager.clear();
    lightManager.clear();
    this.votes.clear();
    roleManager.distributeRoles(players);
    for (const player of players) {
      player.runCommandAsync("give @s mafia:gloves 1").catch(() => {
      });
      const role = roleManager.getRole(player.id);
      if (role === "mafia_boss" || role === "mafia_goon") {
        player.runCommandAsync("give @s mafia:lockpick 1").catch(() => {
        });
      }
    }
    this.startPhaseTimer(GAME_CONFIG.timings.preparationSeconds, () => {
      this.transitionToDay();
    });
  }
  /**
   * Переход к фазе ДЕНЬ
   */
  transitionToDay() {
    this.currentPhase = "DAY";
    abilitiesManager.onDayStart();
    lightManager.onNewDay();
    this.votes.clear();
    world5.sendMessage(`\xA7e\xA7l--- \u0414\u0415\u041D\u042C ${this.dayCount} ---`);
    world5.sendMessage("\xA77\u0413\u043E\u0440\u043E\u0436\u0430\u043D\u0435 \u043C\u043E\u0433\u0443\u0442 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0430\u0442\u044C\u0441\u044F, \u043E\u0431\u0449\u0430\u0442\u044C\u0441\u044F \u0438 \u0438\u0441\u043A\u0430\u0442\u044C \u0443\u043B\u0438\u043A\u0438.");
    world5.getDimension("overworld").runCommandAsync("time set day").catch(() => {
    });
    this.startPhaseTimer(GAME_CONFIG.timings.daySeconds, () => {
      this.transitionToVoting();
    });
  }
  /**
   * Переход к фазе ГОЛОСОВАНИЕ
   */
  transitionToVoting() {
    this.currentPhase = "VOTING";
    this.votes.clear();
    world5.sendMessage("\xA7c\xA7l--- \u0413\u041E\u041B\u041E\u0421\u041E\u0412\u0410\u041D\u0418\u0415 \u0417\u0410 \u0418\u0421\u041A\u041B\u042E\u0427\u0415\u041D\u0418\u0415 ---");
    world5.sendMessage("\xA77\u0423 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0436\u0438\u0432\u043E\u0433\u043E \u0438\u0433\u0440\u043E\u043A\u0430 \u0435\u0441\u0442\u044C 60 \u0441\u0435\u043A\u0443\u043D\u0434, \u0447\u0442\u043E\u0431\u044B \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u044B\u0431\u043E\u0440.");
    for (const player of roleManager.getAllLivingPlayers()) {
      this.openVotingForm(player);
    }
    this.startPhaseTimer(GAME_CONFIG.timings.votingSeconds, () => {
      this.resolveVoting();
    });
  }
  /**
   * Открытие формы голосования через server-ui
   */
  openVotingForm(voter) {
    const living = roleManager.getAllLivingPlayers();
    const candidateNames = living.map((p) => p.name);
    const form = new ModalFormData();
    form.title("\xA74\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043D\u0438\u0435 \u0413\u043E\u0440\u043E\u0434\u0430");
    form.dropdown("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043E\u0434\u043E\u0437\u0440\u0435\u0432\u0430\u0435\u043C\u043E\u0433\u043E \u0434\u043B\u044F \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F:", candidateNames);
    form.show(voter).then((response) => {
      if (response.canceled || response.formValues === void 0) return;
      const selectedIndex = response.formValues[0];
      const chosenPlayer = living[selectedIndex];
      if (chosenPlayer) {
        this.castVote(voter.id, chosenPlayer.id);
        voter.sendMessage(`\xA7a\u0412\u044B \u043F\u0440\u043E\u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043B\u0438 \u043F\u0440\u043E\u0442\u0438\u0432: \xA7f${chosenPlayer.name}`);
      }
    }).catch(() => {
    });
  }
  castVote(voterId, targetId) {
    if (this.currentPhase !== "VOTING") return;
    this.votes.set(voterId, targetId);
  }
  /**
   * Подведение итогов голосования
   */
  resolveVoting() {
    const voteTallies = /* @__PURE__ */ new Map();
    for (const targetId of this.votes.values()) {
      voteTallies.set(targetId, (voteTallies.get(targetId) || 0) + 1);
    }
    let highestVotes = 0;
    let expelledPlayerId = null;
    let isTie = false;
    for (const [targetId, count] of voteTallies.entries()) {
      if (count > highestVotes) {
        highestVotes = count;
        expelledPlayerId = targetId;
        isTie = false;
      } else if (count === highestVotes) {
        isTie = true;
      }
    }
    if (isTie || !expelledPlayerId || highestVotes === 0) {
      world5.sendMessage("\xA7e[\u0418\u0442\u043E\u0433\u0438 \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043D\u0438\u044F] \u041D\u0438\u0447\u044C\u044F \u0438\u043B\u0438 \u0433\u043E\u043B\u043E\u0441\u0430 \u0440\u0430\u0437\u0434\u0435\u043B\u0438\u043B\u0438\u0441\u044C. \u041D\u0438\u043A\u0442\u043E \u043D\u0435 \u0438\u0441\u043A\u043B\u044E\u0447\u0451\u043D!");
      world5.sendMessage("\xA77\u0412\u0441\u0435 \u0440\u0430\u0441\u0445\u043E\u0434\u044F\u0442\u0441\u044F \u043F\u043E \u0434\u043E\u043C\u0430\u043C. \u041D\u0430\u0441\u0442\u0443\u043F\u0430\u0435\u0442 \u043D\u043E\u0447\u044C...");
    } else {
      const expelledPlayer = world5.getAllPlayers().find((p) => p.id === expelledPlayerId);
      const roleId = roleManager.getRole(expelledPlayerId);
      const roleDef = roleId ? ROLE_DEFINITIONS[roleId] : void 0;
      roleManager.markDead(expelledPlayerId);
      world5.sendMessage(`\xA7c[\u0418\u0442\u043E\u0433\u0438 \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043D\u0438\u044F] \u0411\u043E\u043B\u044C\u0448\u0438\u043D\u0441\u0442\u0432\u043E\u043C \u0433\u043E\u043B\u043E\u0441\u043E\u0432 \u0438\u0441\u043A\u043B\u044E\u0447\u0451\u043D: \xA7f${expelledPlayer?.name || "\u0418\u0433\u0440\u043E\u043A"}\xA7c!`);
      if (roleDef) {
        world5.sendMessage(`\xA77\u0415\u0433\u043E \u0440\u043E\u043B\u044C \u0431\u044B\u043B\u0430: ${roleDef.colorTag}${roleDef.name}`);
      }
      if (expelledPlayer && expelledPlayer.isValid()) {
        expelledPlayer.runCommandAsync("gamemode spectator @s").catch(() => {
        });
      }
    }
    if (this.checkWinConditions()) return;
    this.transitionToNight();
  }
  /**
   * Переход к фазе НОЧЬ
   */
  transitionToNight() {
    this.currentPhase = "NIGHT";
    this.mafiaChosenTargetId = null;
    world5.sendMessage("\xA79\xA7l--- \u041D\u0410\u0421\u0422\u0423\u041F\u0410\u0415\u0422 \u041D\u041E\u0427\u042C ---");
    world5.sendMessage("\xA77\u041C\u0438\u0440\u043D\u044B\u0435 \u0436\u0438\u0442\u0435\u043B\u0438 \u0437\u0430\u043F\u0435\u0440\u043B\u0438\u0441\u044C \u0432 \u0434\u043E\u043C\u0430\u0445. \u041C\u0430\u0444\u0438\u044F \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u043D\u0430 \u043E\u0445\u043E\u0442\u0443...");
    world5.getDimension("overworld").runCommandAsync("time set midnight").catch(() => {
    });
    abilitiesManager.onNightStart();
    lightManager.triggerNightBlackouts();
    this.startPhaseTimer(GAME_CONFIG.timings.nightSeconds, () => {
      this.resolveNight();
    });
  }
  /**
   * Назначение жертвы мафии
   */
  setMafiaTarget(bossOrGoon, targetId) {
    const role = roleManager.getRole(bossOrGoon.id);
    if (role !== "mafia_boss" && role !== "mafia_goon") return;
    this.mafiaChosenTargetId = targetId;
    const targetPlayer = world5.getAllPlayers().find((p) => p.id === targetId);
    for (const member of world5.getAllPlayers()) {
      const r = roleManager.getRole(member.id);
      if (r === "mafia_boss" || r === "mafia_goon") {
        member.sendMessage(`\xA74[\u041C\u0430\u0444\u0438\u044F] \u0412\u044B\u0431\u0440\u0430\u043D\u0430 \u0436\u0435\u0440\u0442\u0432\u0430 \u043D\u0430 \u044D\u0442\u0443 \u043D\u043E\u0447\u044C: \xA7f${targetPlayer?.name || targetId}`);
      }
    }
  }
  /**
   * Подведение итогов ночи
   */
  resolveNight() {
    const victimId = this.mafiaChosenTargetId;
    if (!victimId) {
      crimeManager.resetKillStreak();
      this.transitionToMorning(null);
      return;
    }
    const victim = world5.getAllPlayers().find((p) => p.id === victimId);
    const victimRole = roleManager.getRole(victimId);
    if (abilitiesManager.isProtectedByDoctor(victimId)) {
      world5.sendMessage("\xA7a[\u041D\u043E\u0447\u044C] \u042D\u0442\u043E\u0439 \u043D\u043E\u0447\u044C\u044E \u0414\u043E\u043A\u0442\u043E\u0440 \u0441\u043F\u0430\u0441 \u0447\u044C\u044E-\u0442\u043E \u0436\u0438\u0437\u043D\u044C!");
      crimeManager.resetKillStreak();
      this.transitionToMorning(null);
      return;
    }
    if (victimRole === "grandpa") {
      if (Math.random() > GAME_CONFIG.grandpa.mafiaAttackDeathChance) {
        world5.sendMessage("\xA7e[\u041D\u043E\u0447\u044C] \u0421\u0442\u0430\u0440\u044B\u0439 \u0414\u0435\u0434 \u0434\u0430\u043B \u044F\u0440\u043E\u0441\u0442\u043D\u044B\u0439 \u043E\u0442\u043F\u043E\u0440 \u043D\u0430\u043F\u0430\u0434\u0430\u0432\u0448\u0438\u043C \u0438 \u0447\u0443\u0434\u043E\u043C \u0432\u044B\u0436\u0438\u043B!");
        crimeManager.resetKillStreak();
        this.transitionToMorning(null);
        return;
      }
    }
    const victimPos = victim ? { ...victim.location } : { x: 0, y: 64, z: 0 };
    const dimensionId = victim ? victim.dimension.id : "overworld";
    const { crimeScene, corpse } = crimeManager.registerKill(
      victimId,
      victim?.name || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439",
      victimPos,
      dimensionId
    );
    if (!corpse.weapon.isSilent && victim) {
      this.broadcastGunshotSound(victimPos, dimensionId);
    }
    roleManager.markDead(victimId);
    if (victim && victim.isValid()) {
      victim.runCommandAsync("gamemode spectator @s").catch(() => {
      });
      victim.sendMessage("\xA74\u0412\u044B \u043F\u043E\u0433\u0438\u0431\u043B\u0438 \u044D\u0442\u043E\u0439 \u043D\u043E\u0447\u044C\u044E \u043E\u0442 \u0440\u0443\u043A \u043C\u0430\u0444\u0438\u0438!");
    }
    this.spawnCorpseEntity(corpse.id, victimPos, dimensionId, victim?.name || "\u0422\u0440\u0443\u043F");
    this.transitionToMorning(corpse.victimName);
  }
  /**
   * Переход к фазе УТРО
   */
  transitionToMorning(killedVictimName) {
    this.currentPhase = "MORNING";
    this.dayCount++;
    world5.sendMessage("\xA76\xA7l--- \u041D\u0410\u0421\u0422\u0423\u041F\u0410\u0415\u0422 \u0423\u0422\u0420\u041E ---");
    world5.getDimension("overworld").runCommandAsync("time set sunrise").catch(() => {
    });
    if (killedVictimName) {
      world5.sendMessage(`\xA7c[\u0413\u043E\u0440\u043E\u0434\u0441\u043A\u0438\u0435 \u043D\u043E\u0432\u043E\u0441\u0442\u0438] \u042D\u0442\u043E\u0439 \u043D\u043E\u0447\u044C\u044E \u0432 \u0433\u043E\u0440\u043E\u0434\u0435 \u0431\u044B\u043B \u0443\u0431\u0438\u0442: \xA7f${killedVictimName}\xA7c!`);
      world5.sendMessage("\xA77\u0422\u0435\u043B\u043E \u043C\u043E\u0436\u043D\u043E \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 \u0432 \u043F\u0435\u0440\u0447\u0430\u0442\u043A\u0430\u0445, \u0430 \u0421\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043C\u043E\u0436\u0435\u0442 \u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0435\u0433\u043E \u0438 \u043C\u0435\u0441\u0442\u043E \u043F\u0440\u0435\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F.");
    } else {
      world5.sendMessage("\xA7a[\u0413\u043E\u0440\u043E\u0434\u0441\u043A\u0438\u0435 \u043D\u043E\u0432\u043E\u0441\u0442\u0438] \u0427\u0443\u0434\u0435\u0441\u043D\u043E\u0435 \u0443\u0442\u0440\u043E! \u042D\u0442\u043E\u0439 \u043D\u043E\u0447\u044C\u044E \u043D\u0438\u043A\u0442\u043E \u043D\u0435 \u043F\u043E\u0433\u0438\u0431.");
    }
    if (this.checkWinConditions()) return;
    this.startPhaseTimer(GAME_CONFIG.timings.morningSeconds, () => {
      this.transitionToDay();
    });
  }
  /**
   * Проверка условий победы (п. 9 ТЗ)
   */
  checkWinConditions() {
    const { mafia, civilian } = roleManager.getTeamCounts();
    if (mafia === 0) {
      this.currentPhase = "ENDED";
      world5.sendMessage("\xA7a\xA7l========================================");
      world5.sendMessage("\xA7a\xA7l\u041F\u041E\u0411\u0415\u0414\u0410 \u041C\u0418\u0420\u041D\u042B\u0425 \u0416\u0418\u0422\u0415\u041B\u0415\u0419!");
      world5.sendMessage("\xA77\u0412\u0441\u044F \u043F\u0440\u0435\u0441\u0442\u0443\u043F\u043D\u0430\u044F \u0433\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u043A\u0430 \u0433\u043E\u0440\u043E\u0434\u0430 \u043B\u0438\u043A\u0432\u0438\u0434\u0438\u0440\u043E\u0432\u0430\u043D\u0430!");
      world5.sendMessage("\xA7a\xA7l========================================");
      this.stopTimer();
      return true;
    }
    if (mafia >= civilian) {
      this.currentPhase = "ENDED";
      world5.sendMessage("\xA74\xA7l========================================");
      world5.sendMessage("\xA74\xA7l\u041F\u041E\u0411\u0415\u0414\u0410 \u041C\u0410\u0424\u0418\u0418!");
      world5.sendMessage("\xA77\u041C\u0430\u0444\u0438\u044F \u0432\u0437\u044F\u043B\u0430 \u043F\u043E\u043B\u043D\u044B\u0439 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C \u043D\u0430\u0434 \u0433\u043E\u0440\u043E\u0434\u043E\u043C!");
      world5.sendMessage("\xA74\xA7l========================================");
      this.stopTimer();
      return true;
    }
    return false;
  }
  broadcastGunshotSound(pos, dimId) {
    const dim = world5.getDimension(dimId);
    dim.playSound("random.explode", pos, { pitch: 1.5, volume: 1 });
    for (const player of world5.getAllPlayers()) {
      const dx = player.location.x - pos.x;
      const dy = player.location.y - pos.y;
      const dz = player.location.z - pos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= GAME_CONFIG.weapons.gunshotRadius) {
        player.sendMessage("\xA7c[!] \u0412\u044B \u043E\u0442\u0447\u0435\u0442\u043B\u0438\u0432\u043E \u0441\u043B\u044B\u0448\u0430\u043B\u0438 \u0437\u0432\u0443\u043A \u0432\u044B\u0441\u0442\u0440\u0435\u043B\u0430 \u043D\u0435\u043F\u043E\u0434\u0430\u043B\u0451\u043A\u0443!");
      }
    }
  }
  spawnCorpseEntity(corpseId, pos, dimId, name) {
    try {
      const dim = world5.getDimension(dimId);
      const corpseEntity = dim.spawnEntity("mafia:corpse", pos);
      corpseEntity.setDynamicProperty("corpseId", corpseId);
      corpseEntity.nameTag = `\xA77\u0422\u0440\u0443\u043F: \xA7f${name}`;
    } catch (err) {
      console.warn("spawnCorpseEntity error:", err);
    }
  }
  startPhaseTimer(seconds, onComplete) {
    this.stopTimer();
    this.phaseTimerSeconds = seconds;
    this.phaseIntervalId = system3.runInterval(() => {
      this.phaseTimerSeconds--;
      const minutes = Math.floor(this.phaseTimerSeconds / 60);
      const secs = this.phaseTimerSeconds % 60;
      const timeStr = `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
      for (const p of world5.getAllPlayers()) {
        p.onScreenDisplay.setActionBar(`\xA77\u0424\u0430\u0437\u0430: \xA7e${this.currentPhase} \xA78| \xA77\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C: \xA7f${timeStr}`);
      }
      if (this.phaseTimerSeconds <= 0) {
        this.stopTimer();
        onComplete();
      }
    }, 20);
  }
  stopTimer() {
    if (this.phaseIntervalId !== null) {
      system3.clearRun(this.phaseIntervalId);
      this.phaseIntervalId = null;
    }
  }
};
var gameManager = new GameManager();

// BP/scripts/src/modules/debug/debugManager.ts
var DebugManager = class {
  /**
   * Обработка команд через ванильный /scriptevent mafia:<команда> [параметры]
   */
  handleScriptEvent(event) {
    if (!event.id.startsWith("mafia:")) return;
    const command = event.id.substring("mafia:".length).toLowerCase();
    const args = event.message.trim().split(/\s+/).filter(Boolean);
    const sender = event.sourceEntity instanceof Player7 ? event.sourceEntity : world6.getAllPlayers()[0];
    if (!sender) {
      world6.sendMessage("[Mafia Debug] \u041A\u043E\u043C\u0430\u043D\u0434\u0430 \u0432\u044B\u0437\u0432\u0430\u043D\u0430 \u0431\u0435\u0437 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0433\u043E \u0438\u0433\u0440\u043E\u043A\u0430.");
      return;
    }
    switch (command) {
      case "start":
        gameManager.startGame();
        break;
      case "phase": {
        const targetPhase = args[0]?.toUpperCase();
        if (targetPhase === "DAY") gameManager.transitionToDay();
        else if (targetPhase === "VOTING") gameManager.transitionToVoting();
        else if (targetPhase === "NIGHT") gameManager.transitionToNight();
        else if (targetPhase === "MORNING") gameManager.transitionToMorning(null);
        else sender.sendMessage("\xA7c\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435: /scriptevent mafia:phase <DAY|VOTING|NIGHT|MORNING>");
        break;
      }
      case "role": {
        const roleId = args[0];
        if (roleId && ROLE_DEFINITIONS[roleId]) {
          roleManager.setRole(sender.id, roleId);
          dossierManager.generateDossier(sender.id, sender.name, roleId);
          sender.sendMessage(`\xA7a\u0412\u0430\u043C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430 \u0440\u043E\u043B\u044C: ${ROLE_DEFINITIONS[roleId].name}`);
          roleManager.playRoleRevealAnimation(sender, roleId);
        } else {
          const available = Object.keys(ROLE_DEFINITIONS).join(", ");
          sender.sendMessage(`\xA7c\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u0440\u043E\u043B\u0438: ${available}`);
        }
        break;
      }
      case "status": {
        sender.sendMessage(`\xA7e\u0424\u0430\u0437\u0430: \xA7f${gameManager.getPhase()} \xA77(\u0414\u0435\u043D\u044C: ${gameManager.getDayCount()})`);
        const { mafia, civilian } = roleManager.getTeamCounts();
        sender.sendMessage(`\xA7e\u0416\u0438\u0432\u044B\u0435: \xA7c\u041C\u0430\u0444\u0438\u044F (${mafia}) \xA78| \xA7a\u041C\u0438\u0440\u043D\u044B\u0435 (${civilian})`);
        break;
      }
      case "spawn_corpse": {
        const { corpse } = crimeManager.registerKill(
          sender.id,
          sender.name,
          sender.location,
          sender.dimension.id
        );
        sender.sendMessage(`\xA7a\u0421\u043E\u0437\u0434\u0430\u043D \u0442\u0435\u0441\u0442\u043E\u0432\u044B\u0439 \u0442\u0440\u0443\u043F: ${corpse.id} (\u041E\u0440\u0443\u0436\u0438\u0435: ${corpse.weapon.name})`);
        break;
      }
      case "dossier": {
        const dossier = dossierManager.getDossier(sender.id);
        if (dossier) {
          sender.sendMessage(`\xA7b\u0414\u043E\u0441\u044C\u0435: ${dossier.fakeName}, ${dossier.age} \u043B\u0435\u0442, ${dossier.job}. \u0412\u0435\u0440\u0434\u0438\u043A\u0442: ${dossier.verdict}`);
        } else {
          sender.sendMessage("\xA7c\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0435 \u0440\u043E\u043B\u044C \u0447\u0435\u0440\u0435\u0437 /scriptevent mafia:role <\u0440\u043E\u043B\u044C>");
        }
        break;
      }
      case "list_doors": {
        const doors = doorManager.getAllDoors();
        if (doors.length === 0) {
          sender.sendMessage("\xA77\u0417\u0430\u043F\u0435\u0440\u0442\u044B\u0445 \u0434\u0432\u0435\u0440\u0435\u0439 \u043D\u0430 \u043A\u0430\u0440\u0442\u0435 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u0412\u043E\u0437\u044C\u043C\u0438\u0442\u0435 \u0437\u0430\u043C\u043E\u043A (mafia:door_lock) \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u041F\u041A\u041C \u043F\u043E \u0434\u0432\u0435\u0440\u0438.");
        } else {
          sender.sendMessage(`\xA76\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u0434\u0432\u0435\u0440\u0435\u0439 \u043D\u0430 \u043A\u0430\u0440\u0442\u0435: ${doors.length}`);
          for (const d of doors) {
            sender.sendMessage(`\xA77- [${d.ownerName}] X:${Math.floor(d.doorBlockPos.x)} Y:${Math.floor(d.doorBlockPos.y)} Z:${Math.floor(d.doorBlockPos.z)} | ${d.isLocked ? "\xA7c\u0417\u0430\u043F\u0435\u0440\u0442\u0430" : "\xA7a\u041E\u0442\u043A\u0440\u044B\u0442\u0430"}`);
          }
        }
        break;
      }
      case "clear_doors": {
        doorManager.clearAllDoors();
        sender.sendMessage("\xA7a\u0412\u0441\u0435 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u043C\u043A\u0438 \u0438 \u0434\u0432\u0435\u0440\u0438 \u043D\u0430 \u044D\u0442\u043E\u0439 \u043A\u0430\u0440\u0442\u0435 \u043E\u0447\u0438\u0449\u0435\u043D\u044B!");
        break;
      }
      case "give_items": {
        sender.runCommandAsync("give @s mafia:door_lock 4").catch(() => {
        });
        sender.runCommandAsync("give @s mafia:lockpick 2").catch(() => {
        });
        sender.runCommandAsync("give @s mafia:gloves 1").catch(() => {
        });
        sender.sendMessage("\xA7a\u0412\u0430\u043C \u0432\u044B\u0434\u0430\u043D\u044B: \u0417\u0430\u043C\u043A\u0438, \u041E\u0442\u043C\u044B\u0447\u043A\u0438 \u0438 \u041F\u0435\u0440\u0447\u0430\u0442\u043A\u0438 \u0434\u043B\u044F \u0442\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F!");
        break;
      }
      default:
        sender.sendMessage("\xA7e\u041A\u043E\u043C\u0430\u043D\u0434\u044B Mafia: /scriptevent mafia:<start | phase | role | status | spawn_corpse | dossier | list_doors | clear_doors | give_items>");
        break;
    }
  }
};
var debugManager = new DebugManager();

// BP/scripts/src/modules/corpse/corpseManager.ts
import { system as system4, world as world7 } from "@minecraft/server";
var CorpseInteractionManager = class {
  // Связка: playerId -> corpseId (какой труп игрок сейчас несёт)
  carryingPlayers = /* @__PURE__ */ new Map();
  constructor() {
    this.startCarryingLoop();
  }
  /**
   * Поднять или опустить труп при помощи перчаток
   */
  handleGloveInteraction(player, targetCorpseId) {
    const currentlyCarried = this.carryingPlayers.get(player.id);
    if (currentlyCarried) {
      this.dropCorpse(player);
      player.sendMessage("\xA7e\u0412\u044B \u0430\u043A\u043A\u0443\u0440\u0430\u0442\u043D\u043E \u043F\u043E\u043B\u043E\u0436\u0438\u043B\u0438 \u0442\u0435\u043B\u043E \u043D\u0430 \u0437\u0435\u043C\u043B\u044E.");
      return;
    }
    if (!targetCorpseId) {
      const nearbyCorpse = this.findNearbyCorpse(player.location, 2.5);
      if (nearbyCorpse) {
        this.pickupCorpse(player, nearbyCorpse.id);
      } else {
        player.sendMessage("\xA77\u0420\u044F\u0434\u043E\u043C \u043D\u0435\u0442 \u0442\u0435\u043B \u0434\u043B\u044F \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0430.");
      }
      return;
    }
    this.pickupCorpse(player, targetCorpseId);
  }
  pickupCorpse(player, corpseId) {
    const corpse = crimeManager.getCorpse(corpseId);
    if (!corpse) return;
    if (corpse.carrierId && corpse.carrierId !== player.id) {
      player.sendMessage("\xA7c\u042D\u0442\u043E \u0442\u0435\u043B\u043E \u0443\u0436\u0435 \u043A\u0442\u043E-\u0442\u043E \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442!");
      return;
    }
    corpse.carrierId = player.id;
    this.carryingPlayers.set(player.id, corpseId);
    player.sendMessage(`\xA76\u0412\u044B \u043F\u043E\u0434\u043D\u044F\u043B\u0438 \u0442\u0435\u043B\u043E \u0438\u0433\u0440\u043E\u043A\u0430 \xA7f${corpse.victimName}\xA76. \u041F\u0435\u0440\u0435\u043D\u043E\u0441 \u0437\u0430\u043C\u0435\u0434\u043B\u044F\u0435\u0442 \u0432\u0430\u0441!`);
    player.playSound("armor.equip_leather", { pitch: 1, volume: 0.8 });
  }
  dropCorpse(player) {
    const corpseId = this.carryingPlayers.get(player.id);
    if (!corpseId) return;
    const corpse = crimeManager.getCorpse(corpseId);
    if (corpse) {
      corpse.carrierId = void 0;
      corpse.currentPosition = { ...player.location };
      this.teleportCorpseEntity(corpseId, player.location);
    }
    this.carryingPlayers.delete(player.id);
  }
  /**
   * Осмотр трупа Следователем (п. 9 ТЗ)
   */
  inspectCorpse(investigator, corpseId) {
    const role = roleManager.getRole(investigator.id);
    if (role !== "investigator") {
      investigator.sendMessage("\xA77\u0412\u044B \u043D\u0435 \u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C, \u0447\u0442\u043E\u0431\u044B \u043A\u0432\u0430\u043B\u0438\u0444\u0438\u0446\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E \u043E\u0441\u043C\u0430\u0442\u0440\u0438\u0432\u0430\u0442\u044C \u0442\u0435\u043B\u043E.");
      return;
    }
    const corpse = crimeManager.getCorpse(corpseId);
    if (!corpse) {
      investigator.sendMessage("\xA7c\u0422\u0440\u0443\u043F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.");
      return;
    }
    investigator.sendMessage("\xA7e=== [\u041F\u0420\u041E\u0422\u041E\u041A\u041E\u041B \u041E\u0421\u041C\u041E\u0422\u0420\u0410 \u0422\u0415\u041B\u0410] ===");
    investigator.sendMessage(`\xA77\u0416\u0435\u0440\u0442\u0432\u0430: \xA7f${corpse.victimName}`);
    investigator.sendMessage(`\xA77\u041E\u0440\u0443\u0434\u0438\u0435 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u0430: \xA7e${corpse.weapon.name}`);
    if (corpse.weapon.id === "knife") {
      investigator.sendMessage("\xA77\u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440 \u0440\u0430\u043D: \xA7c\u041A\u043E\u043B\u043E\u0442\u044B\u0435 \u043D\u043E\u0436\u0435\u0432\u044B\u0435 \u0440\u0430\u043D\u0435\u043D\u0438\u044F");
      if (corpse.hasFingerprints) {
        investigator.sendMessage("\xA7a[\u0412\u0410\u0416\u041D\u0410\u042F \u0423\u041B\u0418\u041A\u0410] \u041D\u0430 \u0440\u0443\u043A\u043E\u044F\u0442\u0438 \u043D\u043E\u0436\u0430 \u043E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u044B \u0447\u0435\u0442\u043A\u0438\u0435 \u043E\u0442\u043F\u0435\u0447\u0430\u0442\u043A\u0438 \u043F\u0430\u043B\u044C\u0446\u0435\u0432!");
      } else {
        investigator.sendMessage("\xA78\u041E\u0442\u043F\u0435\u0447\u0430\u0442\u043A\u0438 \u043F\u0430\u043B\u044C\u0446\u0435\u0432 \u0441\u0442\u0451\u0440\u0442\u044B \u0438\u043B\u0438 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442.");
      }
    } else {
      investigator.sendMessage("\xA77\u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440 \u0440\u0430\u043D: \xA7c\u041E\u0433\u043D\u0435\u0441\u0442\u0440\u0435\u043B\u044C\u043D\u043E\u0435 \u0440\u0430\u043D\u0435\u043D\u0438\u0435");
      investigator.sendMessage("\xA7e[\u0421\u043E\u0432\u0435\u0442] \u041E\u0441\u043C\u043E\u0442\u0440\u0438\u0442\u0435 \u0441\u0430\u043C\u043E \u041C\u0415\u0421\u0422\u041E \u041F\u0420\u0415\u0421\u0422\u0423\u041F\u041B\u0415\u041D\u0418\u042F, \u0433\u0434\u0435 \u043F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u043E \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u043E \u2014 \u0442\u0430\u043C \u043C\u043E\u0433\u043B\u0430 \u043E\u0441\u0442\u0430\u0442\u044C\u0441\u044F \u0433\u0438\u043B\u044C\u0437\u0430!");
    }
    investigator.sendMessage("\xA7e================================");
    investigator.playSound("random.orb", { pitch: 1.2, volume: 1 });
  }
  /**
   * Осмотр места преступления Следователем
   */
  inspectCrimeScene(investigator, crimeScene) {
    const role = roleManager.getRole(investigator.id);
    if (role !== "investigator") {
      investigator.sendMessage("\xA77\u041E\u0441\u043C\u043E\u0442\u0440 \u043C\u0435\u0441\u0442\u0430 \u043F\u0440\u0435\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0421\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044E.");
      return;
    }
    investigator.sendMessage("\xA76=== [\u041C\u0415\u0421\u0422\u041E \u041F\u0420\u0415\u0421\u0422\u0423\u041F\u041B\u0415\u041D\u0418\u042F] ===");
    investigator.sendMessage(`\xA77\u0416\u0435\u0440\u0442\u0432\u0430: \xA7f${crimeScene.victimName}`);
    investigator.sendMessage(`\xA77\u0422\u043E\u0447\u043A\u0430 \u0433\u0438\u0431\u0435\u043B\u0438: \xA7fX:${Math.round(crimeScene.position.x)} Y:${Math.round(crimeScene.position.y)} Z:${Math.round(crimeScene.position.z)}`);
    if (crimeScene.casingClue) {
      investigator.sendMessage(`\xA7a[\u041D\u0410\u0419\u0414\u0415\u041D\u0410 \u0413\u0418\u041B\u042C\u0417\u0410] \u041C\u0430\u0440\u043A\u0438\u0440\u043E\u0432\u043A\u0430: \xA7e${crimeScene.casingClue}`);
      crimeScene.casingFound = true;
    } else {
      investigator.sendMessage("\xA77\u0413\u0438\u043B\u044C\u0437\u044B \u043D\u0430 \u043C\u0435\u0441\u0442\u0435 \u043D\u0435 \u043E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u044B (\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0442\u0438\u0445\u043E\u0435 \u0445\u043E\u043B\u043E\u0434\u043D\u043E\u0435 \u043E\u0440\u0443\u0436\u0438\u0435).");
    }
    investigator.sendMessage("\xA76============================");
    investigator.playSound("random.orb", { pitch: 1.2, volume: 1 });
  }
  findNearbyCorpse(location, maxDistance) {
    for (const corpse of crimeManager.getAllCorpses()) {
      const dx = corpse.currentPosition.x - location.x;
      const dy = corpse.currentPosition.y - location.y;
      const dz = corpse.currentPosition.z - location.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= maxDistance) {
        return corpse;
      }
    }
    return void 0;
  }
  teleportCorpseEntity(corpseId, location) {
    for (const dim of ["overworld", "nether", "the_end"]) {
      try {
        const dimension = world7.getDimension(dim);
        const entities = dimension.getEntities({ type: "mafia:corpse" });
        for (const ent of entities) {
          if (ent.getDynamicProperty("corpseId") === corpseId) {
            ent.teleport(location);
            return;
          }
        }
      } catch (_) {
      }
    }
  }
  /**
   * Фоновый цикл обновления переноса трупа (каждые 4 тика)
   */
  startCarryingLoop() {
    system4.runInterval(() => {
      for (const [playerId, corpseId] of this.carryingPlayers.entries()) {
        const player = world7.getAllPlayers().find((p) => p.id === playerId);
        if (!player || !player.isValid()) {
          this.carryingPlayers.delete(playerId);
          continue;
        }
        const corpse = crimeManager.getCorpse(corpseId);
        if (!corpse) {
          this.carryingPlayers.delete(playerId);
          continue;
        }
        corpse.currentPosition = { ...player.location };
        this.teleportCorpseEntity(corpseId, player.location);
        player.runCommandAsync(`effect @s slowness 2 ${GAME_CONFIG.corpse.carrierSlownessAmplifier} true`).catch(() => {
        });
        player.onScreenDisplay.setActionBar("\xA76[\u0412\u044B \u043D\u0435\u0441\u0451\u0442\u0435 \u0442\u0435\u043B\u043E] \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u041F\u041A\u041C \u043F\u0435\u0440\u0447\u0430\u0442\u043A\u0430\u043C\u0438, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u044C");
      }
    }, 4);
  }
};
var corpseManager = new CorpseInteractionManager();

// BP/scripts/src/main.ts
console.warn("\xA76[Mafia: City] \u0421\u043A\u0440\u0438\u043F\u0442\u043E\u0432\u044B\u0439 \u043C\u043E\u0434\u0443\u043B\u044C \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D!");
system5.afterEvents.scriptEventReceive.subscribe((event) => {
  debugManager.handleScriptEvent(event);
});
world8.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const item = event.itemStack;
  if (item.typeId === "mafia:gloves") {
    corpseManager.handleGloveInteraction(player);
  }
});
world8.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const block = event.block;
  const player = event.player;
  const item = event.itemStack;
  if (block.typeId.includes("door")) {
    if (item && item.typeId === "mafia:door_lock") {
      event.cancel = true;
      doorManager.installLock(player, block);
      return;
    }
    if (item && item.typeId === "mafia:lockpick") {
      event.cancel = true;
      doorManager.startLockpicking(player, block);
      return;
    }
    const shouldBlock = doorManager.handleDoorInteract(player, block);
    if (shouldBlock) {
      event.cancel = true;
    }
  }
});
world8.afterEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const target = event.target;
  const item = event.itemStack;
  if (target.typeId === "mafia:corpse") {
    const corpseId = target.getDynamicProperty("corpseId");
    if (item && item.typeId === "mafia:gloves") {
      corpseManager.handleGloveInteraction(player, corpseId);
    } else {
      if (corpseId) {
        corpseManager.inspectCorpse(player, corpseId);
      }
    }
  }
  if (target instanceof Player9) {
    if (roleManager.getRole(player.id) === "investigator") {
      if (player.isSneaking) {
        abilitiesManager.investigatePlayer(player, target);
      }
    }
  }
});
world8.afterEvents.entityHitEntity.subscribe((event) => {
  const attacker = event.damagingEntity;
  const hitEntity = event.hitEntity;
  if (attacker instanceof Player9 && hitEntity instanceof Player9) {
    const inv = attacker.getComponent("inventory");
    const container = inv ? inv.container : void 0;
    const mainHandItem = container ? container.getItem(attacker.selectedSlotIndex) : void 0;
    if (mainHandItem && mainHandItem.typeId === "mafia:grandpa_rifle") {
      abilitiesManager.fireGrandpaRifle(attacker, hitEntity);
    }
  }
});
system5.runInterval(() => {
  for (const player of world8.getAllPlayers()) {
    if (roleManager.getRole(player.id) === "investigator") {
      for (const scene of crimeManager.getAllCrimeScenes()) {
        const dx = player.location.x - scene.position.x;
        const dy = player.location.y - scene.position.y;
        const dz = player.location.z - scene.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist <= 2.5 && !scene.casingFound) {
          corpseManager.inspectCrimeScene(player, scene);
        }
      }
    }
  }
}, 20);
