export type RoleId = 
  | "mafia_boss" 
  | "mafia_goon" 
  | "doctor" 
  | "investigator" 
  | "grandpa" 
  | "citizen";

export type RoleTeam = "mafia" | "civilian";

export interface RoleInfo {
  id: RoleId;
  name: string;
  team: RoleTeam;
  description: string;
  colorTag: string;
}

export const ROLE_DEFINITIONS: Record<RoleId, RoleInfo> = {
  mafia_boss: {
    id: "mafia_boss",
    name: "Глава Мафии",
    team: "mafia",
    description: "Знает всех членов мафии. Выбирает ночную жертву. Имеет отмычку.",
    colorTag: "§4"
  },
  mafia_goon: {
    id: "mafia_goon",
    name: "Шестёрка",
    team: "mafia",
    description: "Помогает Главе. Днём может саботировать свет в 1 доме. Имеет отмычку.",
    colorTag: "§c"
  },
  doctor: {
    id: "doctor",
    name: "Доктор",
    team: "civilian",
    description: "Ночью защищает 1 игрока от нападения мафии.",
    colorTag: "§a"
  },
  investigator: {
    id: "investigator",
    name: "Следователь",
    team: "civilian",
    description: "Осматривает трупы и место преступления, а также проверяет досье игроков.",
    colorTag: "§b"
  },
  grandpa: {
    id: "grandpa",
    name: "Дед",
    team: "civilian",
    description: "Ночью может выйти на патруль со своим ружьём. Замедлен ночью.",
    colorTag: "§e"
  },
  citizen: {
    id: "citizen",
    name: "Горожанин",
    team: "civilian",
    description: "Мирный житель. Днём участвует в расследовании и голосовании.",
    colorTag: "§f"
  }
};
