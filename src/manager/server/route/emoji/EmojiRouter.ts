import { Request, Response, Router } from 'express';
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
        this.getRouter().get('/:userKey/emojis', (req, res) =>
            this.#onUserEmojis(req, res)
        );
        this.getRouter().get('/type/:type', this.#getEmojisByType.bind(this));
        this.getRouter().post('/', (req, res) => this.onPost(req, res));
    }

    onGet(req: Request, res: Response) {
        this.#logger.v('GET /emoji');
        res.send('Emoji route is working!');
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

    async #onUserEmojis(req: Request, res: Response) {
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
