export interface CacheContainer<T> {
    setCache(key: string, value: T): Promise<void>;

    getCache(key: string): Promise<T | null>;
}
