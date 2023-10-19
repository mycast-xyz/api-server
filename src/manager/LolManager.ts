import * as fs from 'fs';
import { LolVersionFetcher } from '../models/lol/LolVersionFetcher';
import * as LolApi from '../models/LolApi';
import { Logger } from '../util/Logger';
import { LolUtils } from '../util/LolUtils';
import { TaskUtils } from '../util/TaskUtils';

export class LolManager {
    private static CACHE_FILE_CHAMPIONS = 'cache/champions.json';
    private static CACHE_FILE_VERSION = 'cache/version.txt';

    private static mVersion: string = '8.1.1';
    private static mChampions: LolApi.ChampionDto[] = [];

    private static sLogger: Logger = new Logger('LolManager');

    public static init() {
        if (
            fs.existsSync(LolManager.CACHE_FILE_CHAMPIONS) &&
            fs.existsSync(LolManager.CACHE_FILE_VERSION)
        ) {
            fs.readFile(LolManager.CACHE_FILE_CHAMPIONS, (err, data) => {
                const body = data.toString();
                try {
                    this.mChampions = JSON.parse(body);
                    this.sLogger.v('Cache Load - Champion: Success');
                } catch (e) {
                    this.sLogger.e('Cache Load - Champion: Failed');
                }
            });

            fs.readFile(LolManager.CACHE_FILE_VERSION, (err, data) => {
                const body = data.toString();
                this.mVersion = body;
                this.sLogger.v('Cache Load - Version: ' + this.mVersion);
            });
        } else {
            this.sLogger.v('Lol Refresh');
            this.refreshCache();
        }

        this.initScheduler();
    }

    private static initScheduler() {
        const scheduledHour = 3;
        TaskUtils.setDailyScheduler(scheduledHour, {
            name: 'LolBot',
            task: () => {
                this.refreshCache();
            },
        });
    }

    public static getVersion(): string {
        return this.mVersion;
    }

    public static getRawChampions(): LolApi.ChampionDto[] {
        return this.mChampions;
    }

    private static async refreshCache() {
        const version = await new LolVersionFetcher().fetchVersion();
        this.mVersion = version;
        this.saveVersionCache();

        const champions: LolApi.ChampionDto[] = [];
        const championData = await LolUtils.requestChampions(version);
        for (const key in championData.data) {
            const entry = championData.data[key];
            champions.push(entry);
        }
        this.mChampions = champions;
        this.saveChampionCache();
    }

    private static saveVersionCache() {
        fs.writeFile(LolManager.CACHE_FILE_VERSION, this.mVersion, (err) => {
            this.sLogger.v('Version Cache Save Complete - ' + this.mVersion);
        });
    }

    private static saveChampionCache() {
        const data = JSON.stringify(this.mChampions);
        fs.writeFile(LolManager.CACHE_FILE_CHAMPIONS, data, (err) => {
            this.sLogger.v('Champion Cache Save Complete');
        });
    }
}
