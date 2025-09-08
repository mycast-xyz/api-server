import * as MySql from 'mysql2/promise';

import { Logger } from '../../util/Logger';
import { DatabaseModel } from './DatabaseModel';

export class MySqlDatabaseModel implements DatabaseModel {
    #logger: Logger;
    #pool: MySql.Pool;

    constructor(param: MySqlDatabaseManagerParam) {
        this.#logger = new Logger('MySqlDatabaseModel');
        this.#pool = MySql.createPool({
            database: param.database,
            host: param.host,
            password: param.password,
            user: param.user,
        });
    }

    async query(query: string, args?: any): Promise<any | null> {
        try {
            const connection = await this.#pool.getConnection();
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
        } catch (e) {
            this.#logger.e('query: db error', e);
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
