import { Request, Response } from 'express';

import { MemoManager } from '../../../../models/memo/MemoManager';
import { BaseRouter } from '../BaseRouter';
import { MemoDto } from './MemoDto';

export class MemoRouter extends BaseRouter {
    private mMemoManager: MemoManager;

    public constructor() {
        super();
        this.mMemoManager = new MemoManager();

        this.getRouter().get('/', (req, res) => this.onRootGet(req, res));
        this.getRouter().post('/', (req, res) => this.onRootPost(req, res));
    }

    private onRootGet(req: Request<any>, res: Response<any>): void {
        const start = Number(req.query.start) || 0;
        const size = Number(req.query.size) || 10;
        const until = Number(req.query.until) || -1;

        // this.mMemoManager.load(start, size, until)
        this.mMemoManager.loadAll().then((memos) => {
            const memoDtos: MemoDto[] = memos.map((memo) => {
                const memoDto: MemoDto = {
                    content: memo.getContent(),
                    idx: memo.getIdx(),
                    regDate: memo.getRegDate().getTime(),
                    userIcon: memo.getUserIcon(),
                    userNickname: memo.getUserNickname(),
                };
                return memoDto;
            });
            res.json(memoDtos);
        });
    }

    private onRootPost(req: Request<any>, res: Response<any>): void {
        const userKey = req.body.userKey;
        const text = req.body.text;

        this.insertMemo(userKey, text)
            .then((insertMemoResult) => {
                res.statusCode = insertMemoResult.result ? 201 : 400;
                res.send(insertMemoResult);
            })
            .catch((e) => {
                res.statusCode = 500;
                res.send();
            });
    }

    private async insertMemo(
        userKey: string,
        body: string
    ): Promise<InsertMemoResult> {
        const result = await this.mMemoManager.insert(userKey, body);
        return { result };
    }
}

type InsertMemoResult = {
    result: boolean;
};
