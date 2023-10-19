export type LolUserCache = {
    info: LolUserInfo;
    regdate: number;
};

export type LolUserInfo = {
    name: string;
    id: string;
    level: number;
    icon: string;
    most: {
        top: LolChampionImage[];
        rank: LolChampionImage[];
    };
    tier: {
        tier: string;
        division: string;
        point: number;
    };
    mmr: {
        fow: number;
        opgg: number;
    };
};

export type LolChampionImage = {
    name: string;
    icon: string;
    background: string;
};

export type LolLane = 'TOP' | 'JUNGLE' | 'MID' | 'BOTTOM' | 'NONE';

type LolSkin = {
    name: string;
    splash: string;
};

type LolSkill = {
    name: string;
    description: string;
    icon: string;
};

export type LolChampion = {
    link: string;
    key: string;
    name: string;
    icon: string;
    description: string;
    tags: string[];
    lore: string;
    skin: LolSkin[];
    skill: LolSkill[];
    version: string;
};
