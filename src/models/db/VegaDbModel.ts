import { Config } from '../../Config';
import { MySqlDatabaseModel } from './MySqlDatabaseModel';

export class VegaDbModel extends MySqlDatabaseModel {
    public constructor() {
        super({
            database: Config.DATABASE_NAME,
            host: Config.DATABASE_HOST,
            password: Config.DATABASE_PASSWORD,
            user: Config.DATABASE_USER,
        });
    }
}
