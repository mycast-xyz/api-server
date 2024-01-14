import { Request, Response } from 'express';

import { UserDbManager } from '../../../../models/user/UserDbManager';
import { UserSecretKeyManager } from '../../../../models/user/UserSecretKeyManager';
import { BaseRouter } from '../BaseRouter';

export class UserRouter extends BaseRouter {
    private mUserDb: UserDbManager;

    public constructor() {
        super();
        this.mUserDb = new UserDbManager();

        this.getRouter().get('/', (req, res) => {
            res.send('hi');
        });
        this.getRouter().get('/:userKey/', (req, res) =>
            this.onUserKey(req, res)
        );
        this.getRouter().get('/:userKey/stream', (req, res) =>
            this.onUserStream(req, res)
        );
        this.getRouter().put('/:userKey/stream', (req, res) =>
            this.onPutUserStream(req, res)
        );
        this.getRouter().put('/:userKey/stream/platform', (req, res) =>
            this.onPutUserStreamPlatform(req, res)
        );
        this.getRouter().get('/:userKey/secret', (req, res) =>
            this.onUserSecret(req, res)
        );
    }

    private onUserKey(req: Request<any>, res: Response<any>): void {
        const { userKey } = req.params;
        this.mUserDb
            .getUserInfo(userKey)
            .then((user) => {
                if (!user) {
                    res.send();
                    return;
                } else {
                    res.send(user);
                }
            })
            .catch(() => {
                res.send();
            });
    }

    private onUserSecret(req: Request<any>, res: Response<any>): void {
        const { userKey } = req.params;
        const secretKeyManager = new UserSecretKeyManager();
        const secretKey = secretKeyManager.getOrCreateSecretKey(userKey);
        secretKey
            .then((secretKey) => {
                if (secretKey) {
                    res.send(secretKey);
                } else {
                    res.sendStatus(404);
                }
            })
            .catch(() => {
                res.sendStatus(404);
            });
    }

    private onUserStream(
        req: Request<any>,
        res: Response<UserStreamDto>
    ): void {
        const { userKey } = req.params;
        this.mUserDb
            .getStreamInfo(userKey)
            .then((stream) => {
                if (!stream) {
                    res.send();
                    return;
                } else {
                    res.send(stream);
                }
            })
            .catch(() => {
                res.send();
            });
    }

    private onPutUserStream(
        req: Request<any>,
        res: Response<PutPlatformDto>
    ): void {
        const { userKey } = req.params;
        const {
            platform,
            backgroundImage,
            afreecaId,
            twitchId,
            chzzkId,
            youtubeHandle,
            youtubeVideoId,
        } = req.body;

        if (!this.isPlatformValid(platform)) {
            res.send({ result: false });
            return;
        }

        this.mUserDb
            .setStream(
                userKey,
                platform,
                backgroundImage,
                afreecaId,
                twitchId,
                chzzkId,
                youtubeHandle,
                youtubeVideoId
            )
            .then((result) => {
                res.send({ result });
            })
            .catch(() => {
                res.send({ result: false });
            });
    }

    private onPutUserStreamPlatform(
        req: Request<any>,
        res: Response<PutPlatformDto>
    ): void {
        const { userKey } = req.params;
        const { platform } = req.body;

        if (!this.isPlatformValid(platform)) {
            res.send({ result: false });
            return;
        }

        this.mUserDb
            .setStreamPlatform(userKey, platform)
            .then((result) => {
                res.send({ result });
            })
            .catch(() => {
                res.send({ result: false });
            });
    }

    private isPlatformValid(platform: string): boolean {
        return (
            platform === 'local' ||
            platform === 'twitch' ||
            platform === 'totoro' ||
            platform === 'afreeca'
        );
    }
}

type UserStreamDto = {
    platform: string;
    backgroundImage: string;
    localId: string;
    afreecaId: string;
    twitchId: string;
};

type PutPlatformDto = {
    result: boolean;
};
