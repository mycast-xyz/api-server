import { Request, Response } from 'express';

import { StagedStream } from '../../../../models/stream/common/StagedStream';
import { StreamDbManager } from '../../../../models/stream/db/StreamDbManager';
import { TwitchStagedStreamLoader } from '../../../../models/stream/twitch/TwitchStagedStreamLoader';
import { BaseRouter } from '../BaseRouter';
import { YoutubeStagedStreamLoader } from '../../../../models/stream/youtube/YoutubeStagedStreamLoader';
import { Config } from '../../../../Config';
import { ChzzkStagedStreamLoader } from '../../../../models/stream/chzzk/ChzzkStagedStreamLoader';

export class StreamRouter extends BaseRouter {
    private mDbManager: StreamDbManager;

    public constructor() {
        super();

        this.mDbManager = new StreamDbManager();

        this.getRouter().get('/', (req, res) => {
            res.send('hi');
        });
        this.getRouter().post('/', (req, res) => this.onStreamPost(req, res));
        this.getRouter().get('/twitch/:keyId', (req, res) =>
            this.onTwitchSearch(req, res)
        );
        this.getRouter().get('/youtube/:keyId', (req, res) =>
            this.onYoutubeSearch(req, res)
        );
        this.getRouter().get('/chzzk/:keyId', (req, res) =>
            this.#onChzzkSearch(req, res)
        );
    }

    private onStreamPost(
        req: Request<any>,
        res: Response<StreamPostResult>
    ): void {
        const { platform = null, keyId = null } = req.body;
        this.mDbManager.upsert(platform, keyId).then((idx) => {
            if (idx !== StreamDbManager.INDEX_NONE) {
                res.json({ result: true, msg: 'success' });
            } else {
                res.json({ result: false, msg: 'failed' });
            }
        });
    }

    private onTwitchSearch(
        req: Request<any>,
        res: Response<StagedStream | null>
    ): void {
        const { keyId } = req.params;
        new TwitchStagedStreamLoader()
            .load(keyId)
            .then((result) => {
                res.json(result);
            })
            .catch((e) => {
                res.json(null);
            });
    }

    onYoutubeSearch(req: Request<any>, res: Response<StagedStream | null>) {
        const { keyId } = req.params;
        new YoutubeStagedStreamLoader(Config.YOUTUBE_API_KEY)
            .load(keyId)
            .then((result) => {
                res.json(result);
            })
            .catch((e) => {
                res.json(null);
            });
    }

    #onChzzkSearch(req: Request<any>, res: Response<StagedStream | null>) {
        const { keyId } = req.params;
        new ChzzkStagedStreamLoader()
            .load(keyId)
            .then((result) => {
                res.json(result);
            })
            .catch((e) => {
                res.json(null);
            });
    }
}

type StreamPostResult = {
    result: boolean;
    msg: string;
};
