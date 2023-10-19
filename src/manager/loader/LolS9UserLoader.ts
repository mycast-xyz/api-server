import Axios from 'axios';
import { LolChampionImage, LolUserInfo } from '../../models/Lol';
import { ChampionDto } from '../../models/LolApi';
import { Logger } from '../../util/Logger';
import { Loader, LoaderCallback } from './common/Loader';

export class LolS9UserLoader implements Loader<string, LolUserInfo> {
    private static HOST: string = 'https://kr.api.riotgames.com/lol';
    private static SPRITE_HOST: string =
        'http://ddragon.leagueoflegends.com/cdn';

    private mLogger: Logger;
    private mApiKey: string;
    private mChampionCaches: ChampionDto[];

    public constructor(apiKey: string, championCaches: ChampionDto[]) {
        this.mLogger = new Logger('LolS9UserLoader');
        this.mApiKey = apiKey;
        this.mChampionCaches = championCaches;
    }

    public load(input: string, callback: LoaderCallback<LolUserInfo>): void {
        const summonerName = input;

        this.getInfo(summonerName).then((info) => {
            if (info === null) {
                callback(null);
            } else {
                callback(info);
            }
        });
    }

    private async getVersion(): Promise<string> {
        const url = 'https://ddragon.leagueoflegends.com/api/versions.json';
        const opt = { timeout: 5000 };
        const { data } = await Axios.get<string[]>(url, opt);
        const latest = data[0];
        return latest;
    }

    private async getInfo(name: string): Promise<LolUserInfo | null> {
        const UNRANK = { tier: 'UNRANK', division: 'I', point: 0 };
        try {
            const version = await this.getVersion();
            const summoner = await this.getUser(name);
            const profileIconId = summoner.profileIconId;
            const icon = LolS9UserLoader.getProfileIconUri(
                version,
                profileIconId
            );
            const rank = await this.getTopRank(summoner.id);
            const tier =
                rank === null
                    ? UNRANK
                    : {
                          division: rank.rank,
                          point: rank.leaguePoints,
                          tier: rank.tier,
                      };
            const masteries = await this.getChampionMasteries(summoner.id);

            const top: LolChampionImage[] = [];
            masteries
                .sort((a, b) => b.championPoints - a.championPoints)
                .filter((_, i) => i < 5)
                .forEach((mastery) => {
                    const champ = this.mChampionCaches.find(
                        // tslint:disable-next-line: radix
                        (c) => mastery.championId === parseInt(c.key)
                    );
                    if (!champ) {
                        return;
                    } else {
                        top.push({
                            background: LolS9UserLoader.getSplashArt(
                                version,
                                champ.id,
                                0
                            ),
                            icon: LolS9UserLoader.getChampionIconUri(
                                version,
                                champ.id
                            ),
                            name: champ.name,
                        });
                    }
                });
            return {
                icon,
                id: summoner.id,
                level: summoner.summonerLevel,
                mmr: {
                    fow: 1111,
                    opgg: 1111,
                },
                most: {
                    rank: [],
                    top,
                },
                name: summoner.name,
                tier,
            };
        } catch (e) {
            this.mLogger.e(e);
            return null;
        }
    }

    private async getUser(summonerName: string): Promise<SummonerDto> {
        const normalizedName = encodeURIComponent(summonerName);
        return await this.requestPath(
            `summoner/v4/summoners/by-name/${normalizedName}`
        );
    }

    private async getTopRank(
        summonerId: string
    ): Promise<LeaguePositionDto | null> {
        const ranks = await this.getAllRanks(summonerId);
        if (ranks === null) {
            this.mLogger.v('rank has not found');
            return null;
        }
        const lolRanks = ranks
            .filter((rank) => rank.queueType !== 'RANKED_TFT')
            .sort((a, b) => (a.queueType === 'RANKED_SOLO_5x5' ? -1 : 1));

        return lolRanks.length > 0 ? lolRanks[0] : null;
    }

    private async getAllRanks(
        summonerId: string
    ): Promise<LeaguePositionDto[] | null> {
        return await this.requestPath(
            `league/v4/entries/by-summoner/${summonerId}`
        );
    }

    private async getChampionMasteries(
        summonerId: string
    ): Promise<ChampionMasteryDto[]> {
        return await this.requestPath(
            `champion-mastery/v4/champion-masteries/by-summoner/${summonerId}`
        );
    }

    private async requestPath(path: string): Promise<any> {
        const url = `${LolS9UserLoader.HOST}/${path}`;
        const { data } = await Axios.get(url, {
            headers: { 'X-Riot-Token': this.mApiKey },
            timeout: 5000,
        });
        return data;
    }

    private static getProfileIconUri(
        version: string,
        profileIconId: number
    ): string {
        const path = `${this.SPRITE_HOST}/${version}/img/profileicon`;
        return `${path}/${profileIconId}.png`;
    }

    private static getChampionIconUri(
        version: string,
        championKey: string
    ): string {
        return `${this.SPRITE_HOST}/${version}/img/champion/${championKey}.png`;
    }

    private static getSplashArt(
        version: string,
        championKey: string,
        skinNo: number
    ) {
        const championUri = `https://cdn.communitydragon.org/${version}/champion`;
        return `${championUri}/${championKey}/splash-art/skin/${skinNo}`;
    }
}

type SummonerDto = {
    profileIconId: number;
    name: string;
    puuid: string;
    summonerLevel: number;
    revisionDate: number;
    id: string;
    accountId: string;
};

type LeaguePositionDto = {
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

type MiniSeriesDto = {
    wins: number;
    losses: number;
    target: number;
    progress: string;
};

type ChampionMasteryDto = {
    chestGranted: boolean;
    championLevel: number;
    championPoints: number;
    championId: number;
    playerId: number;
    championPointsUntilNextLevel: number;
    tokensEarned: number;
    championPointsSinceLastLevel: number;
    lastPlayTime: number;
};
