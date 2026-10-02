import { Player, system, world, Vector3 } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { GAME_CONFIG } from "../../config";
import { roleManager } from "../roles/roleManager";
import { ROLE_DEFINITIONS } from "../roles/types";
import { crimeManager } from "../crime/crimeManager";
import { abilitiesManager } from "../abilities/abilitiesManager";
import { lightManager } from "../lights/lightManager";

export type GamePhase = "LOBBY" | "PREPARATION" | "DAY" | "VOTING" | "NIGHT" | "MORNING" | "ENDED";

export class GameManager {
  private currentPhase: GamePhase = "LOBBY";
  private phaseTimerSeconds = 0;
  private phaseIntervalId: number | null = null;
  private dayCount = 1;

  // Ночная атака мафии
  private mafiaChosenTargetId: string | null = null;

  // Голосование: voterId -> targetPlayerId
  private votes = new Map<string, string>();

  public getPhase(): GamePhase {
    return this.currentPhase;
  }

  public getDayCount(): number {
    return this.dayCount;
  }

  /**
   * Запуск игры
   */
  public startGame(): void {
    const players = world.getAllPlayers();
    if (players.length < 2 && !GAME_CONFIG.debug.enabled) {
      world.sendMessage("§cДля старта игры нужно как минимум 2 игрока (или включите режим отладки).");
      return;
    }

    world.sendMessage("§6§l=== НАЧАЛО ИГРЫ «МАФИЯ: ГОРОД» ===");
    this.dayCount = 1;
    this.currentPhase = "PREPARATION";

    // Очищаем предыдущие состояния
    crimeManager.clear();
    abilitiesManager.clear();
    lightManager.clear();
    this.votes.clear();

    // Распределяем роли
    roleManager.distributeRoles(players);

    // Выдаём каждому игроку перчатки (п. 6 ТЗ)
    for (const player of players) {
      player.runCommandAsync("give @s mafia:gloves 1").catch(() => {});
      
      const role = roleManager.getRole(player.id);
      if (role === "mafia_boss" || role === "mafia_goon") {
        player.runCommandAsync("give @s mafia:lockpick 1").catch(() => {});
      }
    }

    this.startPhaseTimer(GAME_CONFIG.timings.preparationSeconds, () => {
      this.transitionToDay();
    });
  }

  /**
   * Переход к фазе ДЕНЬ
   */
  public transitionToDay(): void {
    this.currentPhase = "DAY";
    abilitiesManager.onDayStart();
    lightManager.onNewDay();
    this.votes.clear();

    world.sendMessage(`§e§l--- ДЕНЬ ${this.dayCount} ---`);
    world.sendMessage("§7Горожане могут свободно перемещаться, общаться и искать улики.");

    // Устанавливаем дневное время в мире
    world.getDimension("overworld").runCommandAsync("time set day").catch(() => {});

    this.startPhaseTimer(GAME_CONFIG.timings.daySeconds, () => {
      this.transitionToVoting();
    });
  }

  /**
   * Переход к фазе ГОЛОСОВАНИЕ
   */
  public transitionToVoting(): void {
    this.currentPhase = "VOTING";
    this.votes.clear();

    world.sendMessage("§c§l--- ГОЛОСОВАНИЕ ЗА ИСКЛЮЧЕНИЕ ---");
    world.sendMessage("§7У каждого живого игрока есть 60 секунд, чтобы сделать выбор.");

    // Открываем форму голосования всем живым игрокам
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
  public openVotingForm(voter: Player): void {
    const living = roleManager.getAllLivingPlayers();
    const candidateNames = living.map(p => p.name);

    const form = new ModalFormData();
    form.title("§4Голосование Города");
    form.dropdown("Выберите подозреваемого для исключения:", candidateNames);

    form.show(voter).then(response => {
      if (response.canceled || response.formValues === undefined) return;
      const selectedIndex = response.formValues[0] as number;
      const chosenPlayer = living[selectedIndex];
      if (chosenPlayer) {
        this.castVote(voter.id, chosenPlayer.id);
        voter.sendMessage(`§aВы проголосовали против: §f${chosenPlayer.name}`);
      }
    }).catch(() => {});
  }

  public castVote(voterId: string, targetId: string): void {
    if (this.currentPhase !== "VOTING") return;
    this.votes.set(voterId, targetId);
  }

  /**
   * Подведение итогов голосования
   */
  private resolveVoting(): void {
    const voteTallies = new Map<string, number>();
    for (const targetId of this.votes.values()) {
      voteTallies.set(targetId, (voteTallies.get(targetId) || 0) + 1);
    }

    let highestVotes = 0;
    let expelledPlayerId: string | null = null;
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
      world.sendMessage("§e[Итоги голосования] Ничья или голоса разделились. Никто не исключён!");
      world.sendMessage("§7Все расходятся по домам. Наступает ночь...");
    } else {
      const expelledPlayer = world.getAllPlayers().find(p => p.id === expelledPlayerId);
      const roleId = roleManager.getRole(expelledPlayerId);
      const roleDef = roleId ? ROLE_DEFINITIONS[roleId] : undefined;

      roleManager.markDead(expelledPlayerId);
      world.sendMessage(`§c[Итоги голосования] Большинством голосов исключён: §f${expelledPlayer?.name || "Игрок"}§c!`);
      if (roleDef) {
        world.sendMessage(`§7Его роль была: ${roleDef.colorTag}${roleDef.name}`);
      }

      if (expelledPlayer && expelledPlayer.isValid()) {
        expelledPlayer.runCommandAsync("gamemode spectator @s").catch(() => {});
      }
    }

    // Проверка условий победы после голосования
    if (this.checkWinConditions()) return;

    // Переход к ночи
    this.transitionToNight();
  }

