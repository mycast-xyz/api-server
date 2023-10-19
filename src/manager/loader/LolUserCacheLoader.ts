import { Config } from '../../Config';
import { LolUserCache, LolUserInfo } from '../../models/Lol';
import { Logger } from '../../util/Logger';
import { LolManager } from '../LolManager';
import { Loader, LoaderCallback } from './common/Loader';
import { LolS9UserLoader } from './LolS9UserLoader';

export class LolUserCacheLoader implements Loader<string, LolUserInfo> {
    private static REQUEST_EXPIRE_TIME = 20 * 60 * 1000;

    private mLogger: Logger;
    private mUserCaches: LolUserCache[];

    public constructor() {
        this.mLogger = new Logger('LolUserCacheLoader');
        this.mUserCaches = [];
    }

    public load(userName: string, callback: LoaderCallback<LolUserInfo>): void {
        this.mLogger.v(`Lol User Request: ${userName}`);

        this.removeExpiredCache();

        const userCache = this.findUserCache(userName);
        if (userCache !== null) {
            this.mLogger.v(`Lol User Load (cache) - ${userCache.info.name}`);
            callback(userCache.info);
        } else {
            const loader: Loader<string, LolUserInfo> = new LolS9UserLoader(
                Config.LOL_API_KEY,
                LolManager.getRawChampions()
            );
            loader.load(userName, (userInfo) => {
                if (userInfo === null) {
                    this.mLogger.v(`Lol User Load Failed - ${userName}`);
                    // TODO: callback(null);
                    return;
                }
                this.mLogger.v(`Lol User Load - ${userInfo.name}`);
                this.mUserCaches.push({
                    info: userInfo,
                    regdate: new Date().getTime(),
                });
                callback(userInfo);
            });
        }
    }

    private findUserCache(name: string): LolUserCache | null {
        const result = this.mUserCaches.find((e) => {
            return name.replace(/\s/g, '') === e.info.name.replace(/\s/g, '');
        });
        return !result ? null : result;
    }

    private removeExpiredCache(): void {
        const regdate = new Date().getTime();
        this.mUserCaches = this.mUserCaches.filter(
            (cache) =>
                regdate - cache.regdate < LolUserCacheLoader.REQUEST_EXPIRE_TIME
        );
    }
}
