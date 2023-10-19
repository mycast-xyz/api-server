import Axios from 'axios';
import * as cheerio from 'cheerio';
import * as AzurLane from '../../models/AzurLane';
import { AzurLaneShipLoader } from './AzurLaneShipLoader';
import { BaseLoader } from './BaseLoader';

export class AzurLaneLoader extends BaseLoader<null, AzurLane.ShipInfo[]> {
    private static readonly BASE_URL: string =
        'http://www.hungryapp.co.kr/bbs/';
    private static readonly URL: string =
        'http://www.hungryapp.co.kr/bbs/game_bilanhangxian_char.php';

    private mLinks: string[] = [];
    private mOutput: AzurLane.ShipInfo[] = [];

    protected loadData(): void {
        const url = AzurLaneLoader.URL;
        const opt2 = { timeout: 5000 };
        Axios.get(url, opt2).then((res) => {
            if (res.status !== 200 || !res.data) {
                this.mCallback(null);
                return;
            }
            const body = res.data;
            const $ = cheerio.load(body);
            const $ships = $('#viewList1 tr td.td_name a');
            $ships.each((i, e) => {
                const link = $(e).attr('href');
                this.mLinks.push(AzurLaneLoader.BASE_URL + link);
            });
            this.loadShip();
        });
    }

    private loadShip() {
        const loadFunc = (index: number) => {
            if (index >= this.mLinks.length) {
                this.mCallback(this.mOutput);
            } else {
                const loader = new AzurLaneShipLoader();
                loader.load(this.mLinks[index], (ship) => {
                    if (ship !== null) {
                        this.mOutput.push(ship);
                    }
                    loadFunc(index + 1);
                });
            }
        };
        loadFunc(0);
    }
}
