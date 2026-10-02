import { ScriptEventCommandMessageAfterEvent, Player, world } from "@minecraft/server";
import { GAME_CONFIG } from "../../config";
import { gameManager, GamePhase } from "../game/gameManager";
import { roleManager } from "../roles/roleManager";
import { RoleId, ROLE_DEFINITIONS } from "../roles/types";
import { crimeManager } from "../crime/crimeManager";
import { dossierManager } from "../dossier/dossierManager";

export class DebugManager {
  /**
   * Обработка команд через ванильный /scriptevent mafia:<команда> [параметры]
   */
  public handleScriptEvent(event: ScriptEventCommandMessageAfterEvent): void {
    if (!event.id.startsWith("mafia:")) return;

    const command = event.id.substring("mafia:".length).toLowerCase();
    const args = event.message.trim().split(/\s+/).filter(Boolean);
    const sender = event.sourceEntity instanceof Player ? event.sourceEntity : world.getAllPlayers()[0];

    if (!sender) {
      world.sendMessage("[Mafia Debug] Команда вызвана без доступного игрока.");
      return;
    }

    switch (command) {
      case "start":
        gameManager.startGame();
        break;

      case "phase": {
        const targetPhase = args[0]?.toUpperCase() as GamePhase;
        if (targetPhase === "DAY") gameManager.transitionToDay();
        else if (targetPhase === "VOTING") gameManager.transitionToVoting();
        else if (targetPhase === "NIGHT") gameManager.transitionToNight();
        else if (targetPhase === "MORNING") gameManager.transitionToMorning(null);
        else sender.sendMessage("§cИспользование: /scriptevent mafia:phase <DAY|VOTING|NIGHT|MORNING>");
        break;
      }

      case "role": {
        const roleId = args[0] as RoleId;
        if (roleId && ROLE_DEFINITIONS[roleId]) {
          roleManager.setRole(sender.id, roleId);
          dossierManager.generateDossier(sender.id, sender.name, roleId);
          sender.sendMessage(`§aВам установлена роль: ${ROLE_DEFINITIONS[roleId].name}`);
          roleManager.playRoleRevealAnimation(sender, roleId);
        } else {
          const available = Object.keys(ROLE_DEFINITIONS).join(", ");
          sender.sendMessage(`§cДоступные роли: ${available}`);
        }
        break;
      }

      case "status": {
        sender.sendMessage(`§eФаза: §f${gameManager.getPhase()} §7(День: ${gameManager.getDayCount()})`);
        const { mafia, civilian } = roleManager.getTeamCounts();
        sender.sendMessage(`§eЖивые: §cМафия (${mafia}) §8| §aМирные (${civilian})`);
        break;
      }

      case "spawn_corpse": {
        const { corpse } = crimeManager.registerKill(
          sender.id,
          sender.name,
          sender.location,
          sender.dimension.id
        );
        sender.sendMessage(`§aСоздан тестовый труп: ${corpse.id} (Оружие: ${corpse.weapon.name})`);
        break;
      }

      case "dossier": {
        const dossier = dossierManager.getDossier(sender.id);
        if (dossier) {
          sender.sendMessage(`§bДосье: ${dossier.fakeName}, ${dossier.age} лет, ${dossier.job}. Вердикт: ${dossier.verdict}`);
        } else {
          sender.sendMessage("§cСначала получите роль через /scriptevent mafia:role <роль>");
        }
        break;
      }

      default:
        sender.sendMessage("§eКоманды Mafia: /scriptevent mafia:<start | phase | role | status | spawn_corpse | dossier>");
        break;
    }
  }
}

export const debugManager = new DebugManager();
