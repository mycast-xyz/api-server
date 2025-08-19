import { Request, Response, Router } from 'express';
import { EmojiDbManager } from '../../../../models/emoji/EmojiDbManager';
import { EmojiHandler } from '../../../../models/emoji/EmojiHandler';
import { Logger } from '../../../../util/Logger';
import { BaseRouter } from '../BaseRouter';

export class EmojiRouter extends BaseRouter {
    #logger = new Logger('EmojiRouter');
    #db: EmojiDbManager = new EmojiDbManager();

    constructor() {
        super();

        this.getRouter().get('/', this.#getEmojis.bind(this));
        this.getRouter().get('/:userKey/emojis', (req, res) =>
            this.#onUserEmojis(req, res)
        );
        this.getRouter().get('/type/:type', this.#getEmojisByType.bind(this));
        this.getRouter().post('/', (req, res) => this.onPost(req, res));
    }

    onPost(req: Request, res: Response) {
        const { privKey, base64, name } = req.body;
        this.#logger.v(
            `POST /emoji with privKey: ${privKey}, name: ${name}, base64: ${base64}`
        );
        new EmojiHandler().uploadEmoji(privKey, base64, name).then((result) => {
            if (result) {
                res.sendStatus(200);
                res.json();
            } else {
                res.sendStatus(500);
                return;
            }
        });
    }

    async #onUserEmojis(req: Request, res: Response) {
        const userKey = req.params.userKey;
        try {
            const emojis = await this.#db.getEmojis(userKey, 0, 100);
            res.json(emojis);
        } catch (e) {
            res.status(500).json([]);
        }
    }

    async #getEmojis(req: Request, res: Response) {
        const search = req.query.search?.toString() || '';
        const start = parseInt(req.query.start as string) || 0;
        const size = parseInt(req.query.size as string) || 20;
        try {
            const emojis = await this.#db.getEmojis(search, start, size);
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
