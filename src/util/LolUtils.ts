import Axios from 'axios';
import * as querystring from 'querystring';
import { Config } from '../Config';
import { LolManager } from '../manager/LolManager';
import * as LolApi from '../models/LolApi';

export class LolUtils {
    private static readonly LOL_HOST = 'https://kr.api.riotgames.com/lol/';
    private static readonly LOL_STATIC_HOST =
        'http://ddragon.leagueoflegends.com/cdn/';
    private static readonly LOL_CDN = 'http://ddragon.leagueoflegends.com/cdn';
    private static readonly LOL_STATIC_CDN = 'https://cdn.communitydragon.org';

    public static async requestChampions(
        version: string
    ): Promise<LolApi.ChampionListDto> {
        const url = `${this.LOL_CDN}/${version}/data/ko_KR/championFull.json`;
        const opt = { timeout: 5000 };
        const { data } = await Axios.get<LolApi.ChampionListDto>(url, opt);
        return data;
    }

    public static getAbilityIcon(
        version: string,
        championKey: string,
        spell: 'passive' | 'q' | 'w' | 'e' | 'r'
    ) {
        const championUri = `${this.LOL_STATIC_CDN}/${version}/champion`;
        return `${championUri}/${championKey}/ability-icon/${spell}`;
    }

    public static getChampionIcon(version: string, championKey: string) {
        const championUri = `${this.LOL_STATIC_CDN}/${version}/champion`;
        return `${championUri}/${championKey}/sqaure`;
    }

    public static getSplashArt(
        version: string,
        championKey: string,
        skinNo: number
    ) {
        if (version === 'lastest') {
            version = LolManager.getVersion();
        }

        const championUri = `${this.LOL_STATIC_CDN}/${version}/champion`;
        return `${championUri}/${championKey}/splash-art/skin/${skinNo}`;
    }

    public static getChampionApiUri(): string {
        const uri = this.LOL_HOST + 'static-data/v3/champions';
        const query = querystring.stringify({
            locale: 'ko_KR',
            dataById: 'false',
            api_key: Config.LOL_API_KEY,
        });
        const tags = ['image', 'lore', 'passive', 'skins', 'spells', 'tags'];
        const tagQuery = tags.map((e) => '&tags=' + e).join('');
        return uri + '?' + query + tagQuery;
    }

    public static getChampionMasteryApiUri(summonerId: number): string {
        const uri =
            LolUtils.LOL_HOST +
            'champion-mastery/v3/champion-masteries/by-summoner/';
        const query = querystring.stringify({
            api_key: Config.LOL_API_KEY,
        });
        return uri + summonerId + '?' + query;
    }

    public static getMatchApiUri(accountId: number): string {
        const uri = LolUtils.LOL_HOST + 'match/v3/matchlists/by-account/';
        const query = querystring.stringify({
            api_key: Config.LOL_API_KEY,
        });
        return uri + accountId + '?' + query;
    }

    public static getLeagueApiUri(summonerId: number): string {
        const uri = LolUtils.LOL_HOST + 'league/v3/positions/by-summoner/';
        const query = querystring.stringify({
            api_key: Config.LOL_API_KEY,
        });
        return uri + summonerId + '?' + query;
    }

    public static getUserApiUri(name: string): string {
        const uri = LolUtils.LOL_HOST + 'summoner/v3/summoners/by-name/';
        const query = querystring.stringify({
            api_key: Config.LOL_API_KEY,
        });
        return uri + encodeURI(name) + '?' + query;
    }

    public static getIconUri(type: LolIconType, file: string): string {
        return (
            LolUtils.LOL_STATIC_HOST +
            LolManager.getVersion() +
            '/img/' +
            type +
            '/' +
            file
        );
    }

    public static getBackgroundUri(key: string, skinNo: number = 0): string {
        const filename = key + '_' + skinNo + '.jpg';
        return LolUtils.LOL_STATIC_HOST + 'img/champion/splash/' + filename;
    }

    public static getOpggMmrUri(name: string): string {
        const uri = 'http://www.op.gg/summoner/ajax/mmr/summonerName=';
        const encodedName = encodeURI(name);
        return uri + encodedName;
    }

    public static getFowChampionUri(id: number): string {
        return 'http://fow.kr/champs/' + id;
    }

    public static getOpggChampionUri(key: string): string {
        return `https://www.op.gg/champion/${key}`;
    }
}

type LolIconType = 'champion' | 'passive' | 'spell' | 'profileicon';
