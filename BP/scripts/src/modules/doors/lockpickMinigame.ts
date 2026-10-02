import { Player, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { HouseDoor } from "./doorManager";

export interface MinigameState {
  currentPin: number;
  totalPins: number;
  durability: number;
  pinSolutions: number[];
  door: HouseDoor;
  lastHint?: string;
}

export class LockpickMinigame {
  private activeSessions = new Map<string, MinigameState>();

  /**
   * Запуск интерактивной мини-игры взлома замка
   */
  public startMinigame(
    player: Player, 
    door: HouseDoor, 
    onFinish: (success: boolean) => void
  ): void {
    const totalPins = 3;
    const pinSolutions = [
      Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 3)
    ];

    const state: MinigameState = {
      currentPin: 0,
      totalPins,
      durability: 3,
      pinSolutions,
      door,
      lastHint: "§7Замок заперт. Подберите положение для каждого из 3 штифтов."
    };

    this.activeSessions.set(player.id, state);
    this.showMinigameStep(player, onFinish);
  }

  private showMinigameStep(player: Player, onFinish: (success: boolean) => void): void {
    const state = this.activeSessions.get(player.id);
    if (!state || !player.isValid()) return;

    const durabilityStr = "§a" + "■ ".repeat(state.durability) + "§7" + "□ ".repeat(3 - state.durability);

    // Статусы штифтов
    const pinStatusTexts = [];
    for (let i = 0; i < state.totalPins; i++) {
      if (i < state.currentPin) {
        pinStatusTexts.push(`§aШтифт ${i + 1}: [✓ Зафиксирован]`);
      } else if (i === state.currentPin) {
        pinStatusTexts.push(`§eШтифт ${i + 1}: [▶ Подбор положения...]`);
      } else {
        pinStatusTexts.push(`§8Штифт ${i + 1}: [? Заблокирован]`);
      }
    }

    const form = new ActionFormData();
    form.title("§4§lВзлом дверного замка");
    form.body(
      `§7Дом жителя: §f${state.door.ownerName}\n` +
      `§7Прочность отмычки: ${durabilityStr} §8(${state.durability}/3)\n\n` +
      pinStatusTexts.join("\n") + "\n\n" +
      `${state.lastHint || ""}\n` +
      `§6Выберите действие отмычкой:`
    );

    form.button("§e[ ↑ ] Приподнять штифт вверх");
    form.button("§b[ ← ] Сдвинуть цилиндр влево");
    form.button("§6[ → ] Надавить на пружину вглубь");
    form.button("§c[ ✕ ] Отступить (прервать взлом)");

    // Запускаем через tick timeout, чтобы избежать конфликтов Bedrock UI
    system.runTimeout(() => {
      form.show(player).then(response => {
        if (response.canceled || response.selection === 3 || response.selection === undefined) {
          // Игрок закрыл форму или нажал "Отступить"
          this.activeSessions.delete(player.id);
          player.sendMessage("§7Вы аккуратно извлекли отмычку и отступили от двери.");
          return;
        }

        const actionChosen = response.selection;
        const requiredAction = state.pinSolutions[state.currentPin];

        if (actionChosen === requiredAction) {
          // Успех на текущем штифте!
          state.currentPin++;
          player.playSound("random.orb", { pitch: 1.8, volume: 0.8 });

          if (state.currentPin >= state.totalPins) {
            // ВСЕ ШТИФТЫ ВЗЛОМАНЫ!
            this.activeSessions.delete(player.id);
            onFinish(true);
            return;
          }

          state.lastHint = `§a[Щелчок!] Штифт ${state.currentPin} успешно зафиксирован!`;
          this.showMinigameStep(player, onFinish);
        } else {
          // Ошибка: отмычка соскакивает!
          state.durability--;
          player.playSound("random.break", { pitch: 1.0, volume: 0.7 });

          if (state.durability <= 0) {
            // Отмычка сломалась, взлом провален
            this.activeSessions.delete(player.id);
            onFinish(false);
            return;
          }

          state.lastHint = `§c[Срыв!] Отмычка соскочила и упёрлась в паз. Прочность уменьшена!`;
          this.showMinigameStep(player, onFinish);
        }
      }).catch(() => {
        this.activeSessions.delete(player.id);
      });
    }, 2);
  }
}

export const lockpickMinigame = new LockpickMinigame();
