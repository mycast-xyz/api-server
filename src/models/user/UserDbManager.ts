import { Logger } from '../../util/Logger';
import { DatabaseModel } from '../db/DatabaseModel';
import { VegaDbModel } from '../db/VegaDbModel';

export class UserDbManager {
    static readonly INDEX_NONE = -1;

    #logger: Logger;
    #dbModel: DatabaseModel;

    constructor() {
        this.#logger = new Logger('UserDbManager');
        this.#dbModel = new VegaDbModel();
    }

    async getIdx(privKey: string): Promise<number> {
        const query = 'SELECT idx FROM user WHERE private_key = ?';
        const args = [privKey];
        try {
            const result = await this.#dbModel.query(query, args);
            return result[0].idx;
        } catch {
            this.#logger.e('invalid user id');
            return UserDbManager.INDEX_NONE;
        }
    }

    async getSecretKey(privKey: string): Promise<string | null> {
        const query = 'SELECT secret_key FROM user WHERE private_key = ?';
        const args = [privKey];
        try {
            const result = await this.#dbModel.query(query, args);
            const secretKey: string = result[0].secret_key;
            if (secretKey && secretKey.length > 0) {
                return secretKey;
            } else {
                return null;
            }
        } catch {
            this.#logger.e('invalid user id');
            return null;
        }
    }

    async setSecretKey(privKey: string, secretKey: string): Promise<boolean> {
        const query = `UPDATE user SET secret_key = ? WHERE private_key = ?`;
        const args = [secretKey, privKey];
        try {
            const result = await this.#dbModel.query(query, args);
            return true;
        } catch {
            this.#logger.e('invalid user');
            return false;
        }
    }

    async getUserInfos(): Promise<UserDao[]> {
        const columns = [
            'id',
            'nickname',
            'icon',
            'status_message as statusMessage',
        ];
        const columnString = columns.join();
        const query = `SELECT ${columnString} FROM user`;
        try {
            const result = await this.#dbModel.query(query, null);
            const rows: any[] = result;
            return rows;
        } catch {
            this.#logger.e('invalid user');
            return [];
        }
    }

    async getUserInfo(privKey: string): Promise<UserDao | null> {
        const columns = [
            'id',
            'nickname',
            'icon',
            'status_message as statusMessage',
        ];
        const columnString = columns.join();
        const query = `SELECT ${columnString} FROM user WHERE private_key = ?`;
        const args = [privKey];
        try {
            const result = await this.#dbModel.query(query, args);
            const rows: any[] = result;
            return rows[0];
        } catch {
            this.#logger.e('invalid user');
            return null;
        }
    }

    async getStreamInfo(privKey: string): Promise<UserStreamDao | null> {
        const columns = [
            'broadcast_class as platform',
            'broadcast_bgimg as backgroundImage',
            'id as localId',
            'LEFT(hash, 5) as localHash',
            'afreeca_id as afreecaId',
            'twitch_id as twitchId',
            'chzzk_id as chzzkId',
            'youtube_handle as youtubeHandle',
        ];
        const columnString = columns.join();
        const query = `SELECT ${columnString} FROM user WHERE private_key = ?`;
        const args = [privKey];
        try {
            const rows: any[] = await this.#dbModel.query(query, args);
            return rows[0];
        } catch (e) {
            this.#logger.e('db error:', e);
            return null;
        }
    }

    async setStream(
        privKey: string,
        platform: string,
        backgroundImage: string,
        afreecaId: string,
        twitchId: string,
        chzzkId: string,
        youtubeHandle: string,
        youtubeVideoId: string
    ): Promise<boolean> {
        const columns = [
            'broadcast_class',
            'broadcast_bgimg',
            'afreeca_id',
            'twitch_id',
            'chzzk_id',
            'youtube_handle',
            'youtube_video_id',
        ];
        const colString = columns.map((c) => `${c} = ?`).join(',');
        const query = `UPDATE user SET ${colString} WHERE private_key = ?`;
        const args = [
            platform,
            backgroundImage,
            afreecaId,
            twitchId,
            chzzkId,
            youtubeHandle,
            youtubeVideoId,
            privKey,
        ];
        try {
            const result = await this.#dbModel.query(query, args);
            return true;
        } catch {
            this.#logger.e('invalid user');
            return false;
        }
    }

    async setStreamPlatform(
        privKey: string,
        platform: string
    ): Promise<boolean> {
        const query = `UPDATE user SET broadcast_class = ? WHERE private_key = ?`;
        const args = [platform, privKey];
        try {
            const result = await this.#dbModel.query(query, args);
            return true;
        } catch {
            this.#logger.e('invalid user');
            return false;
        }
    }
}

export type UserDao = {
    id: string;
    nickname: string;
    icon: string;
    statusMessage: string;
};

export type UserStreamDao = {
    platform: string;
    backgroundImage: string;
    localId: string;
    localHash: string;
    afreecaId: string;
    twitchId: string;
    chzzkId: string;
    youtubeHandle: string;
};
