import Axios from 'axios';
import { Config } from '../../../Config';
import { Logger } from '../../../util/Logger';
import { TwitchAccessTokenManager } from '../../twitch/TwitchAccessTokenManager';
import { StagedStream } from '../common/StagedStream';

export class TwitchStagedStreamLoader {
    private mLogger: Logger;
    private mTokenManager: TwitchAccessTokenManager;

    public constructor() {
        this.mLogger = new Logger('TwitchStagedStreamLoader');
        this.mTokenManager = TwitchAccessTokenManager.getInstance();
    }

    public async load(keyId: string): Promise<StagedStream | null> {
        const token = this.mTokenManager.getAccessToken();
        if (!token) {
            this.mLogger.e('Invalid accessToken');
            return null;
        }

        const url = `https://api.twitch.tv/helix/users?login=${keyId}`;
        const opt = {
            headers: {
                Authorization: `Bearer ${token}`,
                'Client-ID': Config.TWITCH_CLIENT_KEY,
            },
            timeout: 5000,
        };
        try {
            const res = await Axios.get<UserDto>(url, opt);
            if (!res || res.status !== 200) {
                this.mLogger.e('Network Error', res);
            }
            const data = res.data.data[0];
            if (!data) {
                this.mLogger.e('No user');
                return null;
            }
            const icon = data.profile_image_url;
            const title = data.display_name;
            return { icon, keyId, title, platform: 'twitch' } as StagedStream;
        } catch (e) {
            this.mLogger.e(`error ${e}`);
            return null;
        }
    }
}

type UserDto = {
    data: Array<{
        id: string;
        login: string;
        display_name: string;
        profile_image_url: string;
        offline_image_url: string;
        view_count: number;
    }>;
};
