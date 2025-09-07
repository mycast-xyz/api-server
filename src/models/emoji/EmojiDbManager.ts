import { Logger } from '../../util/Logger';
import { DatabaseModel } from '../db/DatabaseModel';
import { VegaDbModel } from '../db/VegaDbModel';
import { EmojiDao } from './EmojiDao';

export class EmojiDbManager {
    #logger: Logger = new Logger('EmojiDbManager');
    #db: DatabaseModel = new VegaDbModel();

    async getEmojis(
        search: string,
        start: number,
        size: number
    ): Promise<EmojiDao[]> {
        const cols = this.#getColumns();
        const colString = cols.join(',');
        const order = 'ORDER BY idx DESC';
        const limit = 'LIMIT ?, ?';
        const where = 'WHERE name LIKE ?';
        const query =
            search.length > 0
                ? `SELECT ${colString} FROM emoji ${where} ${order} ${limit}`
                : `SELECT ${colString} FROM emoji ${order} ${limit}`;
        const args =
            search.length > 0 ? [`%${search}%`, start, size] : [start, size];
        try {
            const rows = (await this.#db.query(query, args)) as EmojiDao[];
            return rows;
        } catch (e) {
            this.#logger.e('load error', e);
            return [];
        }
    }

    async getEmojisByType(type: string): Promise<EmojiDao[]> {
        const column = this.#getColumns().join(',');
        const where = `WHERE type = ?`;
        const query = `SELECT ${column} FROM emoji ${where}`;
        const args = [type];
        try {
            return (await this.#db.query(query, args)) as EmojiDao[];
        } catch (e) {
            this.#logger.e('load error', e);
            return [];
        }
    }

    async getEmojisByUser(userIdx: number): Promise<EmojiDao[]> {
        const column = this.#getColumns().join(',');
        const where = 'WHERE uploader_idx = ?';
        const order = 'ORDER BY idx DESC';
        const query = `SELECT ${column} FROM emoji ${where} ${order}`;
        const args = [userIdx];
        try {
            const rows = (await this.#db.query(query, args)) as EmojiDao[];
            return rows;
        } catch (e) {
            this.#logger.e('load error', e);
            return [];
        }
    }

    #getColumns(): string[] {
        return [
            'idx',
            'reg_date as regDate',
            'type',
            'name',
            'image_hash as imageHash',
            'thumbnail_url as thumbnailUrl',
            'uploader_idx as uploaderIdx',
        ];
    }
}
