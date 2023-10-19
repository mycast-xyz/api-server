import e = require('express');
import { Logger } from '../../util/Logger';
import { DatabaseModel } from '../db/DatabaseModel';
import { VegaDbModel } from '../db/VegaDbModel';
import { ImgurHandler } from './ImgurHandler';

export class PhotoHandler {
    private mLogger: Logger;
    private mImgurHandler: ImgurHandler;
    private mDbModel: DatabaseModel;

    public constructor() {
        this.mLogger = new Logger('PhotoLoader');
        this.mImgurHandler = new ImgurHandler();
        this.mDbModel = new VegaDbModel();
    }

    public async uploadPhoto(
        privKey: string,
        base64: string
    ): Promise<InsertPhotoDao | null> {
        const uploaderIdx = await this.getUserIdxByPrivKey(privKey);

        const imgurData = await this.mImgurHandler.uploadBase64(base64);
        if (!imgurData) {
            return null;
        }

        const photo = {
            height: imgurData.height,
            imgurHash: imgurData.id,
            regDate: imgurData.datetime * 1000,
            type: imgurData.type,
            uploaderIdx,
            url: imgurData.link,
            width: imgurData.width,
        };
        const photoId = await this.insertPhoto(photo);
        return photoId > 0 ? photo : null;
    }

    public async updateTags(hash: string, tags: string): Promise<boolean> {
        const query = `UPDATE photo SET tag = ? WHERE imgur_hash = ?`;
        const args = [tags, hash];
        const result = await this.mDbModel.query(query, args);
        if (!result || !result.changedRows) {
            return false;
        } else {
            return result.changedRows > 0;
        }
    }

    public async updateAdult(hash: string, adult: boolean): Promise<boolean> {
        const query = `UPDATE photo SET is_adult = ? WHERE imgur_hash = ?`;
        const adultValue = adult ? 1 : 0;
        const args = [adultValue, hash];
        const result = await this.mDbModel.query(query, args);
        if (!result || !result.changedRows) {
            return false;
        } else {
            return result.changedRows > 0;
        }
    }

    private async insertPhoto(photoDao: InsertPhotoDao): Promise<number> {
        const query =
            'INSERT INTO photo (imgur_hash, url, type, width, height, uploader_idx, reg_date) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const args = [
            photoDao.imgurHash,
            photoDao.url,
            photoDao.type,
            photoDao.width,
            photoDao.height,
            photoDao.uploaderIdx,
            new Date(photoDao.regDate),
        ];
        const result = await this.mDbModel.query(query, args);
        if (!result || result.affectedRows < 1) {
            throw new Error('not updated');
        }
        return result.insertId;
    }

    private async getUserIdxByPrivKey(privKey: string): Promise<number> {
        const query = `SELECT idx FROM user WHERE private_key = ?`;
        const rows: any[] = await this.mDbModel.query(query, [privKey]);
        if (!rows || rows.length < 1) {
            throw new Error(`load: error ${rows}`);
        }
        return rows[0].idx;
    }
}

type InsertPhotoDao = {
    imgurHash: string;
    url: string;
    type: string;
    width: number;
    height: number;
    uploaderIdx: number;
    regDate: number;
};

type OkPacket = {
    affectedRows: number;
    insertId: number;
};
