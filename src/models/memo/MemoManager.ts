import { Logger } from '../../util/Logger';
import { UserDbManager } from '../user/UserDbManager';
import { Memo } from './Memo';
import { MemoDao } from './MemoDao';
import { MemoDaoAdapter } from './MemoDaoAdapter';
import { MemoDbManager } from './MemoDbManager';

export class MemoManager {
    private mLogger: Logger;
    private mMemoDbManager: MemoDbManager;

    public constructor() {
        this.mLogger = new Logger('MemoManager');
        this.mMemoDbManager = new MemoDbManager();
    }

    public async loadAll(): Promise<Memo[]> {
        const rawMemos: MemoDao[] = await this.mMemoDbManager.load();
        return rawMemos.map((rawMemo) => new MemoDaoAdapter(rawMemo));
    }

    public async insert(userKey: string, body: string): Promise<boolean> {
        const userIdx = await new UserDbManager().getIdx(userKey);
        if (userIdx === UserDbManager.INDEX_NONE) {
            this.mLogger.e('Invalid User');
            return false;
        }
        const result = await new MemoDbManager().insert(userIdx, body);
        return result !== MemoDbManager.INDEX_NONE;
    }
}
