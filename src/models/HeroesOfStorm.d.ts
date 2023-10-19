export type HeroInfo = {
    keyId: string;
    name: string;
    title: string;
    franchise: string;
    url: string;
    description: string;
    baseInfos: BaseInfo[];
};

export type BaseInfo = {
    stanceId?: string;
    stance?: string;
    skins: SkinInfo[];
    skills: SkillInfo[];
    ults: SkillInfo[];
    passive: SkillInfo;
};

export type SkinInfo = {
    keyId: string;
    name: string;
    description: string;
    icon: string;
    imageUrl: string;
    videoUrl: string;
};

export type SkillInfo = {
    keyId: string;
    name: string;
    icon: string;
    description: string;
    thumbnail?: string;
};

export type RawHeroInfo = {
    id: string;
    name: string;
    title: string;
    description: string;
    shortDescription: string;
    baseHeroInfo: {
        name: string;
        title: string;
        description: string;
        shortDescription: string;
        slug: string;
        role: { name: string; slug: string; description: string };
        skins: Array<{
            name: string;
            description: string;
            id: string;
            slug: string;
        }>;
        type: {};
        trait: {
            name: string;
            description: string;
            id: string;
            slug: string;
        };
        defaultMount: {};
        abilities: any[];
        heroicAbilities: any[];
        multiclassRoles: any[];
        otherAbilities: any[];
        pairedHeroes: any[];
    };
    role: {
        name: string;
        slug: string;
        description: string;
    };
    roleSecondary: {};
    type: { name: string; slug: string };
    multiclassRoles: any[];
    pairedHeroes: any[];
    slug: string;
    franchise: string;
    stanceSlug: string;
    difficulty: string;
    stats: {
        damage: number;
        utility: number;
        survivability: number;
        complexity: number;
    };
    skins: Array<{
        name: string;
        description: string;
        id: string;
        analyticsName: string;
        slug: string;
    }>;
    releaseDate: { year: number; month: number; day: number };
    alternateHeroInfo: any[];
    auxiliaryHeroInfo: any[];
    heroStanceName: string;
    analyticsName: string;
    revealed: boolean;
    video: string;
    inFreeHeroRotation: boolean;
    freeRotationMinLevel: 0;
    unified: boolean;
};
