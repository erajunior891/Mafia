import { Block, Player, world, Vector3 } from "@minecraft/server";
import { GAME_CONFIG } from "../../config";
import { roleManager } from "../roles/roleManager";
import { lockpickMinigame } from "./lockpickMinigame";

export interface HouseDoor {
  id: string; // Формат: x_y_z_dim
  ownerId: string;
  ownerName: string;
  doorBlockPos: Vector3;
  dimensionId: string;
  isLocked: boolean;
  hasLight: boolean; // Включен ли свет в доме
}

const STORAGE_KEY = "mafia_saved_doors";

export class DoorManager {
  private doors = new Map<string, HouseDoor>();

  constructor() {
    this.loadDoorsFromStorage();
  }

  /**
   * Нормализация позиции двери к её нижнему блоку
   */
  public getNormalizedDoorPos(block: Block): Vector3 {
    const loc = block.location;
    try {
      const blockBelow = block.dimension.getBlock({ x: loc.x, y: loc.y - 1, z: loc.z });
      if (blockBelow && blockBelow.typeId.includes("door")) {
        // Мы кликнули по верхней половине двери -> нижняя половина на y - 1
        return { x: loc.x, y: loc.y - 1, z: loc.z };
      }
    } catch (_) {}
    return { x: loc.x, y: loc.y, z: loc.z };
  }

  public getDoorKey(pos: Vector3, dimensionId: string): string {
    return `${Math.floor(pos.x)}_${Math.floor(pos.y)}_${Math.floor(pos.z)}_${dimensionId}`;
  }

  public getDoorAt(pos: Vector3, dimensionId: string): HouseDoor | undefined {
    return this.doors.get(this.getDoorKey(pos, dimensionId));
  }

  public getDoorByBlock(block: Block): HouseDoor | undefined {
    const pos = this.getNormalizedDoorPos(block);
    return this.getDoorAt(pos, block.dimension.id);
  }

