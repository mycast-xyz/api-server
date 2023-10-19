import axios from 'axios';
import { StagedStream } from '../common/StagedStream';
import { StagedStreamLoader } from '../loader/StagedStreamLoader';
import { Logger } from '../../../util/Logger';
import cheerio = require('cheerio');

export class YoutubeStagedStreamLoader implements StagedStreamLoader {
    #key: string;
    #logger = new Logger('YoutubeStagedStreamLoader');

    constructor(key: string) {
        this.#key = key;
    }

    async load(keyId: string): Promise<StagedStream | null> {
        const handle = keyId;
        return await this.loadWithHandle(handle);
    }

    async loadWithHandle(handle: string): Promise<StagedStream | null> {
        const { data } = await axios.get<string>(
            `https://www.youtube.com/${handle}/featured`
        );
        const $ = cheerio.load(data);
        const title = $('meta[property="og:title"]').attr('content');
        const thumbRegex = /\"thumbnailUrl\" .*?\"(.*?)\"/;
        const match = thumbRegex.exec(data);
        const thumbnail = match?.[1];
        if (title) {
            return {
                icon: thumbnail ?? '',
                keyId: handle,
                platform: 'youtube',
                title,
            };
        } else {
            return null;
        }
    }
}
