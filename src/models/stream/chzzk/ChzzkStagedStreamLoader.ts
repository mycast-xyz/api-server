import axios from 'axios';
import { Logger } from '../../../util/Logger';
import { StagedStream } from '../common/StagedStream';

export class ChzzkStagedStreamLoader {
    #logger = new Logger('ChzzkStagedStreamLoader');
    async load(keyId: string): Promise<StagedStream | null> {
        this.#logger.v('load: ', keyId);
        const profile = await this.#getProfile(keyId);
        if (!profile) {
            return null;
        }
        const result: StagedStream = {
            icon: profile.content.profileImageUrl,
            keyId: keyId,
            platform: 'chzzk',
            title: profile.content.nickname,
        };
        return result;
    }

    async #getProfile(channelHash: string): Promise<ChzzkChannelProfile> {
        const { data } = await axios.get<ChzzkChannelProfile>(
            `https://comm-api.game.naver.com/nng_main/v2/user/${channelHash}/profile`
        );
        return data;
    }
}

type ChzzkChannelProfile = {
    code: number;
    content: {
        nickname: string;
        profileImageUrl: string;
        streamingChannel?: ChzzkStreamingChannel;
    };
};

type ChzzkStreamingChannel = {
    channelId: string;
    channelName: string;
    channelImageUrl: string;
};
