import { Logger } from '../../../util/Logger';
import { DatabaseModel } from '../../db/DatabaseModel';
import { VegaDbModel } from '../../db/VegaDbModel';

export class StreamDbManager {
    public static readonly INDEX_NONE = -1;

    private mLogger: Logger;
    private mDbModel: DatabaseModel;

    public constructor() {
        this.mLogger = new Logger('StreamDbManager');
        this.mDbModel = new VegaDbModel();
    }

    public async upsert(pf: string, keyId: string): Promise<number> {
        const result = await this.queryIdx(pf, keyId);
        if (result !== StreamDbManager.INDEX_NONE) {
            return StreamDbManager.INDEX_NONE;
        } else {
            return this.insert(pf, keyId);
        }
    }

    private async queryIdx(pf: string, keyId: string): Promise<number> {
        const table = 'stream';
        const where = 'WHERE platform = ? AND keyid = ?';
        const args = [pf, keyId];
        const query = `SELECT idx FROM ${table} ${where}`;
        try {
            const result = await this.mDbModel.query(query, args);
            if (!result || !result[0]) {
                return StreamDbManager.INDEX_NONE;
            }
            return result[0];
        } catch (e) {
            this.mLogger.e('db error', e);
            return StreamDbManager.INDEX_NONE;
        }
    }

    private async insert(pf: string, keyId: string): Promise<number> {
        const table = 'stream';
        const cols = ['platform', 'keyid'];
        const values = cols.map((_) => '?');
        const args = [pf, keyId];
        const columnValue = `(${cols.join()}) VALUES (${values.join()})`;
        const query = `INSERT INTO ${table} ${columnValue}`;
        try {
            const result = await this.mDbModel.query(query, args);
            const idx = result.insertId;
            this.mLogger.v('insert: stream inserted: ', idx);
            return idx;
        } catch (e) {
            this.mLogger.e('insert: error:', e);
            return StreamDbManager.INDEX_NONE;
        }
    }
}
