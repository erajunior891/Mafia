import { Player, world } from "@minecraft/server";
import { GAME_CONFIG } from "../../config";
import { doorManager } from "../doors/doorManager";
import { roleManager } from "../roles/roleManager";

export class LightManager {
  // Количество саботажей, совершённых Шестёркой за текущий день (goonId -> count)
  private goonSabotageCount = new Map<string, number>();

  public onNewDay(): void {
    this.goonSabotageCount.clear();
  }

  /**
   * Случайные ночные аварии со светом (12% шанс на каждый дом)
   */
  public triggerNightBlackouts(): void {
    const doors = doorManager.getAllDoors();
    let blackoutsCount = 0;

    for (const door of doors) {
      if (Math.random() < GAME_CONFIG.lighting.nightBlackoutChance) {
        door.hasLight = false;
        blackoutsCount++;

        const owner = world.getAllPlayers().find(p => p.id === door.ownerId);
        if (owner && owner.isValid()) {
          owner.sendMessage("§e[Сеть] В вашем доме внезапно погас свет из-за аварии на подстанции!");
        }
      }
    }

    if (blackoutsCount > 0) {
      world.sendMessage(`§7[Город] Ночью в нескольких домах (${blackoutsCount}) произошло отключение света.`);
    }
  }

  /**
   * Саботаж света Шестёркой днём
   */
  public sabotageHouseLight(goon: Player, houseDoorKey: string): boolean {
    const role = roleManager.getRole(goon.id);
    if (role !== "mafia_goon") {
      goon.sendMessage("§cТолько Шестёрка может саботировать щитки электропитания.");
      return false;
    }

    const usedCount = this.goonSabotageCount.get(goon.id) || 0;
    if (usedCount >= GAME_CONFIG.lighting.sabotagePerGoonPerDay) {
      goon.sendMessage("§cВы уже исчерпали лимит саботажа на сегодня (1 дом в день).");
      return false;
    }

    const door = doorManager.getDoorAt({ x: 0, y: 0, z: 0 }); // Или по ключу
    doorManager.setLightState(houseDoorKey, false);
    this.goonSabotageCount.set(goon.id, usedCount + 1);

    goon.sendMessage("§a[Саботаж] Вы успешно обесточили этот дом! Владелец не получит сигнал тревоги при взломе.");
    goon.playSound("random.fuse", { pitch: 1.2, volume: 0.8 });
    return true;
  }

  /**
   * Починка света хозяином дома
   */
  public repairLight(owner: Player, houseDoorKey: string): void {
    doorManager.setLightState(houseDoorKey, true);
    owner.sendMessage("§aВы восстановили предохранитель! Свет в доме снова горит.");
    owner.playSound("random.click", { pitch: 1.0, volume: 0.7 });
  }

  public clear(): void {
    this.goonSabotageCount.clear();
  }
}

export const lightManager = new LightManager();
