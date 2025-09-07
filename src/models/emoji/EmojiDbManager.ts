import { Logger } from '../../util/Logger';
import { DatabaseModel } from '../db/DatabaseModel';
import { VegaDbModel } from '../db/VegaDbModel';
import { EmojiDao } from './EmojiDao';

export class EmojiDbManager {
    #logger: Logger = new Logger('EmojiDbManager');
    #db: DatabaseModel = new VegaDbModel();

    async findEmojiByName(name: string): Promise<EmojiDao | null> {
        const cols = this.#getColumns();
        const colString = cols.join(',');
        const where = 'WHERE name = ?';
        const query = `SELECT ${colString} FROM emoji ${where}`;
        try {
            const rows = (await this.#db.query(query, [name])) as EmojiDao[];
            return rows?.[0];
        } catch (e) {
            this.#logger.e('load error', e);
            return null;
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

    async removeEmoji(idx: number, requesterIdx: number): Promise<boolean> {
        const where = 'WHERE idx = ? AND uploader_idx = ?';
        const query = `DELETE FROM emoji ${where}`;
        const args = [idx, requesterIdx];
        try {
            const result = await this.#db.query(query, args);
            return result.affectedRows > 0;
        } catch (e) {
            this.#logger.e('delete error', e);
            return false;
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

    async isNameExist(name: string): Promise<boolean> {
        const where = 'WHERE name = ?';
        const query = `SELECT COUNT(*) as cnt FROM emoji ${where}`;
        const args = [name];
        try {
            const rows = await this.#db.query(query, args);
            return rows[0]?.cnt > 0;
        } catch (e) {
            this.#logger.e('duplicate check error', e);
            return false;
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
