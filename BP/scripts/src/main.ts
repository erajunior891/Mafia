import { 
  world, 
  system, 
  Player, 
  PlayerInteractWithEntityAfterEvent,
  ItemUseAfterEvent,
  EntityHitEntityAfterEvent,
  ScriptEventCommandMessageAfterEvent
} from "@minecraft/server";
import { debugManager } from "./modules/debug/debugManager";
import { corpseManager } from "./modules/corpse/corpseManager";
import { abilitiesManager } from "./modules/abilities/abilitiesManager";
import { crimeManager } from "./modules/crime/crimeManager";
import { roleManager } from "./modules/roles/roleManager";

console.warn("§6[Mafia: City] Скриптовый модуль успешно загружен!");

// 1. Обработка команд отладки и управления через /scriptevent mafia:<команда> [параметры]
system.afterEvents.scriptEventReceive.subscribe((event: ScriptEventCommandMessageAfterEvent) => {
  debugManager.handleScriptEvent(event);
});

// 2. Использование предметов (ПКМ в воздухе или по блоку)
world.afterEvents.itemUse.subscribe((event: ItemUseAfterEvent) => {
  const player = event.source;
  const item = event.itemStack;

  if (item.typeId === "mafia:gloves") {
    // Взаимодействие с перчатками: поднять ближайший труп или положить текущий
    corpseManager.handleGloveInteraction(player);
  }
});

// 3. Взаимодействие с сущностями (ПКМ по сущности)
world.afterEvents.playerInteractWithEntity.subscribe((event: PlayerInteractWithEntityAfterEvent) => {
  const player = event.player;
  const target = event.target;
  const item = event.itemStack;

  // Взаимодействие с трупом
  if (target.typeId === "mafia:corpse") {
    const corpseId = target.getDynamicProperty("corpseId") as string | undefined;

    if (item && item.typeId === "mafia:gloves") {
      // Игрок держит перчатки -> поднимает или отпускает труп
      corpseManager.handleGloveInteraction(player, corpseId);
    } else {
      // Игрок без перчаток (или Следователь) осматривает труп
      if (corpseId) {
        corpseManager.inspectCorpse(player, corpseId);
      }
    }
  }

  // Следователь осматривает живого игрока для получения Досье
  if (target instanceof Player) {
    if (roleManager.getRole(player.id) === "investigator") {
      // Если игрок присел (sneak) и взаимодействует с живым игроком
      if (player.isSneaking) {
        abilitiesManager.investigatePlayer(player, target);
      }
    }
  }
});

// 4. Удар сущности (выстрел Деда или атака)
world.afterEvents.entityHitEntity.subscribe((event: EntityHitEntityAfterEvent) => {
  const attacker = event.damagingEntity;
  const hitEntity = event.hitEntity;

  if (attacker instanceof Player && hitEntity instanceof Player) {
    const inv = attacker.getComponent("inventory");
    const container = inv ? (inv as any).container : undefined;
    const mainHandItem = container ? container.getItem(attacker.selectedSlotIndex) : undefined;
    
    // Ружьё Деда
    if (mainHandItem && mainHandItem.typeId === "mafia:grandpa_rifle") {
      abilitiesManager.fireGrandpaRifle(attacker, hitEntity);
    }
  }
});

// 5. Периодическая проверка осмотра места преступления Следователем
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    if (roleManager.getRole(player.id) === "investigator") {
      for (const scene of crimeManager.getAllCrimeScenes()) {
        const dx = player.location.x - scene.position.x;
        const dy = player.location.y - scene.position.y;
        const dz = player.location.z - scene.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Если Следователь подошёл к точке убийства
        if (dist <= 2.5 && !scene.casingFound) {
          corpseManager.inspectCrimeScene(player, scene);
        }
      }
    }
  }
}, 20);
