import * as fs from 'fs';

import * as Cq from '../../models/CrusaderQuest';
import { Logger } from '../../util/Logger';
import { TaskUtils } from '../../util/TaskUtils';
import { BaseLoader } from './BaseLoader';
import { Loader, LoaderCallback } from './common/Loader';
import { CqWarriorLoader } from './CqWarriorLoader';

export class CqWarriorCacheLoader
    implements Loader<{ name: string; star: number }, Cq.WarriorInfo> {
    private static readonly CACHE_FILE = 'cache/cq_warriors.json';

    private static sInstance: CqWarriorCacheLoader | null = null;

    private mLogger: Logger;
    private mWarriors: Cq.WarriorInfo[];

    public static getInstance(): CqWarriorCacheLoader {
        if (this.sInstance === null) {
            this.sInstance = new CqWarriorCacheLoader();
            this.sInstance.init();
        }
        return this.sInstance;
    }

    private constructor() {
        this.mLogger = new Logger('CqWarriorCacheLoader');
        this.mWarriors = [];
    }

    private init() {
        if (fs.existsSync(CqWarriorCacheLoader.CACHE_FILE)) {
            fs.readFile(CqWarriorCacheLoader.CACHE_FILE, (err, data) => {
                const body = data.toString();
                try {
                    this.mWarriors = JSON.parse(body);
                    this.mLogger.v('Cache Load - CQ Warrior: Success');
                } catch (e) {
                    this.mLogger.e('Cache Load - CQ Warrior: Failed');
                }
            });
        } else {
            this.refreshCache();
        }
        this.initScheduler();
    }

    public load(
        input: { name: string; star: number },
        callback: LoaderCallback<Cq.WarriorInfo>
    ): void {
        const star = input.star;
        const name = input.name;

        let filtered = this.mWarriors;
        if (star !== -1) { filtered = filtered.filter((e) => e.star === star); }

        const filter = (s: string) => s.replace(/ /g, '').toLowerCase();
        let warrior = filtered.find((e) => filter(e.name) === filter(name));
        if (warrior) {
            callback(warrior);
            return;
        }
        warrior = filtered.find((e) => {
            return filter(e.name).indexOf(filter(name)) !== -1;
        });
        if (warrior) {
            callback(warrior);
            return;
        }
        callback(null);
    }

    private initScheduler() {
        const scheduledHour = 4;
        TaskUtils.setDailyScheduler(scheduledHour, {
            name: 'CqBot',
            task: () => {
                this.refreshCache();
            },
        });
    }

    private refreshCache() {
        const loader: BaseLoader<
            null,
            Cq.WarriorInfo[]
        > = new CqWarriorLoader();
        loader.load(null, (infos) => {
            if (infos === null) { return; }
            this.mWarriors = infos;
            this.saveWarriorCache();
        });
    }

    private saveWarriorCache() {
        const data = JSON.stringify(this.mWarriors);
        fs.writeFile(CqWarriorCacheLoader.CACHE_FILE, data, (err) => {
            if (err) {
                this.mLogger.e('Warrior Cache Save Failed');
                return;
            }
            this.mLogger.v('Warrior Cache Save Complete');
        });
    }
}
