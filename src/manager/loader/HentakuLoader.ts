import Axios from 'axios';
import * as cheerio from 'cheerio';
import * as AdultVideo from '../../models/AdultVideo';
import { BaseLoader } from './BaseLoader';

export class HentakuLoader extends BaseLoader<string, AdultVideo.Actress> {
    private static readonly URL: string = 'https://hentaku.net/star/';

    protected loadData(): void {
        if (this.mInput === null) {
            return;
        }

        const keyword = this.mInput.replace(/\s/g, '');
        const uri = HentakuLoader.URL + encodeURI(keyword);
        Axios.get(uri, { timeout: 5000 }).then((res) => {
            if (res.status !== 200 || !res.data) {
                return;
            }

            const $ = cheerio.load(res.data, {
                normalizeWhitespace: true,
                decodeEntities: false,
            });
            const $info = $('.avstar_info_b');

            const raw = $info.html();
            if (raw === null) {
                this.mCallback(null);
                return;
            }

            let rawInfo = raw.split('<br>');
            rawInfo = rawInfo.map((e) => e.trim());

            const names = rawInfo[0].split('/').map((e) => e.trim());
            const name = { kr: names[0], en: names[1], jp: names[2] };
            const bust = rawInfo[4];

            const age = parseInt($info.find('.age').text());
            const icon = $('.imageblock img').attr('src') || '';

            this.mCallback({
                name,
                age,
                icon,
                bust,
            });
        });
    }
}
