import Axios from 'axios';
import * as qs from 'querystring';

import { BookInfo } from '../../models/BookInfo';
import { Loader, LoaderCallback } from './common/Loader';

export class KakaoBookLoader implements Loader<string, BookInfo> {
    private static readonly API_KEY: string =
        '83b65fc95f138991b2c11a6bca1dfe7d';

    public load(input: string, callback: LoaderCallback<BookInfo>): void {
        this.loadBook(input).then((book) => {
            callback(book);
        });
    }

    private async loadBook(name: string): Promise<BookInfo | null> {
        const encodedName = encodeURI(name);
        const host = 'https://dapi.kakao.com';
        const path = 'v3/search/book';
        const query = qs.stringify({ query: name, size: 1 });
        const url = `${host}/${path}?${query}`;
        const opt = {
            headers: {
                Authorization: `KakaoAK ${KakaoBookLoader.API_KEY}`,
            },
        };
        const res = await Axios.get(url, opt);
        const book = res.data;
        if (!book || !book.documents || !book.documents[0]) {
            return null;
        } else {
            const rawBook = book.documents[0];
            return {
                result: true,
                title: rawBook.title,
                author: rawBook.authors.join(', '),
                translator: rawBook.translators.join(', '),
                date: rawBook.datetime.replace(/T.*$/, ''),
                publish: rawBook.publisher,
                thumbnail: rawBook.thumbnail,
                category: rawBook.contents,
                link: rawBook.url,
            };
        }
    }
}
