import { GAME_CONFIG, WeaponDef } from "../../config";
import { Vector3 } from "@minecraft/server";

export interface CrimeScene {
  id: string;
  victimId: string;
  victimName: string;
  position: Vector3;
  dimensionId: string;
  weapon: WeaponDef;
  casingClue?: string; // Например "214.???" или "214.891"
  casingFound: boolean;
  timestamp: number;
}

export interface CorpseData {
  id: string;
  victimId: string;
  victimName: string;
  currentPosition: Vector3;
  dimensionId: string;
  weapon: WeaponDef;
  hasFingerprints: boolean;
  crimeSceneId: string;
  carrierId?: string; // ID игрока, который сейчас несёт труп в перчатках
}

export class CrimeManager {
  private crimeScenes = new Map<string, CrimeScene>();
  private corpses = new Map<string, CorpseData>();
  
  // История убийств для отслеживания серий и повторов оружия
  private consecutiveKillCount = 0;
  private lastUsedWeaponId: string | null = null;
  private weaponUsageCount = new Map<string, number>();

  /**
   * Выбор оружия для убийства по правилам ТЗ
   */
  public selectWeaponForKill(): { weapon: WeaponDef; guaranteedFingerprints: boolean } {
    // Проверка правила серии: 2 убийства граждан подряд -> 100% нож и гарантированные отпечатки
    if (this.consecutiveKillCount >= GAME_CONFIG.weapons.serialKillsForGuaranteedKnife) {
      const knife = GAME_CONFIG.weapons.pool.find(w => w.id === "knife")!;
      return { weapon: knife, guaranteedFingerprints: true };
    }

    // Случайный выбор по весам
    const pool = GAME_CONFIG.weapons.pool;
    const totalWeight = pool.reduce((sum, w) => sum + w.weight, 0);
    let rand = Math.random() * totalWeight;

    let chosen = pool[0];
    for (const w of pool) {
      if (rand < w.weight) {
        chosen = w;
        break;
      }
      rand -= w.weight;
    }

    return { weapon: chosen, guaranteedFingerprints: false };
  }

  /**
   * Регистрация убийства
   */
  public registerKill(
    victimId: string, 
    victimName: string, 
    position: Vector3, 
    dimensionId: string
  ): { crimeScene: CrimeScene; corpse: CorpseData } {
    const { weapon, guaranteedFingerprints } = this.selectWeaponForKill();
    
    // Обновляем счётчик использования этого оружия
    const prevUsage = this.weaponUsageCount.get(weapon.id) || 0;
    const currentUsage = prevUsage + 1;
    this.weaponUsageCount.set(weapon.id, currentUsage);

    // Правила улик
    let hasFingerprints = guaranteedFingerprints;
    if (weapon.id === "knife") {
      if (this.lastUsedWeaponId === "knife") {
        hasFingerprints = true; // Нож 2 раза подряд
      }
    }

    // Гильза для револьвера
    let casingClue: string | undefined = undefined;
    if (weapon.modelNumber) {
      if (currentUsage >= 2) {
        // Второй раз использован этот же револьвер -> полный номер
        const fullSerial = Math.floor(100 + Math.random() * 900);
        casingClue = `${weapon.modelNumber}.${fullSerial}`;
      } else {
        // Первый раз -> частичный номер
        casingClue = `${weapon.modelNumber}.???`;
      }
    }

    const crimeSceneId = `crime_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const crimeScene: CrimeScene = {
      id: crimeSceneId,
      victimId,
      victimName,
      position: { x: position.x, y: position.y, z: position.z },
      dimensionId,
      weapon,
      casingClue,
      casingFound: false,
      timestamp: Date.now()
    };
    this.crimeScenes.set(crimeSceneId, crimeScene);

    const corpseId = `corpse_${victimId}`;
    const corpse: CorpseData = {
      id: corpseId,
      victimId,
      victimName,
      currentPosition: { x: position.x, y: position.y, z: position.z },
      dimensionId,
      weapon,
      hasFingerprints,
      crimeSceneId
    };
    this.corpses.set(corpseId, corpse);

    // Обновление состояния серии
    if (guaranteedFingerprints) {
      // Серия реализована, сбрасываем счётчик
      this.consecutiveKillCount = 0;
    } else {
      this.consecutiveKillCount++;
    }
    this.lastUsedWeaponId = weapon.id;

    return { crimeScene, corpse };
  }

  /**
   * Сброс серии (при ночи без убийств или спасении Доктором)
   */
  public resetKillStreak(): void {
    this.consecutiveKillCount = 0;
    this.lastUsedWeaponId = null;
  }

  public getCrimeScene(id: string): CrimeScene | undefined {
    return this.crimeScenes.get(id);
  }

  public getCorpse(id: string): CorpseData | undefined {
    return this.corpses.get(id);
  }

  public getCorpseByVictim(victimId: string): CorpseData | undefined {
    return this.corpses.get(`corpse_${victimId}`);
  }

  public getAllCorpses(): CorpseData[] {
    return Array.from(this.corpses.values());
  }

  public getAllCrimeScenes(): CrimeScene[] {
    return Array.from(this.crimeScenes.values());
  }

  public clear(): void {
    this.crimeScenes.clear();
    this.corpses.clear();
    this.consecutiveKillCount = 0;
    this.lastUsedWeaponId = null;
    this.weaponUsageCount.clear();
  }
}

export const crimeManager = new CrimeManager();
