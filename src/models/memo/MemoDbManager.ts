import { Logger } from '../../util/Logger';
import { DatabaseModel } from '../db/DatabaseModel';
import { VegaDbModel } from '../db/VegaDbModel';
import { MemoDao } from './MemoDao';

export class MemoDbManager {
    public static readonly INDEX_NONE = -1;

    private mLogger: Logger;
    private mDbModel: DatabaseModel;

    public constructor() {
        this.mLogger = new Logger('MemoDbManager');
        this.mDbModel = new VegaDbModel();
    }

    public async load(): Promise<MemoDao[]> {
        const columns = [
            'memo.idx as idx',
            'user.nickname as userNickname',
            'user.icon as userIcon',
            'content',
            'memo.reg_date as regDate',
        ];
        const table = 'memo JOIN user ON user.idx = memo.user_idx';
        const order = 'ORDER BY memo.idx DESC';
        const query = `SELECT ${columns.join(',')} FROM ${table} ${order}`;
        try {
            const result = await this.mDbModel.query(query, null);
            return result;
        } catch (e) {
            this.mLogger.e(e);
            return [];
        }
    }

    public async insert(userIdx: number, content: string): Promise<number> {
        const table = 'memo';
        const cols = ['user_idx', 'content'];
        const values = cols.map((_) => '?');
        const args = [userIdx, content];
        const columnValue = `(${cols.join()}) VALUES (${values.join()})`;
        const query = `INSERT INTO ${table} ${columnValue}`;
        try {
            const result = await this.mDbModel.query(query, args);
            const idx = result.insertId;
            this.mLogger.v('insert: memo inserted: ', idx);
            return idx;
        } catch (e) {
            this.mLogger.e('insert: error:', e);
            return MemoDbManager.INDEX_NONE;
        }
    }
}
