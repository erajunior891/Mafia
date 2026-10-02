import { Block, Player, system, world, Vector3 } from "@minecraft/server";
import { GAME_CONFIG } from "../../config";
import { roleManager } from "../roles/roleManager";

export interface HouseDoor {
  id: string;
  ownerId: string;
  doorBlockPos: Vector3;
  isLocked: boolean;
  hasLight: boolean; // Включен ли свет в доме
}

export class DoorManager {
  private doors = new Map<string, HouseDoor>();
  private activePicking = new Map<string, { tickCount: number; targetDoorKey: string }>();

  public registerHouseDoor(ownerId: string, pos: Vector3): void {
    const key = `${Math.floor(pos.x)}_${Math.floor(pos.y)}_${Math.floor(pos.z)}`;
    this.doors.set(key, {
      id: key,
      ownerId,
      doorBlockPos: pos,
      isLocked: true,
      hasLight: true
    });
  }

  public getDoorAt(pos: Vector3): HouseDoor | undefined {
    const key = `${Math.floor(pos.x)}_${Math.floor(pos.y)}_${Math.floor(pos.z)}`;
    return this.doors.get(key);
  }

  public setLightState(doorKey: string, hasLight: boolean): void {
    const door = this.doors.get(doorKey);
    if (door) {
      door.hasLight = hasLight;
    }
  }

  public getAllDoors(): HouseDoor[] {
    return Array.from(this.doors.values());
  }

  /**
   * Начать или продолжить процесс взлома двери отмычкой
   */
  public attemptLockpick(player: Player, door: HouseDoor): void {
    const role = roleManager.getRole(player.id);
    if (role !== "mafia_boss" && role !== "mafia_goon") {
      player.sendMessage("§cВы не умеете обращаться с отмычкой.");
      return;
    }

    const currentSession = this.activePicking.get(player.id);
    if (!currentSession || currentSession.targetDoorKey !== door.id) {
      // Старт нового взлома
      this.activePicking.set(player.id, {
        tickCount: 0,
        targetDoorKey: door.id
      });
      player.onScreenDisplay.setActionBar("§eВзлом замка: [ §a||||§7|||||||||||||||| ]");
      player.playSound("step.iron_bare", { pitch: 1.5, volume: 0.5 });
      return;
    }

    // Инкремент прогресса
    currentSession.tickCount += 5;
    const progress = Math.min(1.0, currentSession.tickCount / GAME_CONFIG.doorLock.pickDurationTicks);
    const barsTotal = 20;
    const filledBars = Math.floor(progress * barsTotal);
    const emptyBars = barsTotal - filledBars;
    const barStr = "§a" + "|".repeat(filledBars) + "§7" + "|".repeat(emptyBars);
    player.onScreenDisplay.setActionBar(`§eВзлом замка: [ ${barStr} ]`);

    if (currentSession.tickCount >= GAME_CONFIG.doorLock.pickDurationTicks) {
      this.activePicking.delete(player.id);
      this.resolveLockpick(player, door);
    }
  }

  /**
   * Завершение взлома: расчёт шанса успеха (65%)
   */
  private resolveLockpick(player: Player, door: HouseDoor): void {
    const isSuccess = Math.random() < GAME_CONFIG.doorLock.successChance;

    if (isSuccess) {
      door.isLocked = false;
      player.sendMessage("§a[Успех] Замок тихо щёлкнул и открылся!");
      player.playSound(GAME_CONFIG.doorLock.quietSound, { pitch: 1.0, volume: 0.6 });
    } else {
      player.sendMessage("§c[Срыв] Отмычка сорвалась с громким лязгом!");
      player.playSound(GAME_CONFIG.doorLock.alarmSound, { pitch: 0.8, volume: 1.0 });

      // Если в доме включен свет — владелец получает предупреждение
      if (door.hasLight) {
        const owner = world.getAllPlayers().find(p => p.id === door.ownerId);
        if (owner && owner.isValid()) {
          owner.sendMessage(GAME_CONFIG.doorLock.ownerAlertMessage);
          owner.playSound("random.orb", { pitch: 0.5, volume: 1.0 });
        }
      }
    }
  }

  public clear(): void {
    this.doors.clear();
    this.activePicking.clear();
  }
}

export const doorManager = new DoorManager();
