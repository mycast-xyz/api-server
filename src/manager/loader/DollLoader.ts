import Axios from 'axios';
import * as cheerio from 'cheerio';
import {
    BuffInfo,
    BuffPosition,
    DollInfo,
    TypeInfo,
} from '../../models/GirlsFrontline';
import { Base64Builder } from '../../util/Base64Builder';
import { Logger } from '../../util/Logger';
import { BaseLoader } from './BaseLoader';
import { DollBaseInfo } from './GirlsFrontlineLoader';

export class DollLoader extends BaseLoader<DollBaseInfo, DollInfo> {
    private mLogger: Logger;
    private mId: number = 0;
    private mLink: string = '';
    private mIcon: string = '';
    private mName: string = '';
    private mType: TypeInfo = TypeInfo.HG;
    private mDescription: string = '';
    private mBuff: BuffInfo = { cells: [], text: '' };
    private mVoice: string = '';
    private mKeyword: string = '';
    private mStar: number = 1;
    private mIconComplete: boolean = false;

    public constructor() {
        super();
        this.mLogger = new Logger('DollLoader');
    }

    protected loadData() {
        if (!this.mInput) {
            this.mCallback(null);
            return;
        }
        const url = this.mInput.link;
        this.mId = this.mInput.id;
        this.mLink = this.mInput.link;
        this.mKeyword = this.mInput.keyword;
        this.mVoice = this.mInput.voice;
        this.mIcon = this.mInput.icon;
        this.mType = this.mInput.type;
        this.mStar = this.mInput.star;
        Axios.get(url, { timeout: 5000 }).then((res) => {
            if (res.status !== 200 || !res.data) {
                this.mCallback(null);
                return;
            }
            const $ = cheerio.load(res.data, {
                normalizeWhitespace: true,
                decodeEntities: false,
            });
            // Name
            this.mName = $('.dollSdName b').text();
            // Description
            this.mDescription = $('.dollCaption').text();
            // Buff
            let buffText = $('.positionBuff td[style]').html();
            if (buffText !== null) {
                buffText = buffText
                    .replace(/<br>/g, '\n')
                    .replace(/<.*?>/g, '');
            } else {
                buffText = '';
            }
            const buffCells = $('.positionBuffTable td')
                .toArray()
                .map((e) => {
                    const rawClass = $(e).attr('class') || '';
                    const pos = parseInt(rawClass.replace('buffCell', ''));
                    switch (pos) {
                        case 0:
                            return BuffPosition.NONE;
                        case 1:
                            return BuffPosition.BUFF;
                        case 2:
                            return BuffPosition.ME;
                        default:
                            return BuffPosition.NONE;
                    }
                });
            this.mBuff = { cells: buffCells, text: buffText };
            // Icon
            Base64Builder.convertToBase64(this.mIcon, (result) => {
                if (result !== null) {
                    this.mIcon = result;
                }
                this.mIconComplete = true;
                this.onLoadComplete();
            });
        });
    }
    private onLoadComplete() {
        if (this.mIconComplete) {
            this.mLogger.v(this.mName);
            this.mCallback(this.getOutput());
        }
    }
    private getOutput(): DollInfo {
        return {
            id: this.mId,
            name: this.mName,
            description: this.mDescription,
            icon: this.mIcon,
            type: this.mType,
            link: this.mLink,
            buff: this.mBuff,
            voice: this.mVoice,
            keyword: this.mKeyword,
            star: this.mStar,
        };
    }
}
