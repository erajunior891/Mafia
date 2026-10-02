import { Player, system, world } from "@minecraft/server";
import { GAME_CONFIG } from "../../config";
import { RoleId, ROLE_DEFINITIONS } from "./types";
import { dossierManager } from "../dossier/dossierManager";

export class RoleManager {
  private playerRoles = new Map<string, RoleId>();
  private alivePlayers = new Set<string>();

  public getRole(playerId: string): RoleId | undefined {
    return this.playerRoles.get(playerId);
  }

  public setRole(playerId: string, role: RoleId): void {
    this.playerRoles.set(playerId, role);
    this.alivePlayers.add(playerId);
  }

  public isAlive(playerId: string): boolean {
    return this.alivePlayers.has(playerId);
  }

  public markDead(playerId: string): void {
    this.alivePlayers.delete(playerId);
    
    // Проверка смерти Главы Мафии (п. 3 ТЗ)
    const deadRole = this.getRole(playerId);
    if (deadRole === "mafia_boss") {
      this.promoteGoonToBoss();
    }
  }

  /**
   * Назначение случайной Шестёрки новым Главой Мафии
   */
  private promoteGoonToBoss(): void {
    const livingGoons: Player[] = [];
    for (const player of world.getAllPlayers()) {
      if (this.isAlive(player.id) && this.getRole(player.id) === "mafia_goon") {
        livingGoons.push(player);
      }
    }

    if (livingGoons.length > 0) {
      const luckyGoon = livingGoons[Math.floor(Math.random() * livingGoons.length)];
      this.playerRoles.set(luckyGoon.id, "mafia_boss");
      
      luckyGoon.sendMessage("§4§l[!] Ваш Глава погиб. Теперь ВЫ — новый Глава Мафии!");
      this.playRoleRevealAnimation(luckyGoon, "mafia_boss", "Вы возглавили семью!");
    } else {
      world.sendMessage("§cГлава Мафии погиб, и у мафии больше не осталось Шестёрок!");
    }
  }

  /**
   * Распределение ролей между всеми подключенными игроками
   */
  public distributeRoles(players: Player[]): void {
    this.playerRoles.clear();
    this.alivePlayers.clear();
    dossierManager.clear();

    const count = players.length;
    const rosterDef = GAME_CONFIG.roles.calculateRoster(count);

    // Составляем массив доступных ролей
    const roleDeck: RoleId[] = [];
    for (let i = 0; i < rosterDef.mafia_boss; i++) roleDeck.push("mafia_boss");
    for (let i = 0; i < rosterDef.mafia_goon; i++) roleDeck.push("mafia_goon");
    for (let i = 0; i < rosterDef.doctor; i++) roleDeck.push("doctor");
    for (let i = 0; i < rosterDef.investigator; i++) roleDeck.push("investigator");
    for (let i = 0; i < rosterDef.grandpa; i++) roleDeck.push("grandpa");
    for (let i = 0; i < rosterDef.citizen; i++) roleDeck.push("citizen");

    // Перемешиваем игроков
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    shuffledPlayers.forEach((player, index) => {
      const assignedRole = roleDeck[index] || "citizen";
      this.setRole(player.id, assignedRole);

      // Генерируем личное досье
      dossierManager.generateDossier(player.id, player.name, assignedRole);

      // Запускаем атмосферную анимацию выдачи роли (п. 4 ТЗ)
      this.playRoleRevealAnimation(player, assignedRole);
    });

    // Уведомляем мафию о членах своей команды
    this.notifyMafiaTeam(players);
  }

  /**
   * Анимация выдачи роли (п. 4 ТЗ)
   * 1. Темнота + Слепота на 8 сек
   * 2. На 3.5–4 сек карточка роли
   * 3. Карточка показывается 2–3 сек
   */
  public playRoleRevealAnimation(player: Player, roleId: RoleId, customSubtitle?: string): void {
    const role = ROLE_DEFINITIONS[roleId];

    // Накладываем слепоту и темноту на 8 секунд (160 тиков)
    player.runCommandAsync("effect @s blindness 8 1 true").catch(() => {});
    player.runCommandAsync("effect @s darkness 8 1 true").catch(() => {});

    // Звуковой эффект интриги
    player.playSound("ambient.cave", { pitch: 0.8, volume: 1.0 });

    // Показ карточки через 3.5 секунды (70 тиков)
    system.runTimeout(() => {
      if (!player.isValid()) return;

      const subtitle = customSubtitle || role.description;
      player.onScreenDisplay.setTitle(`${role.colorTag}§l${role.name}`, {
        fadeInDuration: 10,
        stayDuration: GAME_CONFIG.timings.roleAnimation.cardDurationTicks,
        fadeOutDuration: 10,
        subtitle: `§7${subtitle}`
      });

      player.playSound("random.totem", { pitch: 1.0, volume: 0.7 });
    }, GAME_CONFIG.timings.roleAnimation.cardShowTick);
  }

  /**
   * Оповещение членов мафии друг о друге
   */
  private notifyMafiaTeam(allPlayers: Player[]): void {
    const mafiaMembers = allPlayers.filter(p => {
      const r = this.getRole(p.id);
      return r === "mafia_boss" || r === "mafia_goon";
    });

    const mafiaNames = mafiaMembers.map(p => {
      const r = this.getRole(p.id);
      const title = r === "mafia_boss" ? "§4Глава" : "§cШестёрка";
      return `§f${p.name} (${title}§f)`;
    }).join(", ");

    for (const member of mafiaMembers) {
      system.runTimeout(() => {
        if (member.isValid()) {
          member.sendMessage(`§8[§4Мафия§8] §7Члены семьи: ${mafiaNames}`);
        }
      }, 180); // Показываем после завершения анимации роли
    }
  }

  /**
   * Подсчёт живых игроков по командам
   */
  public getTeamCounts(): { mafia: number; civilian: number } {
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

  public getAllLivingPlayers(): Player[] {
    return world.getAllPlayers().filter(p => this.alivePlayers.has(p.id));
  }
}

export const roleManager = new RoleManager();
