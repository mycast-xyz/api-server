import { Request, Response } from 'express';
import { Config } from '../../../../Config';
import { TwitchUserLoader } from '../../../../models/twitch/TwitchUserLoader';
import { TwitchVideoLoader } from '../../../../models/twitch/TwitchVideoLoader';
import { BaseRouter } from '../BaseRouter';

export class TwitchRouter extends BaseRouter {
    private mUserLoader: TwitchUserLoader;
    private mVideoLoader: TwitchVideoLoader;

    public constructor() {
        super();

        this.mUserLoader = new TwitchUserLoader(Config.TWITCH_CLIENT_KEY);
        this.mVideoLoader = new TwitchVideoLoader(Config.TWITCH_CLIENT_KEY);

        this.getRouter().get('/user/:userName/', (req, res) =>
            this.onGetUser(req, res)
        );

        this.getRouter().get('/video/:videoId/', (req, res) => {
            this.onGetVideo(req, res);
        });
    }

    private async onGetUser(req: Request<any>, res: Response): Promise<void> {
        const { userName } = req.params as { userName: string };
        this.mUserLoader.getUser(userName).then((user) => {
            res.json(user !== null ? user : '');
        });
    }

    private onGetVideo(req: Request<any>, res: Response): void {
        const { videoId } = req.params as { videoId: string };
        this.mVideoLoader.getVideo(videoId).then((video) => {
            res.json(video);
        });
    }
}
