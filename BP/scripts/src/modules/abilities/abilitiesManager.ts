import { EntityDamageSource, Player, world } from "@minecraft/server";
import { GAME_CONFIG } from "../../config";
import { roleManager } from "../roles/roleManager";
import { dossierManager } from "../dossier/dossierManager";

export class AbilitiesManager {
  // Доктор
  private doctorProtectedTargetId: string | null = null;
  private doctorLastProtectedTargetId: string | null = null;

  // Дед
  private grandpaOnPatrol = false;
  private grandpaRifleAmmo = 0;

  // Следователь: проверенные за сегодня игроки (playerId)
  private investigatorCheckedToday = new Set<string>();

  public onNightStart(): void {
    this.doctorProtectedTargetId = null;

    // Проверка патруля Деда (40% шанс)
    const livingGrandpa = world.getAllPlayers().find(p => 
      roleManager.isAlive(p.id) && roleManager.getRole(p.id) === "grandpa"
    );

    if (livingGrandpa) {
      const willPatrol = Math.random() < GAME_CONFIG.grandpa.patrolChance;
      this.grandpaOnPatrol = willPatrol;

      if (willPatrol) {
        this.grandpaRifleAmmo = GAME_CONFIG.grandpa.rifleMaxAmmo;
        livingGrandpa.sendMessage(`§6[Патруль] Вы снарядили старое ружьё (${this.grandpaRifleAmmo} заряда) и вышли на ночной патруль города!`);
        livingGrandpa.runCommandAsync("give @s mafia:grandpa_rifle 1").catch(() => {});
      } else {
        livingGrandpa.sendMessage("§7[Ночь] Вы решили остаться дома этой ночью.");
      }

      // Накладываем ночное замедление Деда (Slowness)
      livingGrandpa.runCommandAsync(`effect @s slowness 180 ${GAME_CONFIG.grandpa.nightSlownessAmplifier} true`).catch(() => {});
    }
  }

  public onDayStart(): void {
    // Очищаем ночные состояния
    this.doctorLastProtectedTargetId = this.doctorProtectedTargetId;
    this.doctorProtectedTargetId = null;
    this.investigatorCheckedToday.clear();

    // Забираем ружьё у Деда утром
    if (this.grandpaOnPatrol) {
      this.grandpaOnPatrol = false;
      this.grandpaRifleAmmo = 0;
      
      const grandpa = world.getAllPlayers().find(p => roleManager.getRole(p.id) === "grandpa");
      if (grandpa) {
        grandpa.runCommandAsync("clear @s mafia:grandpa_rifle").catch(() => {});
        grandpa.sendMessage("§7[Утро] Вы вернулись с патруля и спрятали ружьё.");
      }
    }
  }

  // --- Доктор ---
  public setDoctorProtection(doctor: Player, targetId: string): boolean {
    const role = roleManager.getRole(doctor.id);
    if (role !== "doctor") return false;

    if (!GAME_CONFIG.doctor.allowConsecutiveSameTarget && targetId === this.doctorLastProtectedTargetId) {
      doctor.sendMessage("§cВы не можете защищать одного и того же человека две ночи подряд!");
      return false;
    }

    this.doctorProtectedTargetId = targetId;
    const targetPlayer = world.getAllPlayers().find(p => p.id === targetId);
    doctor.sendMessage(`§aВы взяли под защиту игрока §f${targetPlayer?.name || targetId}§a на эту ночь.`);
    return true;
  }

  public isProtectedByDoctor(targetId: string): boolean {
    return this.doctorProtectedTargetId === targetId;
  }

  // --- Дед: выстрел из ружья ---
  public fireGrandpaRifle(grandpa: Player, target: Player): void {
    const role = roleManager.getRole(grandpa.id);
    if (role !== "grandpa") return;

    if (this.grandpaRifleAmmo <= 0) {
      grandpa.sendMessage("§cВ ружье закончились заряды на эту ночь!");
      grandpa.playSound("random.click", { pitch: 1.5, volume: 1.0 });
      return;
    }

    this.grandpaRifleAmmo--;
    grandpa.playSound("random.explode", { pitch: 1.8, volume: 1.0 });
    grandpa.sendMessage(`§e[Выстрел!] Осталось зарядов: ${this.grandpaRifleAmmo}`);

    // Проверяем, является ли цель мафией
    const targetRole = roleManager.getRole(target.id);
    if (targetRole === "mafia_boss" || targetRole === "mafia_goon") {
      // Попадание по мафии: замедление и слабость на 30 сек
      const durationSeconds = Math.floor(GAME_CONFIG.grandpa.hitDebuffDurationTicks / 20);
      target.runCommandAsync(`effect @s slowness ${durationSeconds} 2 true`).catch(() => {});
      target.runCommandAsync(`effect @s weakness ${durationSeconds} 2 true`).catch(() => {});
      target.sendMessage("§4В вас попала картечь Деда! Вы тяжело ранены, ослаблены и замедлены на 30 сек!");
      grandpa.sendMessage("§aВы попали в подозрительную фигуру! Цель сильно ранена и хромает.");
    } else {
      grandpa.sendMessage("§7Выстрел пришёлся в мирного жителя или промах! К счастью, соль лишь напугала цель.");
    }
  }

  // --- Следователь: проверка досье ---
  public investigatePlayer(investigator: Player, target: Player): void {
    const role = roleManager.getRole(investigator.id);
    if (role !== "investigator") {
      investigator.sendMessage("§cТолько Следователь может запрашивать досье граждан.");
      return;
    }

    if (this.investigatorCheckedToday.has(investigator.id)) {
      investigator.sendMessage("§cВы уже использовали запрос досье сегодня (1 раз в сутки).");
      return;
    }

    const dossier = dossierManager.getDossier(target.id);
    if (!dossier) {
      investigator.sendMessage("§cДосье на этого жителя не найдено в полицейском архиве.");
      return;
    }

    this.investigatorCheckedToday.add(investigator.id);

    investigator.sendMessage("§b=== [АРХИВНОЕ ДОСЬЕ ГРАЖДАНИНА] ===");
    investigator.sendMessage(`§7Игрок: §f${target.name}`);
    investigator.sendMessage(`§7Имя по паспорту: §f${dossier.fakeName}`);
    investigator.sendMessage(`§7Возраст: §f${dossier.age} лет (§7${dossier.birthYear} г.р.§f)`);
    investigator.sendMessage(`§7Профессия: §f${dossier.job}`);
    investigator.sendMessage(`§7Лицензии: §e${dossier.licenses.join(", ") || "Отсутствуют"}`);
    investigator.sendMessage(`§6ВЕРДИКТ ПРОВЕРКИ: §l${dossier.verdict}`);
    investigator.sendMessage("§b==================================");

    investigator.playSound("random.levelup", { pitch: 1.5, volume: 0.8 });
  }

  public clear(): void {
    this.doctorProtectedTargetId = null;
    this.doctorLastProtectedTargetId = null;
    this.grandpaOnPatrol = false;
    this.grandpaRifleAmmo = 0;
    this.investigatorCheckedToday.clear();
  }
}

export const abilitiesManager = new AbilitiesManager();
