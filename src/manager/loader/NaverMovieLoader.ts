import Axios from 'axios';
import * as querystring from 'querystring';
import { MovieData } from '../../models/MovieData';
import { Logger } from '../../util/Logger';
import { BaseLoader } from './BaseLoader';

type NaverMovieData = {
    lastBuildDate: string;
    total: number;
    start: number;
    display: number;
    items: NaverMovieItem[];
};

type NaverMovieItem = {
    title: string;
    link: string;
    image: string;
    subtitle: string;
    pubDate: string;
    director: string;
    actor: string;
    userRating: string;
};

export class NaverMovieLoader extends BaseLoader<string, MovieData> {
    private static readonly CLIENT_ID = 'jYjZ2eKBqfYtPeMonFlo';
    private static readonly CLIENT_SECRET = 'cBToDfXmoK';
    private static readonly API_URI =
        'https://openapi.naver.com/v1/search/movie.json';

    private mLogger: Logger;

    private static findResult(
        items: NaverMovieItem[],
        keyword: string
    ): NaverMovieItem | null {
        const keywordize = (s: string) => s.replace(/[\s]+/g, '');
        const fullMatch = (item: NaverMovieItem) => {
            return keywordize(item.title) === keywordize(keyword);
        };
        const partMatch = (item: NaverMovieItem) => {
            return keywordize(item.title).includes(keywordize(keyword));
        };

        if (items.length === 0) {
            return null;
        }

        const sorted = items.sort((i1, i2) => {
            return parseFloat(i2.userRating) - parseFloat(i1.userRating);
        });

        const equal = sorted.find((item) => item.title === keyword);
        if (equal) {
            return equal;
        }

        const fullMatched = sorted.find((item) => fullMatch(item));
        if (fullMatched) {
            return fullMatched;
        }

        const partMatched = items.find((item) => partMatch(item));
        if (partMatched) {
            return partMatched;
        }

        return items[0];
    }

    public constructor() {
        super();
        this.mLogger = new Logger('NaverMovieLoader');
    }

    protected loadData() {
        this.getData().then((result) => {
            this.mCallback(result);
        });
    }

    private async getData(): Promise<MovieData | null> {
        const opt = {
            headers: {
                'X-Naver-Client-Id': NaverMovieLoader.CLIENT_ID,
                'X-Naver-Client-Secret': NaverMovieLoader.CLIENT_SECRET,
            },
            timeout: 5000,
        };
        const res = await Axios.get(this.getUri(), opt);
        if (this.mInput === null) {
            return null;
        }
        if (res.status !== 200 || !res.data) {
            return null;
        }
        const rawData: NaverMovieData = res.data as NaverMovieData;
        if (rawData.total === 0) {
            return null;
        }
        const rawMovies = rawData.items.map((item) => {
            item.title = item.title.replace(/<\/?b>/g, '').trim();
            return item;
        });
        const raw = NaverMovieLoader.findResult(rawMovies, this.mInput);
        if (raw === null) {
            return null;
        }
        const result: MovieData = {
            actor: raw.director.split('|'),
            director: raw.director.split('|'),
            image: raw.image,
            link: raw.link,
            pubDate: raw.pubDate,
            rate: raw.userRating,
            title: raw.title.replace(/<.*?>/g, ''),
        };
        return result;
    }

    private getUri(): string {
        return (
            NaverMovieLoader.API_URI +
            '?' +
            querystring.stringify({
                query: this.mInput,
                display: 20,
            })
        );
    }
}
