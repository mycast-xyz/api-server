import Axios from 'axios';
import * as cheerio from 'cheerio';
import { Base64Builder } from '../../util/Base64Builder';

export class HonkaiLoader {
    private static mComplete: number = 0;
    private static mTotal: number = 0;

    private static mResult: any[];

    public static load(callback: (result: any[]) => void) {
        const url = 'http://honkai3rd.inven.co.kr/dataninfo/valkyrie/';
        Axios.get(url, { timeout: 5000 }).then((res) => {
            const $ = cheerio.load(res.data);

            this.mResult = [];

            const $characters = $('div#listTable tr');

            this.mTotal = $characters.length - 1;
            this.mComplete = 0;

            $characters.each((i, e) => {
                if (i === 0) { return; }
                const subtitle = $(e).find('td.name a').eq(0).text();
                const name = $(e).find('td.name a').eq(1).text();

                const rank =
                    $(e).find('div.avatarStarRank img').attr('src') || '';
                let rankData = rank.replace(/.*_avatar_(\d)\.png/, '$1');
                rankData = this.getRank(rankData);

                const attr = $(e).find('td.field2 img').attr('src') || '';
                let attrData = attr.replace(/.*avatar_attri_0(\d)\.png/, '$1');
                attrData = this.getAttr(attrData);

                let weapon = $(e).find('td.field3 div.ndata').text();
                weapon = this.getWeapon(weapon);

                const icon = $(e).find('.avatarIcon img').attr('src') || '';

                Base64Builder.convertToBase64(icon, (data) => {
                    this.mResult.push({
                        name,
                        description: subtitle,

                        costumes: [
                            {
                                ability: ['물리 방어력 200', '치명타 확률 5%'],
                                name: '네스 사령관 로슈포르',
                                icon: data,
                            },
                            {
                                ability: [
                                    '마법 저항력 200',
                                    '치명타 피해량 20%',
                                ],
                                name: '달토끼 로슈포르',
                                icon: data,
                            },
                        ],
                        blockSkill: {
                            icon: data,
                            name: '매의 깃털',
                            ability:
                                '블록 사용 시, 체인 수에 따라 공격력(100/150/250)%만큼 물리 피해를 주고, 다음 받는 5초 이내 10회의 공격을 (25/50/75)% 확률로 막습니다.',
                        },
                        passive: {},
                        ultWeapon: {},
                        type: '워리어',
                        star: 1,
                        icon: data,
                    });

                    this.mComplete++;

                    this.onComplete(callback);
                });
            });
        });
    }

    private static onComplete(callback: (result: any[]) => void) {
        if (this.mTotal === this.mComplete) {
            callback(this.mResult);
        }
    }

    private static getRank(str: string): string {
        switch (str) {
            case '1':
                return 'B';
            case '2':
                return 'A';
            case '3':
                return 'S';
            default:
                return 'Unknown';
        }
    }

    private static getAttr(str: string): string {
        switch (str) {
            case '1':
                return '생물';
            case '2':
                return '이능';
            case '3':
                return '기계';
            default:
                return 'Unknown';
        }
    }

    private static getWeapon(str: string): string {
        switch (str) {
            case '1':
                return '쌍권총';
            case '2':
                return '태도';
            case '3':
                return '중포';
            case '4':
                return '대검';
            case '5':
                return '십자가';
            default:
                return 'Unknown';
        }
    }
}
