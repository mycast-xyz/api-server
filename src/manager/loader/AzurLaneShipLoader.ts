import Axios from 'axios';
import * as cheerio from 'cheerio';
import * as AzurLane from '../../models/AzurLane';
import { Base64Builder } from '../../util/Base64Builder';
import { BaseLoader } from './BaseLoader';

export class AzurLaneShipLoader extends BaseLoader<string, AzurLane.ShipInfo> {
    private static readonly ICON_URI =
        'http://appdata.hungryapp.co.kr/images/dbimg/bilanhangxian/thum/';

    protected loadData(): void {
        if (!this.mInput) {
            this.mCallback(null);
            return;
        }
        const url: string = this.mInput;
        AzurLaneShipLoader.getShipInfo(url).then((ship) => {
            this.mCallback(ship);
        });
    }

    private static async getShipInfo(
        url: string
    ): Promise<AzurLane.ShipInfo | null> {
        const { status, data } = await Axios.get(url, { timeout: 5000 });

        if (status !== 200 || !data) {
            return null;
        }
        const $ = cheerio.load(data, {
            normalizeWhitespace: true,
            decodeEntities: false,
        });
        const link = url;
        const type = {
            name: $('.char_infom tr td').eq(0).text(),
            icon: $('.char_infom tr td img').eq(0).attr('src') || '',
        };
        const title = $('.vTitle_bar li').text();
        const codeName = title.replace(/No\.(.*?) .*/, '$1');
        const name = title.replace(/.*? (.*?) \(.*\)/, '$1');
        // const icon = AzurLaneShipLoader.getIcon(codeName);
        const icon = await this.getIconAsBase64(codeName);
        const sprite = $('.td_vimg img').attr('src') || '';
        const $skin = $('.char_img ul li a');
        const skins: AzurLane.SkinInfo[] = [];
        $skin.each((i, e) => {
            const $e = $(e);
            const href = $e.attr('href') || '';
            const skinName = $e.text();
            const skinNum = parseInt(href.replace(/.*(\d).*/, '$1'));
            if (skinNum === 0) {
                skins.push({ name: skinName, sprite });
            } else {
                const skin = sprite.replace('.png', 's' + skinNum + '.png');
                skins.push({ name: skinName, sprite: skin });
            }
        });
        const $inform = $('.char_infom tr');
        const $rarity = $inform.eq(1).find('td').eq(0).children('img');
        const rarity = AzurLaneShipLoader.getRarity($rarity.attr('src') || '');
        const star = $inform.eq(1).find('td').eq(1).children('img').length;
        const $buildTime = $('.char_infom tr').eq(2).find('td').eq(0);
        let buildTime = $buildTime.text().trim();
        if (buildTime === '') { buildTime = '건조불가'; }
        const $cv = $('.char_infom01 tr').eq(2).children('td');
        let cv = $cv.text().trim();
        if (cv === '') { cv = '없음'; }
        const output = {
            icon,
            link,
            codeName,
            name,
            type,
            star,
            sprite,
            skins,
            buildTime,
            cv,
            rarity,
        };
        return output;
    }

    private static async getIconAsBase64(codeName: string): Promise<string> {
        return await Base64Builder.getBase64FromUri(this.getIcon(codeName));
    }

    private static getIcon(codeName: string): string {
        return this.ICON_URI + codeName + 's.png';
    }

    private static getRarity(uri: string): AzurLane.Rarity {
        if (!uri) { return 'N'; }
        const classNum = parseInt(uri.replace(/.*(\d)\..*/, '$1'));
        switch (classNum) {
            case 1:
                return 'N';
            case 2:
                return 'R';
            case 3:
                return 'SR';
            case 4:
                return 'SSR';
            default:
                return 'N';
        }
    }
}
