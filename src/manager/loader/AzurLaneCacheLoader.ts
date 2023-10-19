import * as fs from 'fs';

import * as AzurLane from '../../models/AzurLane';
import { Logger } from '../../util/Logger';
import { TaskUtils } from '../../util/TaskUtils';
import { AzurLaneLoader } from './AzurLaneLoader';
import { BaseLoader } from './BaseLoader';
import { Loader, LoaderCallback } from './common/Loader';

export class AzurLaneCacheLoader implements Loader<string, AzurLane.ShipInfo> {
    private static readonly CACHE_FILE = 'cache/al_ship.json';

    private static sInstance: AzurLaneCacheLoader | null = null;

    private mLogger: Logger;
    private mShipCaches: AzurLane.ShipInfo[];

    public static getInstance(): AzurLaneCacheLoader {
        if (this.sInstance === null) {
            this.sInstance = new AzurLaneCacheLoader();
            this.sInstance.init();
        }
        return this.sInstance;
    }

    private constructor() {
        this.mLogger = new Logger('AzurLaneCacheLoader');
        this.mShipCaches = [];
    }

    private init() {
        if (fs.existsSync(AzurLaneCacheLoader.CACHE_FILE)) {
            fs.readFile(AzurLaneCacheLoader.CACHE_FILE, (err, data) => {
                const body = data.toString();
                try {
                    this.mShipCaches = JSON.parse(body);
                    this.mLogger.v('Cache Load - AL Ship: Success');
                } catch (e) {
                    this.mLogger.e('Cache Load - AL Ship: Failed');
                }
            });
        } else {
            this.refreshCache();
        }
        this.initScheduler();
    }

    public load(
        name: string,
        callback: LoaderCallback<AzurLane.ShipInfo>
    ): void {
        const filter = (s: string) => s.replace(/ /g, '').toLowerCase();
        const ship = this.mShipCaches.find(
            (e) => filter(e.name) === filter(name)
        );
        if (ship) {
            callback(ship);
            return;
        }
        const shipLike = this.mShipCaches.find(
            (e) => filter(e.name).indexOf(filter(name)) !== -1
        );
        if (shipLike) {
            callback(shipLike);
            return;
        }
        callback(null);
    }

    public getShipInfo(name: string): AzurLane.ShipInfo | null {
        const filter = (s: string) => s.replace(/ /g, '').toLowerCase();
        let ship = this.mShipCaches.find(
            (e) => filter(e.name) === filter(name)
        );
        if (ship) { return ship; }
        ship = this.mShipCaches.find((e) => {
            return filter(e.name).indexOf(filter(name)) !== -1;
        });
        if (ship) { return ship; }
        return null;
    }

    private initScheduler() {
        const scheduledHour = 2;
        TaskUtils.setDailyScheduler(scheduledHour, {
            name: 'AzurLaneBot',
            task: () => {
                this.refreshCache();
            },
        });
    }

    private refreshCache() {
        const loader: BaseLoader<
            null,
            AzurLane.ShipInfo[]
        > = new AzurLaneLoader();
        loader.load(null, (infos) => {
            if (infos === null) { return; }
            this.mShipCaches = infos;
            this.saveShipCache();
        });
    }

    private saveShipCache() {
        const data = JSON.stringify(this.mShipCaches);
        fs.writeFile(AzurLaneCacheLoader.CACHE_FILE, data, (err) => {
            if (err) {
                this.mLogger.e('AL Ship Cache Save Failed');
                return;
            }
            this.mLogger.v('AL Ship Cache Save Complete');
        });
    }
}
