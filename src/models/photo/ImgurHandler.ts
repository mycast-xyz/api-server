import Axios from 'axios';
import * as qs from 'querystring';
import { Config } from '../../Config';

import { Logger } from '../../util/Logger';

export class ImgurHandler {
    private mLogger: Logger;

    public constructor() {
        this.mLogger = new Logger('ImgurHandler');
    }

    public async getImage(hash: string): Promise<ImgurData | null> {
        const uri = `https://api.imgur.com/3/image/${hash}`;
        const opt = {
            headers: { Authorization: `Client-ID ${Config.IMGUR_CLIENT_ID}` },
        };
        const res = await Axios.get(uri, opt);
        if (!res || !res.data || res.status !== 200) {
            return null;
        } else {
            const rawData = res.data;
            if (!rawData.success || rawData.status !== 200 || !rawData.data) {
                return null;
            }
            return rawData.data;
        }
    }

    public async uploadBase64(base64: string): Promise<ImgurData | null> {
        if (!this.isImage(base64)) {
            this.mLogger.e('uploadPhoto: invalid base64');
            return null;
        }

        const content = this.getImageContent(base64);
        const uri = 'https://api.imgur.com/3/image';
        const opt = {
            headers: { Authorization: `Client-ID ${Config.IMGUR_CLIENT_ID}` },
        };
        const data = qs.stringify({ image: content });
        const res = await Axios.post<ImgurResponse>(uri, data, opt);
        const result = res.data;
        return result.success ? result.data : null;
    }

    private isImage(base64: string): boolean {
        return /data:(image\/.*?);base64,(.*)/.test(base64);
    }

    private getImageContent(base64: string): string {
        return base64.replace(/data:(image\/.*?);base64,(.*)/, '$2');
    }
}

export type ImgurData = {
    id: string;
    type: string;
    animated: boolean;
    width: number;
    height: number;
    views: number;
    link: string;
    datetime: number;
};

type ImgurResponse = {
    data: ImgurData;
    success: boolean;
    status: number;
};