  /**
   * Установка замка на дверь предметом mafia:door_lock
   */
  public installLock(player: Player, block: Block): boolean {
    const pos = this.getNormalizedDoorPos(block);
    const key = this.getDoorKey(pos, block.dimension.id);

    const existingDoor = this.doors.get(key);
    if (existingDoor) {
      if (existingDoor.ownerId === player.id) {
        if (player.isSneaking) {
          // Снятие своего замка
          this.doors.delete(key);
          this.saveDoorsToStorage();
          player.sendMessage("§eВы сняли замок со своей двери. Дверь теперь открыта для всех.");
          player.runCommandAsync("give @s mafia:door_lock 1").catch(() => {});
          player.playSound("random.chestclosed", { pitch: 1.2, volume: 0.8 });
          return true;
        } else {
          player.sendMessage("§eЭто ваша дверь. Присядьте (Sneak) + ПКМ замком, чтобы снять его.");
          return false;
        }
      } else {
        player.sendMessage(`§cНа этой двери уже установлен замок другого жителя (${existingDoor.ownerName})!`);
        return false;
      }
    }

    // Создаём новый замок на двери
    const newDoor: HouseDoor = {
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

    player.sendMessage(`§a[Замок установлен] Эта дверь теперь заперта и принадлежит вам!`);
    player.sendMessage("§7Только вы можете входить свободно. Мафии потребуется отмычка.");
    player.playSound("block.iron_door.close", { pitch: 1.0, volume: 1.0 });

    return true;
  }

  /**
   * Проверка и обработка обычного взаимодействия с дверью (попытка открыть)
   * Возвращает true, если взаимодействие нужно заблокировать (дверь заперта)
   */
  public handleDoorInteract(player: Player, block: Block): boolean {
    const door = this.getDoorByBlock(block);
    if (!door) {
      return false; // Дверь без замка, открывается как обычно
    }

    // Владелец двери может свободно входить
    if (door.ownerId === player.id) {
      if (player.isSneaking) {
        door.isLocked = !door.isLocked;
        this.saveDoorsToStorage();
        const status = door.isLocked ? "§cзаперли" : "§aотперли";
        player.sendMessage(`§eВы ${status} замок на своей двери.`);
        player.playSound("random.click", { pitch: 1.2, volume: 0.6 });
        return true;
      }
      return false; // Позволяем открыть
    }

    // Если дверь заперта, посторонний не может открыть
    if (door.isLocked) {
      player.sendMessage(`§c[Заперто] Дверь защищена замком. Владелец: §f${door.ownerName}`);
      player.playSound("random.door_close", { pitch: 0.8, volume: 0.8 });
      return true; // Заблокировать открытие
    }

    return false;
  }

  /**
   * Запуск мини-игры взлома отмычкой
   */
  public startLockpicking(player: Player, block: Block): void {
    const role = roleManager.getRole(player.id);
    if (role !== "mafia_boss" && role !== "mafia_goon") {
      player.sendMessage("§cВы не умеете обращаться с воровской отмычкой.");
      return;
    }

    const door = this.getDoorByBlock(block);
    if (!door) {
      player.sendMessage("§7На этой двери нет замка, она и так открыта.");
      return;
    }

    if (!door.isLocked) {
      player.sendMessage("§aЗамок на этой двери уже открыт!");
      return;
    }

    // Запускаем интерактивную мини-игру
    lockpickMinigame.startMinigame(player, door, (isSuccess) => {
      if (isSuccess) {
        door.isLocked = false;
        this.saveDoorsToStorage();
        player.sendMessage("§a[Успех] Все штифты поддались! Дверь тихо открыта.");
        player.playSound("random.door_open", { pitch: 1.0, volume: 0.8 });

        // Физически открываем дверь в мире
        try {
          const dim = world.getDimension(door.dimensionId);
          const b = dim.getBlock(door.doorBlockPos);
          if (b) {
            b.setPermutation(b.permutation.withState("open_bit", true));
          }
        } catch (_) {}
      } else {
        player.sendMessage("§c[Срыв] Отмычка с грохотом сломалась!");
        player.playSound("random.break", { pitch: 0.8, volume: 1.0 });

        // Если в доме включен свет — владелец получает предупреждение
        if (door.hasLight) {
          const owner = world.getAllPlayers().find(p => p.id === door.ownerId);
          if (owner && owner.isValid()) {
            owner.sendMessage(GAME_CONFIG.doorLock.ownerAlertMessage);
            owner.playSound("random.orb", { pitch: 0.5, volume: 1.0 });
          }
        } else {
          player.sendMessage("§8(Свет в доме был отключен — хозяин ничего не заподозрил)");
        }
      }
    });
  }

  public setLightState(doorKey: string, hasLight: boolean): void {
    const door = this.doors.get(doorKey);
    if (door) {
      door.hasLight = hasLight;
      this.saveDoorsToStorage();
    }
  }

  public getAllDoors(): HouseDoor[] {
    return Array.from(this.doors.values());
  }

  public clearAllDoors(): void {
    this.doors.clear();
    world.setDynamicProperty(STORAGE_KEY, "");
  }

  // --- Сохранение и загрузка для независимости от карты ---
  private saveDoorsToStorage(): void {
    try {
      const data = JSON.stringify(Array.from(this.doors.values()));
      world.setDynamicProperty(STORAGE_KEY, data);
    } catch (err) {
      console.warn("Failed to save doors to dynamic properties:", err);
    }
  }

  private loadDoorsFromStorage(): void {
    try {
      const data = world.getDynamicProperty(STORAGE_KEY) as string | undefined;
      if (data && data.length > 0) {
        const parsed: HouseDoor[] = JSON.parse(data);
        for (const d of parsed) {
          this.doors.set(d.id, d);
        }
      }
    } catch (err) {
      console.warn("Failed to load doors from dynamic properties:", err);
    }
  }
}

export const doorManager = new DoorManager();
