import { Request, Response } from 'express';

import { PhotoDbManager } from '../../../../models/photo/PhotoDbManager';
import { PhotoDto } from '../../../../models/photo/PhotoDto';
import { PhotoHandler } from '../../../../models/photo/PhotoHandler';
import { Logger } from '../../../../util/Logger';
import { BaseRouter } from '../BaseRouter';

export class PhotoRouter extends BaseRouter {
    private mPhotoDbManager: PhotoDbManager;

    public constructor() {
        super();
        this.mLogger = new Logger('PhotoRouter');
        this.mPhotoDbManager = new PhotoDbManager();

        this.getRouter().get('/', (req, res) => this.onPhotoGet(req, res));
        this.getRouter().get('/:query', (req, res) =>
            this.onPhotoQuery(req, res)
        );
        this.getRouter().post('/', (req, res) => this.onPhotoPost(req, res));
        this.getRouter().post('/:hash/tags', (req, res) =>
            this.onTagPost(req, res)
        );
        this.getRouter().post('/:hash/adult', (req, res) =>
            this.onAdultPost(req, res)
        );
    }

    private async onPhotoGet(req: Request, res: Response): Promise<void> {
        const { q: rawSearch, start: rawStart, num: rawNum } = req.query;
        const search = (rawSearch as string) || '';
        const start = Number(rawStart) || 0;
        const num = Number(rawNum) || 100;
        try {
            const photos = await this.mPhotoDbManager.getPhotos(
                search,
                start,
                num
            );
            res.json(photos);
        } catch (e) {
            this.mLogger.e('load failed', e);
            res.json([]);
        }
    }

    private async onPhotoQuery(
        req: Request,
        res: Response<TagPhotoDto>
    ): Promise<void> {
        const { query } = req.params;
        this.mLogger.v(`GET /photo/${query}`);
        try {
            const photos = await this.mPhotoDbManager.getPhotosByTag(query);
            const exacts = photos.filter((photo) => photo.tag === query);
            if (exacts.length > 0) {
                const idx = Math.floor(Math.random() * exacts.length);
                const photo = exacts[idx];
                this.mLogger.v(`GET /photo/${query} success`, photo.idx);
                res.json({ keyword: query, url: photo.url });
                return;
            }

            const similars = photos.filter(
                (photo) => photo.tag && photo.tag.split(',').includes(query)
            );
            if (similars.length > 0) {
                const idx = Math.floor(Math.random() * similars.length);
                const photo = similars[idx];
                this.mLogger.v(`GET /photo/${query} success`, photo.idx);
                res.json({ keyword: query, url: photo.url });
                return;
            }

            if (photos.length > 0) {
                const idx = Math.floor(Math.random() * photos.length);
                const photo = photos[idx];
                this.mLogger.v(`GET /photo/${query} success`, photo.idx);
                res.json({ keyword: query, url: photo.url });
                return;
            }
            throw new Error('no photo');
        } catch (e) {
            this.mLogger.w(`GET /photo/${query} failed`, e);
            res.sendStatus(400);
        }
    }

    private onPhotoPost(req: Request, res: Response<PhotoDto>): void {
        const { privKey, base64 } = req.body;
        new PhotoHandler()
            .uploadPhoto(privKey, base64)
            .then((photoDao) => {
                if (!photoDao) {
                    res.sendStatus(500);
                    return;
                }
                const photoDto: PhotoDto = {
                    adult: false,
                    hash: photoDao.imgurHash,
                    height: photoDao.height,
                    mimeType: photoDao.type,
                    regDate: photoDao.regDate,
                    tag: [],
                    url: photoDao.url,
                    width: photoDao.width,
                };
                res.json(photoDto);
            })
            .catch((e) => {
                this.mLogger.w(`POST /photo failed`, e.message);
                res.sendStatus(400);
            });
    }

    private onTagPost(req: Request, res: Response): void {
        const { hash } = req.params;
        const { msg: tags } = req.body;
        new PhotoHandler()
            .updateTags(hash, tags)
            .then((success) => {
                res.json({ result: success });
            })
            .catch(() => {
                res.sendStatus(400);
            });
    }

    private onAdultPost(req: Request, res: Response): void {
        const { hash } = req.params;
        const adult: boolean = req.body.msg === 'true';
        new PhotoHandler()
            .updateAdult(hash, adult)
            .then((success) => {
                res.json({
                    result: success,
                });
            })
            .catch(() => {
                res.sendStatus(400);
            });
    }
}

type TagPhotoDto = {
    keyword: string;
    url: string;
};
