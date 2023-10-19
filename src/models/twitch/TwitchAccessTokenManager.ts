import { Logger } from '../../util/Logger';
import { TwitchAccessTokenLoader } from './TwitchAccessTokenLoader';

export class TwitchAccessTokenManager {
    private static readonly sInstance = new TwitchAccessTokenManager();
    private static readonly TIMER_NONE = -1;

    private readonly mLoader: TwitchAccessTokenLoader;
    private readonly mLogger: Logger;
    private mTimer: number;
    private mCurrentToken: string;

    private constructor() {
        this.mLoader = new TwitchAccessTokenLoader();
        this.mLogger = new Logger('TwitchAccessTokenManager');
        this.mTimer = TwitchAccessTokenManager.TIMER_NONE;
        this.mCurrentToken = '';
    }

    public init(): void {
        if (this.mTimer !== TwitchAccessTokenManager.TIMER_NONE) {
            clearInterval(this.mTimer);
        }
        this.loadAccessToken();
        this.mTimer = setInterval(() => {
            this.loadAccessToken();
        }, 5 * 60 * 1000) as any;
    }

    public getAccessToken(): string {
        return this.mCurrentToken;
    }

    private async loadAccessToken(): Promise<void> {
        const token = await this.mLoader.getAccessToken();
        if (token) {
            this.mCurrentToken = token.access_token;
        } else {
            this.mLogger.e('init: failed to load token');
        }
    }

    public static getInstance(): TwitchAccessTokenManager {
        return this.sInstance;
    }
}
