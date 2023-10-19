export type WarriorInfo = {
    link: string;
    name: string;
    icon: string;
    type: string;
    star: number;
    attack: number;
    hp: number;
    critical: number;
    defense: number;
    magicDefense: number;
    description: string;
    costumes: CostumeInfo[];
    blockSkill: BlockSkillInfo;
    passive: PassiveInfo;
    ultWeapon: UltWeaponInfo | null;
};

export type CostumeInfo = {
    name: string;
    icon: string;
    ability: string[];
};

export type BlockSkillInfo = {
    name: string;
    icon: string;
    ability: string;
};

export type PassiveInfo = {
    name: string;
    ability: string;
};

export type UltWeaponInfo = {
    icon: string;
    name: string;
    ability: string;
};
