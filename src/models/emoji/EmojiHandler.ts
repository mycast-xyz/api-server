import { Logger } from '../../util/Logger';
import { DatabaseModel } from '../db/DatabaseModel';
import { VegaDbModel } from '../db/VegaDbModel';
import { EmojiDbManager } from './EmojiDbManager';
import { ImageKitHandler } from './ImageKitHandler';

export class EmojiHandler {
    #logger = new Logger('EmojiHandler');
    #db: EmojiDbManager = new EmojiDbManager();
    #dbModel: DatabaseModel = new VegaDbModel();
    #imageKitHandler: ImageKitHandler = new ImageKitHandler();

    async uploadEmoji(
        privKey: string,
        base64: string,
        name: string
    ): Promise<InsertEmojiDao | null> {
        const uploaderIdx = await this.#getUserIdxByPrivKey(privKey);
        this.#logger.v(`Uploading emoji for user ${uploaderIdx}: ${name}`);
        const imageKitData = await this.#imageKitHandler.uploadBase64(
            base64,
            name
        );
        this.#logger.v(
            `ImageKit upload result: ${JSON.stringify(imageKitData)}`
        );
        if (!imageKitData) {
            this.#logger.e('ImageKit upload failed');
            return null;
        }

        const emoji: InsertEmojiDao = {
            type: 'imagekit',
            name: name,
            imageHash: imageKitData.fileId,
            thumbnailUrl: imageKitData.thumbnailUrl,
            uploaderIdx: uploaderIdx,
        };

        const emojiId = await this.#insertEmoji(emoji);
        this.#logger.v(`Uploaded emoji for user ${uploaderIdx}: ${name}`);
        return emojiId > 0 ? emoji : null;
    }

    async removeEmoji(emojiIdx: number, privateKey: string) {
        const requesterIdx = await this.#getUserIdxByPrivKey(privateKey);
        return await this.#db.removeEmoji(emojiIdx, requesterIdx);
    }

    async getUserEmojis(userIdx: number) {
        return await this.#db.getEmojisByUser(userIdx);
    }

    async getUserEmojisByPrivKey(privKey: string) {
        const userIdx = await this.#getUserIdxByPrivKey(privKey);
        return await this.#db.getEmojisByUser(userIdx);
    }

    async #getUserIdxByPrivKey(privKey: string): Promise<number> {
        const query = `SELECT idx FROM user WHERE private_key = ?`;
        const rows: any[] = await this.#dbModel.query(query, [privKey]);
        if (!rows || rows.length < 1) {
            throw new Error(`load: error ${rows}`);
        }
        return rows[0].idx;
    }

    async #insertEmoji(emojiDao: InsertEmojiDao): Promise<number> {
        const table = 'emoji';
        const query = `INSERT INTO ${table} (type, name, image_hash, thumbnail_url, uploader_idx) VALUES (?, ?, ?, ?, ?)`;
        const args = [
            emojiDao.type,
            emojiDao.name,
            emojiDao.imageHash,
            emojiDao.thumbnailUrl,
            emojiDao.uploaderIdx,
        ];
        const result = await this.#dbModel.query(query, args);
        if (!result || result.affectedRows < 1) {
            throw new Error('not updated');
        }
        return result.insertId;
    }
}

type InsertEmojiDao = {
    type: string;
    name: string;
    imageHash: string;
    thumbnailUrl: string;
    uploaderIdx: number;
};
