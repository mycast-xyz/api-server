import Axios from 'axios';
import * as cheerio from 'cheerio';
import { Logger } from '../../../util/Logger';
import { BaseAsyncLoader } from '../common/BaseAsyncLoader';

export class LolInvenNewsLoader extends BaseAsyncLoader<null, any[]> {
    private mLogger: Logger;

    public constructor() {
        super();
        this.mLogger = new Logger('LolInvenNewLoader');
    }

    public async getResult(input: null): Promise<any[] | null> {
        const url = 'http://m.inven.co.kr/webzine/wznews.php?site=lol';
        try {
            const { status, data } = await Axios.get(url);
            if (status !== 200) {
                this.mLogger.e('getResult: network error');
                return [];
            }
            const $ = cheerio.load(data);
            const $article = $('.articleSubject') || [];
            const results = $article.toArray().map((e) => this.parse($(e)));
            return results;
        } catch (e) {
            this.mLogger.e('getResult');
            return [];
        }
    }

    private parse($element: cheerio.Cheerio) {
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
