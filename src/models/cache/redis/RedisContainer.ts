import { createClient, RedisClient } from 'redis';
import { CacheContainer } from '../common/CacheContainer';

export class RedisContainer implements CacheContainer<string> {
    private mRedis: RedisClient;

    public constructor() {
        this.mRedis = createClient();
    }

    public setCache(key: string, value: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.mRedis.set(key, value, (err, _) => {
                if (err) {
                    reject();
                    return;
                } else {
                    resolve();
                }
            });
        });
    }

    public getCache(key: string): Promise<string | null> {
        return new Promise<string | null>((resolve, reject) => {
            this.mRedis.get(key, (err, value) => {
                const resultValue = !err && value ? value : null;
                resolve(resultValue);
            });
        });
    }
}
