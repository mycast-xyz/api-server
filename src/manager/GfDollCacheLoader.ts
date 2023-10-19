import * as fs from 'fs';
import { DollInfo } from '../models/GirlsFrontline';
import { Logger } from '../util/Logger';
import { TaskUtils } from '../util/TaskUtils';
import { BaseLoader } from './loader/BaseLoader';
import { BaseAsyncLoader } from './loader/common/BaseAsyncLoader';
import { GirlsFrontlineLoader } from './loader/GirlsFrontlineLoader';

export class GfDollCacheLoader extends BaseAsyncLoader<string, DollInfo> {
    private static readonly CACHE_FILE = 'cache/gf_dolls.json';

    private static sInstance: GfDollCacheLoader | null = null;

    private mLogger: Logger;
    private mDollCaches: DollInfo[];

    public static getInstance(): GfDollCacheLoader {
        if (this.sInstance === null) {
            this.sInstance = new GfDollCacheLoader();
            this.sInstance.init();
        }
        return this.sInstance;
    }

    public constructor() {
        super();
        this.mLogger = new Logger('GfDollCacheLoader');
        this.mDollCaches = [];
    }

    public async getResult(keyword: string): Promise<DollInfo | null> {
        const filter = (s: string) => s.replace(/[\s+-]/g, '').toLowerCase();
        const key = filter(keyword);

        // Success1. equal to name
        let doll = this.mDollCaches.find((e) => filter(e.name) === key);
        if (doll) {
            return doll;
        }

        // Success2. include in name
        doll = this.mDollCaches.find((e) => filter(e.name).includes(key));
        if (doll) {
            return doll;
        }

        // Success3. include in keyword
        doll = this.mDollCaches.find((e) => filter(e.keyword).includes(key));
        if (doll) {
            return doll;
        }

        // failed
        return null;
    }

    private init() {
        if (fs.existsSync(GfDollCacheLoader.CACHE_FILE)) {
            fs.readFile(GfDollCacheLoader.CACHE_FILE, (err, data) => {
                const body = data.toString();
                try {
                    this.mDollCaches = JSON.parse(body);
                    this.mLogger.v('Cache Load - GF Doll: Success');
                } catch (e) {
                    this.mLogger.e('Cache Load - GF Doll: Failed');
                }
            });
        } else {
            this.refreshCache();
        }
        this.initScheduler();
    }

    private initScheduler() {
        const scheduledHour = 5;
        TaskUtils.setDailyScheduler(scheduledHour, {
            name: 'GfDollBot',
            task: () => {
                this.refreshCache();
            },
        });
    }

    private refreshCache() {
        const loader: BaseLoader<null, DollInfo[]> = new GirlsFrontlineLoader();
        loader.load(null, (infos) => {
            if (infos === null) {
                return;
            }
            this.mDollCaches = infos;
            this.saveCache();
        });
    }

    private saveCache() {
        const data = JSON.stringify(this.mDollCaches);
        fs.writeFile(GfDollCacheLoader.CACHE_FILE, data, (err) => {
            if (err) {
                this.mLogger.e('GF Dolls Cache Save Failed');
                return;
            }
            this.mLogger.v('GF Dolls Cache Save Complete');
        });
    }
}
