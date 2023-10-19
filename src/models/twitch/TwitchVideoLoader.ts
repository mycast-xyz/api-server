import Axios from 'axios';
import { Logger } from '../../util/Logger';
import { TwitchAccessTokenManager } from './TwitchAccessTokenManager';
import * as TwitchApi from './TwitchApi';

export class TwitchVideoLoader {
    private mLogger: Logger;
    private mTokenManager: TwitchAccessTokenManager;
    private mClientId: string;

    public constructor(clientId: string) {
        this.mLogger = new Logger('TwitchVideoLoader');
        this.mTokenManager = TwitchAccessTokenManager.getInstance();
        this.mClientId = clientId;
    }

    public async getVideo(videoId: string): Promise<TwitchApi.VideoDto | null> {
        const videos = await this.getVideos(videoId);
        return videos.length > 0 ? videos[0] : null;
    }

    public async getVideos(videoId: string): Promise<TwitchApi.VideoDto[]> {
        const accessToken = this.mTokenManager.getAccessToken();
        if (!accessToken) {
            this.mLogger.e('Invalid accessToken');
            return [];
        }

        const host = 'https://api.twitch.tv/helix/videos';
        const url = `${host}?id=${videoId}`;
        try {
            const res = await Axios.get(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Client-ID': this.mClientId,
                },
                timeout: 5000,
            });
            const videos: TwitchApi.VideoDto[] = res.data.data;
            return videos;
        } catch (e) {
            this.mLogger.e('loadVideo: request error:', e);
            return [];
        }
    }
}
