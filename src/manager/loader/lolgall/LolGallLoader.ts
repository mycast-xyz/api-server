import Axios from 'axios';
import * as cheerio from 'cheerio';
import { LolGall } from '../../../models/LolGall';
import { Logger } from '../../../util/Logger';
import { BaseAsyncLoader } from '../common/BaseAsyncLoader';

export class LolGallLoader extends BaseAsyncLoader<null, LolGall[]> {
    private mLogger: Logger;

    public constructor() {
        super();
        this.mLogger = new Logger('LolGallLoader');
    }

    public async getResult(input: null): Promise<LolGall[] | null> {
        const host = 'https://gall.dcinside.com';
        const query = 'id=leagueoflegends4&exception_mode=recommend';
        const url = `${host}/board/lists?${query}`;
        try {
            const res = await Axios.get(url);
            if (res.status !== 200) {
                this.mLogger.e('getResult: network error');
                return [];
            }
            const $ = cheerio.load(res.data);
            const $galls = $('tr.ub-content.us-post');
            const results = $galls
                .toArray()
                .map((e) => this.parse($(e)))
                .sort((a, b) => parseInt(a.hash) - parseInt(b.hash))
                .reverse()
                .filter((_, i) => i < 20);
            this.mLogger.v(`getResult: ${results.length}`);
            return results;
        } catch (e) {
            this.mLogger.e('getResult: uncaught error', e);
            return [];
        }
    }

    private parse($element: cheerio.Cheerio) {
        const $title = $element.find('.gall_tit a');
        const title = $title.text();
        const href = $title.attr('href');
        const hash = $element.find('.gall_num').text();
        const link = `https://gall.dcinside.com${href}`;
        const count = Number($element.find('.gall_count').text());
        const recommend = Number($element.find('.gall_recommend').text());
        return { count, hash, link, recommend, title };
    }
}
