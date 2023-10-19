import { Request, Response } from 'express';
import { UserDbManager } from '../../../../models/user/UserDbManager';
import { BaseRouter } from '../BaseRouter';

export class UsersRouter extends BaseRouter {
    private mUserDb: UserDbManager;

    public constructor() {
        super();
        this.mUserDb = new UserDbManager();

        this.getRouter().get('/statusmessage', (req, res) => {
            this.onUserStatusMessages(req, res);
        });
    }

    private async onUserStatusMessages(
        req: Request<any>,
        res: Response<any>
    ): Promise<void> {
        const users = await this.mUserDb.getUserInfos();
        const filtered = users.filter((user) => user.statusMessage);
        const statusMessages = filtered.map<StatusMessageDto>((user) => {
            const statusMessage = {
                icon: user.icon,
                nickname: user.nickname,
                statusMessage: user.statusMessage,
            };
            return statusMessage;
        });
        res.send(statusMessages);
    }
}

type StatusMessageDto = {
    nickname: string;
    icon: string;
    statusMessage: string;
};
