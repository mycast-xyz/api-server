import { Logger } from '../../util/Logger';
import { DatabaseModel } from '../db/DatabaseModel';
import { VegaDbModel } from '../db/VegaDbModel';
import { PhotoDao } from './PhotoDao';

export class PhotoDbManager {
    private mLogger: Logger;
    private mDbModel: DatabaseModel;

    public constructor() {
        this.mLogger = new Logger('PhotoDbManager');
        this.mDbModel = new VegaDbModel();
    }

    public async getPhotos(
        search: string,
        start: number,
        size: number
    ): Promise<PhotoDao[]> {
        const cols = this.getColumns();
        const colString = cols.join(',');
        const order = 'ORDER BY idx DESC';
        const limit = 'LIMIT ?, ?';
        const where = 'WHERE tag LIKE ?';
        const query =
            search.length > 0
                ? `SELECT ${colString} FROM photo ${where} ${order} ${limit}`
                : `SELECT ${colString} FROM photo ${order} ${limit}`;
        const args =
            search.length > 0 ? [`%${search}%`, start, size] : [start, size];
        try {
            const rows = (await this.mDbModel.query(query, args)) as PhotoDao[];
            return rows;
        } catch (e) {
            this.mLogger.e('load error', e);
            return [];
        }
    }

    public async getPhotosByTag(tag: string): Promise<PhotoDao[]> {
        const column = this.getColumns().join(',');
        const where = `WHERE tag LIKE ?`;
        const query = `SELECT ${column} FROM photo ${where}`;
        const args = [`%${tag}%`];
        try {
            return (await this.mDbModel.query(query, args)) as PhotoDao[];
        } catch (e) {
            this.mLogger.e('load error', e);
            return [];
        }
    }

    private getColumns(): string[] {
        return [
            'idx',
            'height',
            'width',
            'url',
            'tag',
            'is_adult as adult',
            'imgur_hash as hash',
            'type as mimeType',
            'reg_date as regDate',
        ];
    }
}
