import { Request, Response } from 'express';
import { LolInvenNewsLoader } from '../../../loader/inven/LolInvenNewsLoader';
import { BaseRouter } from '../BaseRouter';

export class InvenRouter extends BaseRouter {
    private mLoader: LolInvenNewsLoader;

    public constructor() {
        super();
        this.mLoader = new LolInvenNewsLoader();

        this.getRouter().get('/news', (req, res) => {
            this.onGetNews(req, res);
        });
    }

    private async onGetNews(
        req: Request<any>,
        res: Response<any>
    ): Promise<void> {
        const articles = await this.mLoader.getResult(null);
        res.json(articles);
    }
}
