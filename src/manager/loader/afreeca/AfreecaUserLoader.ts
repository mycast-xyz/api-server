import axios from 'axios';
import cheerio = require('cheerio');
import { BaseAsyncLoader } from '../common/BaseAsyncLoader';
import { AfreecaResult } from './AfreecaResult';

export class AfreecaUserLoader extends BaseAsyncLoader<string, AfreecaResult> {
    async getResult(id: string): Promise<AfreecaResult | null> {
        const body = await this.getBody(id);
        return this.createResult(id, body);
    }

    async getBody(id: string): Promise<string> {
        const host = 'http://play.afreeca.com';
        const url = `${host}/${id}`;
        const { data: body } = (await axios.get<string>(url)) || '';
        return body;
    }

    createResult(id: string, body: string): AfreecaResult | null {
        try {
            const $ = cheerio.load(body, { normalizeWhitespace: true });
            const $titleMeta = $('meta[property="og:title"]');
            const $imageMeta = $('meta[property="og:image"]');
            const $title = $('title');
            const title = $titleMeta.attr('content') || '';
            const thumbnail = $imageMeta.attr('content') || '';
            const nickname = this.parseNickname($title.text());
            const icon = this.getIcon(id);
            return { id, title, icon, thumbnail, nickname, description: '' };
        } catch {
            return null;
        }
    }

    getIcon(id: string): string {
        const host = 'stimg.afreeca.com';
        const key = id.substring(0, 2);
        return `//${host}/LOGO/${key}/${id}/${id}.jpg`;
    }

    parseNickname(raw: string): string {
        return raw.replace(/ \|.*/, '');
    }
}
