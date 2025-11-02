import axios from 'axios';

export class ChzzkLoader {
    async getProfile(channelHash: string): Promise<ChzzkChannelProfile> {
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
