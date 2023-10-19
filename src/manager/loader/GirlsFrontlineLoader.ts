import Axios from 'axios';
import * as cheerio from 'cheerio';

import { DollInfo, TypeInfo } from '../../models/GirlsFrontline';
import { BaseLoader } from './BaseLoader';
import { DollLoader } from './DollLoader';

export type DollBaseInfo = {
    id: number;
    link: string;
    icon: string;
    voice: string;
    type: TypeInfo;
    keyword: string;
    star: number;
};

export class GirlsFrontlineLoader extends BaseLoader<null, DollInfo[]> {
    private static readonly URL: string =
        'http://gf.inven.co.kr/dataninfo/dolls/';

    private mInfos: DollBaseInfo[] = [];
    private mOutput: DollInfo[] = [];

    private static parseData($e: cheerio.Cheerio): DollBaseInfo {
        // id
        const rawId = $e.find('.dollNumber').text().replace('No. ', '');
        const id = parseInt(rawId);

        // link
        const link = $e.find('.imageHeight a').attr('href') || '';

        // icon
        const icon = $e.find('.imageHeight img').attr('src') || '';

        // voice
        const rawVoice = $e.find('.name1 a').eq(1).text();
        const voice = rawVoice.replace('CV : ', '').trim();

        // keyword
        const keyword = $e.find('.keywordSearch').text();

        // type
        const rawStyle = $e.find('.dollType').attr('style') || '';
        const rawType = parseInt(rawStyle.replace(/.*icon_(\d).*/, '$1'));
        let type: TypeInfo;
        switch (rawType) {
            case 1:
                type = TypeInfo.HG;
            case 2:
                type = TypeInfo.SMG;
            case 3:
                type = TypeInfo.RF;
            case 4:
                type = TypeInfo.AR;
            case 5:
                type = TypeInfo.MG;
            case 6:
                type = TypeInfo.SG;
            default:
                type = TypeInfo.HG;
        }

        // star
        const rawStar = $e.find('.dollStar').attr('style') || '';
        const star = parseInt(rawStar.replace(/.*star_(\d).*/, '$1'));

        return { id, link, icon, keyword, type, voice, star };
    }

    protected loadData() {
        const opt = { timeout: 5000 };
        Axios.get(GirlsFrontlineLoader.URL, opt).then((res) => {
            if (res.status !== 200 || !res.data) {
                this.mCallback(null);
                return;
            }
            const $ = cheerio.load(res.data);
            const rows = $('#listTable tr')
                .toArray()
                .filter((e, i) => i > 0);

            this.mInfos = rows.map((e, i) => {
                return GirlsFrontlineLoader.parseData($(e));
            });

            this.loadDolls();
        });
    }

    private loadDolls() {
        const loadFunc = (index: number) => {
            if (index >= this.mInfos.length) {
                this.mCallback(this.mOutput);
            } else {
                const loader = new DollLoader();
                loader.load(this.mInfos[index], (doll) => {
                    if (doll !== null) {
                        this.mOutput.push(doll);
                    }
                    loadFunc(index + 1);
                });
            }
        };
        loadFunc(0);
    }
}