  /**
   * Переход к фазе НОЧЬ
   */
  public transitionToNight(): void {
    this.currentPhase = "NIGHT";
    this.mafiaChosenTargetId = null;

    world.sendMessage("§9§l--- НАСТУПАЕТ НОЧЬ ---");
    world.sendMessage("§7Мирные жители заперлись в домах. Мафия выходит на охоту...");

    world.getDimension("overworld").runCommandAsync("time set midnight").catch(() => {});

    // Инициализация ночных способностей (патруль Деда, ночное замедление, аварии света)
    abilitiesManager.onNightStart();
    lightManager.triggerNightBlackouts();

    this.startPhaseTimer(GAME_CONFIG.timings.nightSeconds, () => {
      this.resolveNight();
    });
  }

  /**
   * Назначение жертвы мафии
   */
  public setMafiaTarget(bossOrGoon: Player, targetId: string): void {
    const role = roleManager.getRole(bossOrGoon.id);
    if (role !== "mafia_boss" && role !== "mafia_goon") return;

    this.mafiaChosenTargetId = targetId;
    const targetPlayer = world.getAllPlayers().find(p => p.id === targetId);
    
    // Уведомление всей мафии
    for (const member of world.getAllPlayers()) {
      const r = roleManager.getRole(member.id);
      if (r === "mafia_boss" || r === "mafia_goon") {
        member.sendMessage(`§4[Мафия] Выбрана жертва на эту ночь: §f${targetPlayer?.name || targetId}`);
      }
    }
  }

  /**
   * Подведение итогов ночи
   */
  private resolveNight(): void {
    const victimId = this.mafiaChosenTargetId;

    if (!victimId) {
      // Мафия никого не атаковала -> сброс серии
      crimeManager.resetKillStreak();
      this.transitionToMorning(null);
      return;
    }

    const victim = world.getAllPlayers().find(p => p.id === victimId);
    const victimRole = roleManager.getRole(victimId);

    // 1. Проверка защиты Доктора
    if (abilitiesManager.isProtectedByDoctor(victimId)) {
      world.sendMessage("§a[Ночь] Этой ночью Доктор спас чью-то жизнь!");
      crimeManager.resetKillStreak();
      this.transitionToMorning(null);
      return;
    }

    // 2. Если цель Дед -> шанс гибели 90%
    if (victimRole === "grandpa") {
      if (Math.random() > GAME_CONFIG.grandpa.mafiaAttackDeathChance) {
        world.sendMessage("§e[Ночь] Старый Дед дал яростный отпор нападавшим и чудом выжил!");
        crimeManager.resetKillStreak();
        this.transitionToMorning(null);
        return;
      }
    }

    // 3. Убийство совершается!
    const victimPos = victim ? { ...victim.location } : { x: 0, y: 64, z: 0 };
    const dimensionId = victim ? victim.dimension.id : "overworld";

    const { crimeScene, corpse } = crimeManager.registerKill(
      victimId,
      victim?.name || "Неизвестный",
      victimPos,
      dimensionId
    );

    // Воспроизведение звука выстрела в радиусе (если не тихий нож)
    if (!corpse.weapon.isSilent && victim) {
      this.broadcastGunshotSound(victimPos, dimensionId);
    }

    // Убиваем игрока (или переводим в наблюдатели)
    roleManager.markDead(victimId);
    if (victim && victim.isValid()) {
      victim.runCommandAsync("gamemode spectator @s").catch(() => {});
      victim.sendMessage("§4Вы погибли этой ночью от рук мафии!");
    }

    // Спавним сущность трупа на месте гибели
    this.spawnCorpseEntity(corpse.id, victimPos, dimensionId, victim?.name || "Труп");

    this.transitionToMorning(corpse.victimName);
  }

