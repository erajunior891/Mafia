import { Entity, Player, system, world, Vector3 } from "@minecraft/server";
import { GAME_CONFIG } from "../../config";
import { crimeManager, CorpseData, CrimeScene } from "../crime/crimeManager";
import { roleManager } from "../roles/roleManager";

export class CorpseInteractionManager {
  // Связка: playerId -> corpseId (какой труп игрок сейчас несёт)
  private carryingPlayers = new Map<string, string>();

  constructor() {
    this.startCarryingLoop();
  }

  /**
   * Поднять или опустить труп при помощи перчаток
   */
  public handleGloveInteraction(player: Player, targetCorpseId?: string): void {
    const currentlyCarried = this.carryingPlayers.get(player.id);

    if (currentlyCarried) {
      // Игрок уже несёт труп -> опускаем на землю
      this.dropCorpse(player);
      player.sendMessage("§eВы аккуратно положили тело на землю.");
      return;
    }

    if (!targetCorpseId) {
      // Поиск ближайшего трупа рядом с игроком
      const nearbyCorpse = this.findNearbyCorpse(player.location, 2.5);
      if (nearbyCorpse) {
        this.pickupCorpse(player, nearbyCorpse.id);
      } else {
        player.sendMessage("§7Рядом нет тел для переноса.");
      }
      return;
    }

    this.pickupCorpse(player, targetCorpseId);
  }

  public pickupCorpse(player: Player, corpseId: string): void {
    const corpse = crimeManager.getCorpse(corpseId);
    if (!corpse) return;

    if (corpse.carrierId && corpse.carrierId !== player.id) {
      player.sendMessage("§cЭто тело уже кто-то переносит!");
      return;
    }

    corpse.carrierId = player.id;
    this.carryingPlayers.set(player.id, corpseId);

    player.sendMessage(`§6Вы подняли тело игрока §f${corpse.victimName}§6. Перенос замедляет вас!`);
    player.playSound("armor.equip_leather", { pitch: 1.0, volume: 0.8 });
  }

  public dropCorpse(player: Player): void {
    const corpseId = this.carryingPlayers.get(player.id);
    if (!corpseId) return;

    const corpse = crimeManager.getCorpse(corpseId);
    if (corpse) {
      corpse.carrierId = undefined;
      corpse.currentPosition = { ...player.location };
      
      // Обновляем позицию сущности трупа в мире
      this.teleportCorpseEntity(corpseId, player.location);
    }

    this.carryingPlayers.delete(player.id);
  }

  /**
   * Осмотр трупа Следователем (п. 9 ТЗ)
   */
  public inspectCorpse(investigator: Player, corpseId: string): void {
    const role = roleManager.getRole(investigator.id);
    if (role !== "investigator") {
      investigator.sendMessage("§7Вы не следователь, чтобы квалифицированно осматривать тело.");
      return;
    }

    const corpse = crimeManager.getCorpse(corpseId);
    if (!corpse) {
      investigator.sendMessage("§cТруп не найден.");
      return;
    }

    investigator.sendMessage("§e=== [ПРОТОКОЛ ОСМОТРА ТЕЛА] ===");
    investigator.sendMessage(`§7Жертва: §f${corpse.victimName}`);
    investigator.sendMessage(`§7Орудие убийства: §e${corpse.weapon.name}`);

    if (corpse.weapon.id === "knife") {
      investigator.sendMessage("§7Характер ран: §cКолотые ножевые ранения");
      if (corpse.hasFingerprints) {
        investigator.sendMessage("§a[ВАЖНАЯ УЛИКА] На рукояти ножа обнаружены четкие отпечатки пальцев!");
      } else {
        investigator.sendMessage("§8Отпечатки пальцев стёрты или отсутствуют.");
      }
    } else {
      investigator.sendMessage("§7Характер ран: §cОгнестрельное ранение");
      investigator.sendMessage("§e[Совет] Осмотрите само МЕСТО ПРЕСТУПЛЕНИЯ, где произошло убийство — там могла остаться гильза!");
    }
    investigator.sendMessage("§e================================");
    investigator.playSound("random.orb", { pitch: 1.2, volume: 1.0 });
  }

  /**
   * Осмотр места преступления Следователем
   */
  public inspectCrimeScene(investigator: Player, crimeScene: CrimeScene): void {
    const role = roleManager.getRole(investigator.id);
    if (role !== "investigator") {
      investigator.sendMessage("§7Осмотр места преступления доступен только Следователю.");
      return;
    }

    investigator.sendMessage("§6=== [МЕСТО ПРЕСТУПЛЕНИЯ] ===");
    investigator.sendMessage(`§7Жертва: §f${crimeScene.victimName}`);
    investigator.sendMessage(`§7Точка гибели: §fX:${Math.round(crimeScene.position.x)} Y:${Math.round(crimeScene.position.y)} Z:${Math.round(crimeScene.position.z)}`);

    if (crimeScene.casingClue) {
      investigator.sendMessage(`§a[НАЙДЕНА ГИЛЬЗА] Маркировка: §e${crimeScene.casingClue}`);
      crimeScene.casingFound = true;
    } else {
      investigator.sendMessage("§7Гильзы на месте не обнаружены (возможно, тихое холодное оружие).");
    }
    investigator.sendMessage("§6============================");
    investigator.playSound("random.orb", { pitch: 1.2, volume: 1.0 });
  }

  private findNearbyCorpse(location: Vector3, maxDistance: number): CorpseData | undefined {
    for (const corpse of crimeManager.getAllCorpses()) {
      const dx = corpse.currentPosition.x - location.x;
      const dy = corpse.currentPosition.y - location.y;
      const dz = corpse.currentPosition.z - location.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= maxDistance) {
        return corpse;
      }
    }
    return undefined;
  }

  private teleportCorpseEntity(corpseId: string, location: Vector3): void {
    for (const dim of ["overworld", "nether", "the_end"]) {
      try {
        const dimension = world.getDimension(dim);
        const entities = dimension.getEntities({ type: "mafia:corpse" });
        for (const ent of entities) {
          if (ent.getDynamicProperty("corpseId") === corpseId) {
            ent.teleport(location);
            return;
          }
        }
      } catch (_) {}
    }
  }

  /**
   * Фоновый цикл обновления переноса трупа (каждые 4 тика)
   */
  private startCarryingLoop(): void {
    system.runInterval(() => {
      for (const [playerId, corpseId] of this.carryingPlayers.entries()) {
        const player = world.getAllPlayers().find(p => p.id === playerId);
        if (!player || !player.isValid()) {
          this.carryingPlayers.delete(playerId);
          continue;
        }

        const corpse = crimeManager.getCorpse(corpseId);
        if (!corpse) {
          this.carryingPlayers.delete(playerId);
          continue;
        }

        // Обновляем позицию трупа вслед за игроком
        corpse.currentPosition = { ...player.location };
        this.teleportCorpseEntity(corpseId, player.location);

        // Накладываем замедление на несущего игрока (Slowness)
        player.runCommandAsync(`effect @s slowness 2 ${GAME_CONFIG.corpse.carrierSlownessAmplifier} true`).catch(() => {});
        player.onScreenDisplay.setActionBar("§6[Вы несёте тело] Нажмите ПКМ перчатками, чтобы положить");
      }
    }, 4);
  }
}

export const corpseManager = new CorpseInteractionManager();
