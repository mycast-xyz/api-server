import axios from 'axios';
import * as https from 'https';
import * as querystring from 'querystring';
import { AnimationData } from '../../../models/Animation';
import { Logger } from '../../../util/Logger';
import { BaseAsyncLoader } from '../common/BaseAsyncLoader';

export class OnnadaAnimationLoader extends BaseAsyncLoader<
    string,
    AnimationData
> {
    private static readonly HOST = 'https://onnada.com/anime/search';

    private mLogger: Logger;

    public constructor() {
        super();
        this.mLogger = new Logger('AnimationLoader');
    }

    public async getResult(input: string): Promise<AnimationData | null> {
        this.mLogger.v('getResult: ' + input);
        const uri = OnnadaAnimationLoader.getUri(input);
        this.mLogger.v('getResult: ' + uri);
        const res = await axios.get(uri, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
        });
        if (res.status !== 200) {
            this.mLogger.v('getResult: network error');
            return null;
        }

        const jsonStatementRegex = /var ONNADA = (.*)?;/;
        const match = jsonStatementRegex.exec(res.data);
        if (!match || !match[1]) {
            this.mLogger.v('getResult: parse error');
            return null;
        }
        const json = JSON.parse(match[1]);
        this.mLogger.v('getResult: ' + input);
        const entries: OnanadaAnimationInfo[] = json.result.items || [];
        const results: AnimationData[] = entries.map((e) => {
            return {
                title: e.title,
                link: e.uri,
                thumbnail: e.thumb,
                media: '',
                genre: '',
                date: e.date,
            };
        });

        const toKeyword = (s: string) => s.toLowerCase().replace(/\s+/g, '');
        const keyword = toKeyword(input);
        let result = results.find((e) => toKeyword(e.title) === keyword);
        if (!result) {
            result = results.find(
                (e) => toKeyword(e.title).search(keyword) >= 0
            );
        }
        if (!result) {
            return results[0];
        }
        return result;
    }

    private static getUri(animationName: string): string {
        const host = OnnadaAnimationLoader.HOST;
        const query = querystring.stringify({ q: animationName });
        return `${host}?${query}`;
    }
}

type OnanadaAnimationInfo = {
    id: number;
    uri: string;
    thumb: string;
    category: string;
    title: string;
    date: string;
};
