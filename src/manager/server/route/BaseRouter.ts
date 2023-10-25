import * as cors from 'cors';
import { Router } from 'express';

import { Logger } from '../../../util/Logger';

export class BaseRouter {
    private static sWhiteList: string[] = [
        'http://mycast.xyz',
        'https://mycast.xyz',
        'https://test.mycast.xyz',
        'http://localhost:4200',
        'http://localhost:5000',
        'http://localhost:5173',
        'http://mycast.xyz:10080',
    ];

    protected mLogger: Logger;
    private mRouter: Router;

    public constructor() {
        this.mLogger = new Logger('BaseRouter');
        this.mRouter = Router();
        const corsOpt: cors.CorsOptions = {
            origin: (origin, callback) => {
                if (!origin) {
                    this.mLogger.v(`accept: server to server`);
                    callback(null, true);
                } else if (BaseRouter.sWhiteList.indexOf(origin) !== -1) {
                    callback(null, true);
                } else {
                    this.mLogger.e(`rejected: ${origin}`);
                    callback(new Error('Not allowed by CORS'));
                }
            },
        };
        this.mRouter.use(cors(corsOpt));
    }

    public getRouter(): Router {
        return this.mRouter;
    }
}
