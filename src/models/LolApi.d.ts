import { LolLane } from './Lol';

interface StringMap {
    [key: string]: string;
}

interface ChampionDtoMap {
    [key: string]: ChampionDto;
}

export type ChampionListDto = {
    keys: StringMap;
    data: ChampionDtoMap;
    version: string;
    type: string;
    format: string;
};

export type ChampionDto = {
    info: InfoDto;
    enemytips: string[];
    stats: StatsDto;
    name: string;
    title: string;
    image: ImageDto;
    tags: string[];
    partype: string;
    skins: SkinDto[];
    passive: PassiveDto;
    recommended: RecommendedDto[];
    allytips: string[];
    key: string;
    lore: string;
    id: string;
    blurb: string;
    spells: ChampionSpellDto[];
};

export type InfoDto = {
    difficulty: number;
    attack: number;
    defense: number;
    magic: number;
};

export type StatsDto = {
    armorperlevel: number;
    hpperlevel: number;
    attackdamage: number;
    mpperlevel: number;
    attackspeedoffset: number;
    armor: number;
    hp: number;
    hpregenperlevel: number;
    spellblock: number;
    attackrange: number;
    movespeed: number;
    attackdamageperlevel: number;
    mpregenperlevel: number;
    mp: number;
    spellblockperlevel: number;
    crit: number;
    mpregen: number;
    attackspeedperlevel: number;
    hpregen: number;
    critperlevel: number;
};

export type ImageDto = {
    full: string;
    group: string;
    sprite: string;
    h: number;
    w: number;
    y: number;
    x: number;
};

export type SkinDto = {
    num: number;
    name: string;
    id: number;
};

export type PassiveDto = {
    image: ImageDto;
    sanitizedDescription: string;
    name: string;
    description: string;
};

export type ChampionSpellDto = {
    cooldownBurn: string;
    resource: string;
    leveltip: LevelTipDto;
    vars: SpellVarsDto[];
    costType: string;
    image: ImageDto;
    sanitizedDescription: string;
    sanitizedTooltip: string;
    // This field is a List of List of Double.
    effect: Array<null | number[]>;
    tooltip: string;
    maxrank: number;
    costBurn: string;
    rangeBurn: string;
    // This field is either a List of Integer or the String 'self' for spells that target one's own champion.
    range: 'self' | number[];
    cooldown: number[];
    cost: number[];
    key: string;
    description: string;
    effectBurn: string[];
    altimages: ImageDto[];
    name: string;
};

export type RecommendedDto = {
    map: string;
    blocks: BlockDto[];
    champion: string;
    title: string;
    priority: boolean;
    mode: string;
    type: string;
};

export type BlockDto = {
    items: BlockItemDto[];
    recMath: boolean;
    type: string;
};

export type BlockItemDto = {
    count: number;
    id: number;
};

export type SpellVarsDto = {
    ranksWith: string;
    dyn: string;
    link: string;
    coeff: number[];
    key: string;
};

export type LevelTipDto = {
    effect: string[];
    label: string[];
};

export type VersionListDto = string[];

export type SummonerDto = {
    profileIconId: number;
    name: string;
    summonerLevel: number;
    revisionDate: number;
    id: number;
    accountId: number;
};

export type LeaguePositionDto = {
    rank: string;
    queueType: string;
    hotStreak: boolean;
    miniSeries: MiniSeriesDto;
    wins: number;
    veteran: boolean;
    losses: number;
    freshBlood: boolean;
    leagueId: string;
    playerOrTeamName: string;
    inactive: boolean;
    playerOrTeamId: string;
    leagueName: string;
    tier: string;
    leaguePoints: number;
};

export type MiniSeriesDto = {
    wins: number;
    losses: number;
    target: number;
    progress: string;
};

export type ChampionMasteryDto = {
    // Is chest granted for this champion or not in current season.
    chestGranted: boolean;
    // Champion level for specified player and champion combination.
    championLevel: number;
    // Total number of champion points for this player and champion combination
    // - they are used to determine championLevel.
    championPoints: number;
    // Champion ID for this entry.
    championId: number;
    // Player ID for this entry.
    playerId: number;
    // Number of points needed to achieve next level. Zero if player reached maximum champion level for this champion.
    championPointsUntilNextLevel: number;
    // The token earned for this champion to levelup.
    tokensEarned: number;
    // Number of points earned since current level has been achieved.
    championPointsSinceLastLevel: number;
    // Last time this champion was played by this player - in Unix milliseconds time format.
    lastPlayTime: number;
};

export type MatchListDto = {
    matches: MatchReferenceDto[];
    totalGames: number;
    startIndex: number;
    endIndex: number;
};

export type MatchReferenceDto = {
    lane: LolLane;
    gameId: number;
    champion: number;
    platformId: string;
    season: number;
    queue: number;
    role: string;
    timestamp: number;
};
