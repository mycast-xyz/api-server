import { Request, Response } from 'express';
import { LolUserInfo } from '../../../../models/Lol';
import { Loader } from '../../../loader/common/Loader';
import { LolUserCacheLoader } from '../../../loader/LolUserCacheLoader';
import { LolChampionManager } from '../../../LolChampionManager';
import { BaseRouter } from '../BaseRouter';

export class LolRouter extends BaseRouter {
    private mLolUserLoader: Loader<string, LolUserInfo>;

    public constructor() {
        super();

        this.mLolUserLoader = new LolUserCacheLoader();

        this.getRouter().get('/champion/:champion_name/', (req, res) =>
            this.onGetChampion(req, res)
        );
        this.getRouter().get('/user/:userName/', (req, res) =>
            this.onGetUser(req, res)
        );
    }

    private onGetChampion(req: Request<any>, res: Response<any>): void {
        const championName = req.params.champion_name;
        const result = LolChampionManager.getChampionInfo(championName);
        if (result) {
            res.json(result);
        }
    }

    private onGetUser(req: Request<any>, res: Response): void {
        const { userName } = req.params as { userName: string };
        this.mLolUserLoader.load(userName, (result) => {
            res.json(result);
        });
    }
}
