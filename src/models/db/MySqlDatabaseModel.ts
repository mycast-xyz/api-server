import * as MySql from 'mysql2/promise';

import { Logger } from '../../util/Logger';
import { DatabaseModel } from './DatabaseModel';

export class MySqlDatabaseModel implements DatabaseModel {
    private mLogger: Logger;
    private mPool: MySql.Pool;

    public constructor(param: MySqlDatabaseManagerParam) {
        this.mLogger = new Logger('MySqlDatabaseModel');
        this.mPool = MySql.createPool({
            database: param.database,
            host: param.host,
            password: param.password,
            user: param.user,
        });
    }

    public async query(query: string, args: any): Promise<any | null> {
        try {
            const connection = await this.mPool.getConnection();
            const [rows] = await connection.query<MySql.RowDataPacket[]>(
                query,
                args
            );
            connection.release();
            if (!rows) {
                return null;
            } else {
                return rows;
            }
        } catch {
            this.mLogger.e('query: db error');
            return null;
        }
    }
}

export type MySqlDatabaseManagerParam = {
    host: string;
    user: string;
    password: string;
    database: string;
};
