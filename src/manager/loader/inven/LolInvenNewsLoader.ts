import Axios from 'axios';
import * as cheerio from 'cheerio';
import { Logger } from '../../../util/Logger';
import { BaseAsyncLoader } from '../common/BaseAsyncLoader';

export class LolInvenNewsLoader extends BaseAsyncLoader<null, any[]> {
    #logger: Logger;

    constructor() {
        super();
        this.#logger = new Logger('LolInvenNewLoader');
    }

    async getResult(input: null): Promise<any[] | null> {
        const url = 'http://m.inven.co.kr/webzine/wznews.php?site=lol';
        try {
            const { status, data } = await Axios.get(url);
            if (status !== 200) {
                this.#logger.e('getResult: network error');
                return [];
            }
            const $ = cheerio.load(data);
            const $article = $('.articleSubject') || [];
            const results = $article.toArray().map((e) => this.#parse($(e)));
            return results;
        } catch (e) {
            this.#logger.e('getResult');
            return [];
        }
    }

    #parse($element: cheerio.Cheerio) {
        const $subject = $element.find('.subject');
        const $thumb = $element.find('span.thumb img');
        const $title = $element.find('span.title');
        const $preview = $element.find('span.preview');

        const dir = $subject.attr('href') || '';
        const idxMatch = /idx=(\d+)/.exec(dir);
        const idx = idxMatch ? idxMatch[1] : '';
        const link = `https://www.inven.co.kr/webzine/news/?news=${idx}&site=lol`;
        const icon = $thumb.attr('src') || '';
        const title = $title.text();
        const description = $preview.text();
        return { link, icon, title, description };
    }
}
