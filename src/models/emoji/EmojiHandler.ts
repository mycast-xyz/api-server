import { Logger } from '../../util/Logger';
import { DatabaseModel } from '../db/DatabaseModel';
import { VegaDbModel } from '../db/VegaDbModel';
import { EmojiDbManager } from './EmojiDbManager';
import { ImageKitHandler } from './ImageKitHandler';

export class EmojiHandler {
    #logger = new Logger('EmojiHandler');
    #db: EmojiDbManager = new EmojiDbManager();
    #dbModel: DatabaseModel = new VegaDbModel();
    #imageKit: ImageKitHandler = new ImageKitHandler();

    readonly REASON_DUPLICATED = 'duplicated';
    readonly REASON_UPLOAD_FAILED = 'upload_failed';
    readonly REASON_DB_ERROR = 'db_error';

    async uploadEmoji(
        privKey: string,
        base64: string,
        name: string
    ): Promise<UploadResult> {
        const isDuplicated = await this.#db.isNameExist(name);
        if (isDuplicated) {
            this.#logger.e(`Emoji name duplicated: ${name}`);
            return {
                result: false,
                reason: this.REASON_DUPLICATED,
                msg: '이모지 이름이 중복됩니다.',
            };
        }

        const uploaderIdx = await this.#getUserIdxByPrivKey(privKey);
        this.#logger.v(`Uploading emoji for user ${uploaderIdx}: ${name}`);
        const imageKitData = await this.#imageKit.uploadBase64(base64, name);
        this.#logger.v(
            `ImageKit upload result: ${JSON.stringify(imageKitData)}`
        );
        if (!imageKitData) {
            this.#logger.e('ImageKit upload failed');
            return {
                result: false,
                reason: this.REASON_UPLOAD_FAILED,
                msg: '업로드에 실패했습니다.',
            };
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
        if (emojiId > 0) {
            return { result: true, emoji };
        } else {
            return {
                result: false,
                reason: this.REASON_DB_ERROR,
                msg: '데이터베이스 오류',
            };
        }
    }

    async getEmojiByName(name: string): Promise<EmojiInfo | null> {
        const emoji = await this.#db.findEmojiByName(name);
        if (!emoji) {
            return null;
        }
        switch (emoji.type) {
            case 'imagekit': {
                const imageKitData = await this.#imageKit.getImage(
                    emoji.imageHash
                );
                if (!imageKitData || !imageKitData.url) {
                    this.#logger.e(
                        `ImageKit image not found: ${emoji.imageHash}`
                    );
                    return null;
                }
                const resized = this.#imageKit.getResizedUrl(
                    imageKitData.url,
                    64
                );
                return {
                    type: 'image',
                    name: emoji.name,
                    src: resized,
                };
            }
            default:
                this.#logger.e(`Unknown emoji type: ${emoji.type}`);
                return null;
        }
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

export type UploadResult = UploadSuccessResult | UploadFailResult;

type UploadSuccessResult = {
    result: true;
    emoji: InsertEmojiDao;
};

type UploadFailResult = {
    result: false;
    reason: string;
    msg: string;
};

type InsertEmojiDao = {
    type: string;
    name: string;
    imageHash: string;
    thumbnailUrl: string;
    uploaderIdx: number;
};

type EmojiInfo = { name: string; type: 'image'; src: string };
