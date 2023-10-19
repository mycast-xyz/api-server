import axios from 'axios';
import * as https from 'https';
import * as cheerio from 'cheerio';

import { VoiceActor } from '../../../models/VoiceActor';
import { Logger } from '../../../util/Logger';
import { AsyncLoader } from '../common/AsyncLoader';
import { LoaderCallback } from '../common/Loader';

export class OnnadaCvLoader implements AsyncLoader<string, VoiceActor> {
    private readonly mLogger: Logger;

    public constructor() {
        this.mLogger = new Logger('OnnadaCvLoader');
    }

    public load(input: string, callback: LoaderCallback<VoiceActor>): void {
        this.getResult(input).then((result) => {
            callback(result);
        });
    }

    public async getResult(input: string): Promise<VoiceActor | null> {
        if (input === null) {
            this.mLogger.w('Input is empty');
            return null;
        }
        const query = `q=${encodeURI(input)}`;
        const url = `http://staff.onnada.com/cv_search.php?${query}`;

        try {
            const res = await axios.get(url, {
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false,
                }),
            });
            const body = res.data;

            const $ = cheerio.load(body, {
                ignoreWhitespace: true,
                lowerCaseAttributeNames: true,
                lowerCaseTags: true,
                normalizeWhitespace: true,
            });

            const $data = $('.layout-line tr.array').eq(0);

            if ($data.length === 0) {
                this.mLogger.w(`empty result(input: ${input})`);
                return null;
            }

            const name = $data.find('a').eq(0).text();
            const link = $data.find('a').eq(0).attr('href') || '';
            const characters = $data
                .find('.character_list a')
                .toArray()
                .filter((_, i) => i < 10)
                .map((e) => {
                    const $info = $(e);
                    const $img = $info.find('img');

                    const icon = $img.attr('src') || '';
                    const description = $info.attr('title') || '';

                    return { description, icon };
                });
            const actor = { name, link, characters };
            return actor;
        } catch (e) {
            this.mLogger.e(`Unknown Error(${e}`);
            return null;
        }
    }
}
