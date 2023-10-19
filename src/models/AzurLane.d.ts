export type ShipInfo = {
    link: string;
    icon: string;
    codeName: string;
    name: string;
    type: TypeInfo;
    sprite: string;
    buildTime: string;
    skins: SkinInfo[];
    rarity: Rarity;
    star: number;
    cv: string;
};

export type Rarity = 'N' | 'R' | 'SR' | 'SSR';

export type TypeInfo = {
    name: string;
    icon: string;
};

export type SkinInfo = {
    name: string;
    sprite: string;
};
