import axios from 'axios';
import { BaseAsyncLoader } from '../common/BaseAsyncLoader';
import { AfreecaResult } from './AfreecaResult';

export class AfreecaStreamLoader extends BaseAsyncLoader<
    string,
    AfreecaResult
> {
    public async getResult(id: string): Promise<AfreecaResult | null> {
        try {
            const url = `http://sch.afreeca.com/api.php?m=liveSearch&v=1.0&szOrder=&c=EUC-KR&szKeyword=${id}`;

            const { data: json } = await axios.get<RawResult>(url);
            const realBroad = json.REAL_BROAD;
            const broad = realBroad.find((b) => b.user_id === id);
            if (broad) {
                return {
                    id,
                    icon: this.getIcon(id),
                    nickname: broad.user_nick,
                    title: broad.station_name,
                    description: broad.b_broad_title,
                    thumbnail: broad.broad_img,
                };
            } else {
                return null;
            }
        } catch (e) {
            return null;
        }
    }

    getIcon(id: string): string {
        const host = 'stimg.afreeca.com';
        const key = id.substring(0, 2);
        return `//${host}/LOGO/${key}/${id}/${id}.jpg`;
    }
}

type RawResult = {
    REAL_BROAD: {
        user_id: string;
        broad_title: string;
        broad_img: string;
        b_broad_title: string;
        station_name: string;
        user_nick: string;
    }[];
};
