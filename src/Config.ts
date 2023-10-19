import * as dotenv from 'dotenv';

dotenv.config();

export class Config {
    public static readonly DATABASE_NAME: string = process.env.DB_NAME || '';

    public static readonly DATABASE_HOST: string =
        process.env.DB_HOST || 'localhost';

    public static readonly DATABASE_USER: string = process.env.DB_USER || '';

    public static readonly DATABASE_PASSWORD: string =
        process.env.DB_PASSWORD || '';

    public static readonly LOL_API_KEY: string = process.env.RIOT_API_KEY || '';

    public static readonly ROOT_DIR: string = process.env.ROOT_DIR || '.';

    public static readonly RIOT_API_CODE: string =
        process.env.RIOT_API_CODE || '';

    public static readonly SSL_FULL_CHAIN: string =
        process.env.SSL_FULL_CHAIN || '';

    public static readonly SSL_PRIV_KEY_PATH: string =
        process.env.SSL_PRIV_KEY_PATH || '';

    public static readonly SSL_CERT_PATH: string =
        process.env.SSL_CERT_PATH || '';

    public static readonly THUMBNAIL_DIR: string =
        process.env.THUMBNAIL_DIR || '';

    public static readonly TWITCH_CLIENT_KEY: string =
        process.env.TWITCH_CLIENT_KEY || '';

    public static readonly TWITCH_SECRET_KEY: string =
        process.env.TWITCH_SECRET_KEY || '';

    public static readonly IMGUR_CLIENT_ID: string =
        process.env.IMGUR_CLIENT_ID || '';

    public static readonly YOUTUBE_API_KEY: string =
        process.env.YOUTUBE_API_KEY ?? '';
}
