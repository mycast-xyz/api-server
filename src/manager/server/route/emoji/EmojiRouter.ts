import { Request, Response } from 'express';
import { EmojiDbManager } from '../../../../models/emoji/EmojiDbManager';
import { EmojiHandler } from '../../../../models/emoji/EmojiHandler';
import { Logger } from '../../../../util/Logger';
import { BaseRouter } from '../BaseRouter';

export class EmojiRouter extends BaseRouter {
    #logger = new Logger('EmojiRouter');
    #handler = new EmojiHandler();
    #db: EmojiDbManager = new EmojiDbManager();

    constructor() {
        super();
        this.getRouter().get('/', (req, res) => this.onGet(req, res));
        this.getRouter().get('/info', (req, res) => this.onGetInfo(req, res));
        this.getRouter().get('/:userKey/emojis', (req, res) =>
            this.#onUserEmojis(req, res)
        );
        this.getRouter().delete('/:userKey/emoji/:emojiIdx', (req, res) =>
            this.#onDeleteEmoji(req, res)
        );
        this.getRouter().get('/type/:type', this.#getEmojisByType.bind(this));
        this.getRouter().post('/', (req, res) => this.onPost(req, res));
    }

    async onGet(req: Request, res: Response) {
        this.#logger.v('GET /emoji');
        try {
            const emojis = await this.#db.getAllEmojisWithUploader();
            const emojiDtos: EmojiDto[] = emojis.map((emoji) => ({
                regDate: emoji.regDate,
                type: emoji.type,
                name: emoji.name,
                imageHash: emoji.imageHash,
                thumbnailUrl: emoji.thumbnailUrl,
                uploader: {
                    nickname: emoji.uploaderNickname,
                    icon: emoji.uploaderIcon,
                },
            }));
            res.json(emojiDtos);
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch emojis' });
        }
    }

    async onGetInfo(req: Request, res: Response) {
        this.#logger.v('GET /emoji/info');
        const name = req.query.name as string;
        if (!name) {
            res.status(400).json({ error: 'name query required' });
            return;
        }
        const emoji = await this.#handler.getEmojiByName(name);
        if (!emoji) {
            res.status(404).json({ error: 'Emoji not found' });
            return;
        }
        res.json(emoji);
    }

    onPost(req: Request, res: Response) {
        const { privKey, base64, name } = req.body;
        if (!base64 || typeof base64 !== 'string') {
            this.#logger.e(`Invalid input`);
            res.sendStatus(400);
            return;
        }
        const base64Preview = base64.substring(0, 20);
        this.#logger.v(
            `POST /emoji with pk: ${privKey}, name: ${name}, base64: ${base64Preview}...`
        );
        new EmojiHandler()
            .uploadEmoji(privKey, base64, name)
            .then((emojiDao) => {
                if (!emojiDao) {
                    res.sendStatus(500);
                    return;
                }
                res.status(200).json(emojiDao);
            });
    }

    #onDeleteEmoji(req: Request, res: Response) {
        const userKey = req.params.userKey as string;
        const emojiIdx = parseInt(req.params.emojiIdx as string);
        if (isNaN(emojiIdx)) {
            this.#logger.e(`Invalid emojiIdx: ${req.params.emojiIdx}`);
            res.sendStatus(400);
            return;
        }
        const result = this.#handler.removeEmoji(emojiIdx, userKey);
        if (!result) {
            this.#logger.e(
                `Failed to delete emojiIdx: ${emojiIdx} for userKey: ${userKey}`
            );
            res.sendStatus(500);
            return;
        }
        this.#logger.v(`Deleted emojiIdx: ${emojiIdx} for userKey: ${userKey}`);
        res.sendStatus(200);
    }

    async #onUserEmojis(req: Request, res: Response) {
        this.#logger.v('GET /emoji/:userKey/emojis');
        const userKey = req.params.userKey as string;
        try {
            const emojis = await this.#handler.getUserEmojisByPrivKey(userKey);
            res.json(emojis);
        } catch (e) {
            res.status(500).json([]);
        }
    }

    async #getEmojisByType(req: Request, res: Response) {
        const type = req.params.type;
        try {
            const emojis = await this.#db.getEmojisByType(type);
            res.json(emojis);
        } catch (e) {
            res.status(500).json([]);
        }
    }
}

type EmojiDto = {
    regDate: Date;
    type: string;
    name: string;
    imageHash: string;
    thumbnailUrl: string;
    uploader: {
        nickname: string;
        icon: string;
    };
};
