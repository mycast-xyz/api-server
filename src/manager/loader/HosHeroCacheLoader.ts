import * as fs from 'fs';

import { HeroInfo } from '../../models/HeroesOfStorm';
import { Logger } from '../../util/Logger';
import { TaskUtils } from '../../util/TaskUtils';
import { BaseLoader } from './BaseLoader';
import { Loader, LoaderCallback } from './common/Loader';
import { HosHeroLoader } from './HosHeroLoader';

export class HosHeroCacheLoader implements Loader<string, HeroInfo> {
    private static readonly CACHE_FILE = 'cache/hos-heroes.json';

    private static sInstance: HosHeroCacheLoader | null = null;

    private mLogger: Logger;
    private mHeroCaches: HeroInfo[];

    public static getInstance(): HosHeroCacheLoader {
        if (this.sInstance === null) {
            this.sInstance = new HosHeroCacheLoader();
            this.sInstance.init();
        }
        return this.sInstance;
    }

    private constructor() {
        this.mLogger = new Logger('HosHeroCacheLoader');
        this.mHeroCaches = [];
    }

    private init() {
        if (fs.existsSync(HosHeroCacheLoader.CACHE_FILE)) {
            fs.readFile(HosHeroCacheLoader.CACHE_FILE, (err, data) => {
                const body = data.toString();
                try {
                    this.mHeroCaches = JSON.parse(body);
                    this.mLogger.v('Cache Load - HOS Hero: Success');
                } catch (e) {
                    this.mLogger.w('Cache Load - HOS Hero: Failed');
                }
            });
        } else {
            this.refreshCache();
        }
        this.initScheduler();
    }

    public load(name: string, callback: LoaderCallback<HeroInfo>): void {
        const filter = (s: string) => s.replace(/\s/g, '').toLowerCase();
        let hero = this.mHeroCaches.find(
            (e) => filter(e.name) === filter(name)
        );
        if (hero) {
            callback(hero);
            return;
        }
        hero = this.mHeroCaches.find((e) =>
            filter(e.name).includes(filter(name))
        );
        if (hero) {
            callback(hero);
            return;
        }
        callback(null);
    }

    private initScheduler() {
        const scheduledHour = 4;
        TaskUtils.setDailyScheduler(scheduledHour, {
            name: 'HosHeroBot',
            task: () => {
                this.refreshCache();
            },
        });
    }

    private refreshCache() {
        const loader: BaseLoader<null, HeroInfo[]> = new HosHeroLoader();
        loader.load(null, (infos) => {
            if (infos === null) { return; }
            this.mHeroCaches = infos;
            this.saveCache();
        });
    }

    private saveCache() {
        const data = JSON.stringify(this.mHeroCaches);
        fs.writeFile(HosHeroCacheLoader.CACHE_FILE, data, (err) => {
            if (err) {
                this.mLogger.e('HOS Hero Cache Save Failed');
                return;
            }
            this.mLogger.v('HOS Hero Cache Save Complete');
        });
    }
}
