import Axios from 'axios';
import * as cheerio from 'cheerio';
import * as CrusaderQuest from '../../models/CrusaderQuest';
import { BaseLoader } from './BaseLoader';
import { WarriorLoader } from './WarriorLoader';

export class CqWarriorLoader extends BaseLoader<
    null,
    CrusaderQuest.WarriorInfo[]
> {
    private static readonly URL: string =
        'http://cq.inven.co.kr/dataninfo/hero/';

    private mLinks: string[] = [];
    private mOutput: CrusaderQuest.WarriorInfo[] = [];

    protected loadData() {
        Axios.get(CqWarriorLoader.URL, { timeout: 5000 }).then((res) => {
            if (res.status !== 200 || !res.data) {
                this.mCallback(null);
                return;
            }

            const $ = cheerio.load(res.data);
            const $warriors = $('.herolist tr td.name a');
            $warriors.each((i, e) => {
                const link = $(e).attr('href') || '';
                this.mLinks.push(link);
            });

            this.loadWarrior();
        });
    }

    private loadWarrior() {
        const loadFunc = (index: number) => {
            if (index >= this.mLinks.length) {
                this.mCallback(this.mOutput);
            } else {
                const loader = new WarriorLoader();
                loader.load(this.mLinks[index], (warrior) => {
                    if (warrior !== null) {
                        this.mOutput.push(warrior);
                    }
                    loadFunc(index + 1);
                });
            }
        };
        loadFunc(0);
    }
}
