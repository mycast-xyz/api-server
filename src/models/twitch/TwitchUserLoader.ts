import Axios from 'axios';
import { Logger } from '../../util/Logger';
import { TwitchAccessTokenManager } from './TwitchAccessTokenManager';
import * as TwitchApi from './TwitchApi';

export class TwitchUserLoader {
    private mLogger: Logger;
    private mTokenManager: TwitchAccessTokenManager;
    private mClientId: string;

    public constructor(clientId: string) {
        this.mLogger = new Logger('TwitchUserLoader');
        this.mTokenManager = TwitchAccessTokenManager.getInstance();
        this.mClientId = clientId;
    }

    public async getUser(loginId: string): Promise<TwitchApi.UserDto | null> {
        const users = await this.getUsers([loginId]);
        return users.length > 0 ? users[0] : null;
    }

    public async getUserById(id: string): Promise<TwitchApi.UserDto | null> {
        const users = await this.getUsersByIds([id]);
        return users.length > 0 ? users[0] : null;
    }

    public async getUsersByIds(ids: string[]): Promise<TwitchApi.UserDto[]> {
        const query = ids.map((id) => `id=${id}`).join('&');
        return await this.getUsersByQuery(query);
    }

    public async getUsers(loginIds: string[]): Promise<TwitchApi.UserDto[]> {
        const query = loginIds.map((k) => `login=${k}`).join('&');
        return await this.getUsersByQuery(query);
    }

    private async getUsersByQuery(query: string): Promise<TwitchApi.UserDto[]> {
        const accessToken = this.mTokenManager.getAccessToken();
        if (!accessToken) {
            this.mLogger.e('Invalid accessToken');
            return [];
        }
        const host = 'https://api.twitch.tv/helix/users';
        const url = `${host}?${query}`;
        try {
            const res = await Axios.get(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Client-ID': this.mClientId,
                },
                timeout: 5000,
            });
            const users: TwitchApi.UserDto[] = res.data.data;
            return users;
        } catch (e) {
            this.mLogger.e(`TwitchUtils#loadUser: Request Error: ${e}`);
            return [];
        }
    }
}
