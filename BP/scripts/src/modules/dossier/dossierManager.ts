import { GAME_CONFIG } from "../../config";
import { RoleId } from "../roles/types";

export interface DossierRecord {
  playerId: string;
  playerName: string;
  fakeName: string;
  age: number;
  birthYear: number;
  job: string;
  licenses: string[];
  verdict: string;
}

export class DossierManager {
  private dossiers = new Map<string, DossierRecord>();

  /**
   * Сгенерировать досье для игрока при старте игры
   */
  public generateDossier(playerId: string, playerName: string, roleId: RoleId): DossierRecord {
    const names = GAME_CONFIG.dossier.names;
    const jobs = GAME_CONFIG.dossier.jobs;
    const licensesPool = GAME_CONFIG.dossier.licenses;

    const fakeName = names[Math.floor(Math.random() * names.length)];
    const age = roleId === "grandpa" ? Math.floor(Math.random() * 15) + 65 : Math.floor(Math.random() * 40) + 22;
    const currentYear = 1950; // Атмосферный ретро-стиль города
    const birthYear = currentYear - age;
    const job = roleId === "doctor" ? "Врач-терапевт" : jobs[Math.floor(Math.random() * jobs.length)];

    const licenses: string[] = [];
    if (roleId === "grandpa") {
      licenses.push("Лицензия на охоту и ружьё");
    } else {
      const randomLicense = licensesPool[Math.floor(Math.random() * licensesPool.length)];
      if (randomLicense !== "Нет лицензий") {
        licenses.push(randomLicense);
      }
    }

    const verdict = GAME_CONFIG.dossier.verdicts[roleId] || "Выглядит нормально";

    const dossier: DossierRecord = {
      playerId,
      playerName,
      fakeName,
      age,
      birthYear,
      job,
      licenses,
      verdict
    };

    this.dossiers.set(playerId, dossier);
    return dossier;
  }

  public getDossier(playerId: string): DossierRecord | undefined {
    return this.dossiers.get(playerId);
  }

  public clear(): void {
    this.dossiers.clear();
  }
}

export const dossierManager = new DossierManager();