  /**
   * Переход к фазе УТРО
   */
  public transitionToMorning(killedVictimName: string | null): void {
    this.currentPhase = "MORNING";
    this.dayCount++;

    world.sendMessage("§6§l--- НАСТУПАЕТ УТРО ---");
    world.getDimension("overworld").runCommandAsync("time set sunrise").catch(() => {});

    if (killedVictimName) {
      world.sendMessage(`§c[Городские новости] Этой ночью в городе был убит: §f${killedVictimName}§c!`);
      world.sendMessage("§7Тело можно перенести в перчатках, а Следователь может осмотреть его и место преступления.");
    } else {
      world.sendMessage("§a[Городские новости] Чудесное утро! Этой ночью никто не погиб.");
    }

    // Проверка победы
    if (this.checkWinConditions()) return;

    this.startPhaseTimer(GAME_CONFIG.timings.morningSeconds, () => {
      this.transitionToDay();
    });
  }

  /**
   * Проверка условий победы (п. 9 ТЗ)
   */
  public checkWinConditions(): boolean {
    const { mafia, civilian } = roleManager.getTeamCounts();

    if (mafia === 0) {
      this.currentPhase = "ENDED";
      world.sendMessage("§a§l========================================");
      world.sendMessage("§a§lПОБЕДА МИРНЫХ ЖИТЕЛЕЙ!");
      world.sendMessage("§7Вся преступная группировка города ликвидирована!");
      world.sendMessage("§a§l========================================");
      this.stopTimer();
      return true;
    }

    if (mafia >= civilian) {
      this.currentPhase = "ENDED";
      world.sendMessage("§4§l========================================");
      world.sendMessage("§4§lПОБЕДА МАФИИ!");
      world.sendMessage("§7Мафия взяла полный контроль над городом!");
      world.sendMessage("§4§l========================================");
      this.stopTimer();
      return true;
    }

    return false;
  }

  private broadcastGunshotSound(pos: Vector3, dimId: string): void {
    const dim = world.getDimension(dimId);
    dim.playSound("random.explode", pos, { pitch: 1.5, volume: 1.0 });

    for (const player of world.getAllPlayers()) {
      const dx = player.location.x - pos.x;
      const dy = player.location.y - pos.y;
      const dz = player.location.z - pos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= GAME_CONFIG.weapons.gunshotRadius) {
        player.sendMessage("§c[!] Вы отчетливо слышали звук выстрела неподалёку!");
      }
    }
  }

  private spawnCorpseEntity(corpseId: string, pos: Vector3, dimId: string, name: string): void {
    try {
      const dim = world.getDimension(dimId);
      const corpseEntity = dim.spawnEntity("mafia:corpse", pos);
      corpseEntity.setDynamicProperty("corpseId", corpseId);
      corpseEntity.nameTag = `§7Труп: §f${name}`;
    } catch (err) {
      // Резервный вариант, если моб ещё не загружен
      console.warn("spawnCorpseEntity error:", err);
    }
  }

  private startPhaseTimer(seconds: number, onComplete: () => void): void {
    this.stopTimer();
    this.phaseTimerSeconds = seconds;

    this.phaseIntervalId = system.runInterval(() => {
      this.phaseTimerSeconds--;

      // Показываем таймер в actionbar
      const minutes = Math.floor(this.phaseTimerSeconds / 60);
      const secs = this.phaseTimerSeconds % 60;
      const timeStr = `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
      
      for (const p of world.getAllPlayers()) {
        p.onScreenDisplay.setActionBar(`§7Фаза: §e${this.currentPhase} §8| §7Осталось: §f${timeStr}`);
      }

      if (this.phaseTimerSeconds <= 0) {
        this.stopTimer();
        onComplete();
      }
    }, 20);
  }

  private stopTimer(): void {
    if (this.phaseIntervalId !== null) {
      system.clearRun(this.phaseIntervalId);
      this.phaseIntervalId = null;
    }
  }
}

export const gameManager = new GameManager();
