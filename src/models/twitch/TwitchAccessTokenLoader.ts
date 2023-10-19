import Axios from 'axios';
import * as qs from 'querystring';
import { Config } from '../../Config';
import { Logger } from '../../util/Logger';
import { TwitchAccessToken } from './TwitchToken';

export class TwitchAccessTokenLoader {
    private static readonly HOST = 'https://id.twitch.tv/oauth2/token';

    private mLogger: Logger = new Logger('TwitchAccessTokenLoader');

    public async getAccessToken(): Promise<TwitchAccessToken | null> {
        const query = qs.stringify({
            client_id: Config.TWITCH_CLIENT_KEY,
            client_secret: Config.TWITCH_SECRET_KEY,
            grant_type: 'client_credentials',
            scope: 'user:read:email',
        });
        const url = `${TwitchAccessTokenLoader.HOST}?${query}`;
        try {
            const res = await Axios.post<TwitchAccessToken>(url);
            return res.data;
        } catch (e) {
            this.mLogger.e('getAccessToken: error:', e);
            return null;
        }
    }
}
