import { randomUUID } from 'crypto';
import { createPool, Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { Config } from '../../Config';
import { UserBotSecrets } from './UserBotSecrets';

export type UserBotProfile = { id: string; name: string; icon: string; tokenActive: boolean; expiresAt: string | null };
export class UserBotRepository {
    private readonly pool: Pool;
    constructor(pool?: Pool, private readonly secrets = new UserBotSecrets()) {
        this.pool = pool || createPool({ host: Config.DATABASE_HOST, port: Number(process.env.DB_PORT || 3306),
            database: Config.DATABASE_NAME, user: Config.DATABASE_USER, password: Config.DATABASE_PASSWORD,
            connectionLimit: 4, timezone: 'Z' });
    }
    async close() { await this.pool.end(); }
    private fail(status: number, message: string): never { throw Object.assign(new Error(message), { status }); }
    private async owner(connection: PoolConnection, key: string): Promise<number> {
        if (!key || key.startsWith('mub_')) this.fail(401, '소유자 계정으로 로그인해 주세요.');
        const [rows] = await connection.execute<RowDataPacket[]>('SELECT idx FROM user WHERE private_key=? AND confirm=1 FOR UPDATE', [key]);
        if (!rows.length) this.fail(401, '소유자 계정으로 로그인해 주세요.');
        return rows[0].idx;
    }
    private async transaction<T>(key: string, work: (connection: PoolConnection, owner: number) => Promise<T>): Promise<T> {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const owner = await this.owner(connection, key);
            const result = await work(connection, owner);
            await connection.commit(); return result;
        } catch (error) { await connection.rollback(); throw error; }
        finally { connection.release(); }
    }
    private async find(connection: PoolConnection, owner: number, id: string) {
        const [rows] = await connection.execute<RowDataPacket[]>(
            'SELECT b.*,t.token_cipher,t.revoked_at,t.expires_at FROM user_bot b JOIN user_bot_token t ON t.bot_id=b.id WHERE b.id=? AND b.owner_idx=? AND b.deleted_at IS NULL', [id, owner]);
        if (!rows.length) this.fail(404, 'user-bot을 찾을 수 없습니다.');
        return rows[0];
    }
    list(key: string) {
        return this.transaction(key, async (connection, owner) => {
            const [rows] = await connection.execute<RowDataPacket[]>(
                'SELECT b.id,b.name,b.icon,(t.revoked_at IS NULL AND (t.expires_at IS NULL OR t.expires_at>UTC_TIMESTAMP())) AS tokenActive,t.expires_at AS expiresAt FROM user_bot b JOIN user_bot_token t ON t.bot_id=b.id WHERE b.owner_idx=? AND b.deleted_at IS NULL ORDER BY b.created_at,b.id', [owner]);
            return rows;
        });
    }
    create(key: string, name: string, icon: string) {
        return this.transaction(key, async (connection, owner) => {
            const [count] = await connection.execute<RowDataPacket[]>('SELECT COUNT(*) AS total FROM user_bot WHERE owner_idx=? AND deleted_at IS NULL', [owner]);
            if (count[0].total >= 3) this.fail(409, 'user-bot은 계정당 최대 3개까지 만들 수 있습니다.');
            const id = randomUUID(), secret = this.secrets.mint(id);
            await connection.execute('INSERT INTO user_bot(id,owner_idx,name,icon) VALUES(?,?,?,?)', [id, owner, name, icon]);
            await connection.execute('INSERT INTO user_bot_token(bot_id,token_hash,token_cipher,expires_at) VALUES(?,?,?,NULL)', [id, secret.hash, secret.cipher]);
            return { id, name, icon };
        });
    }
    update(key: string, id: string, name: string, icon: string) {
        return this.transaction(key, async (connection, owner) => {
            await this.find(connection, owner, id);
            await connection.execute('UPDATE user_bot SET name=?,icon=? WHERE id=?', [name, icon, id]);
        });
    }
    token(key: string, id: string) {
        return this.transaction(key, async (connection, owner) => {
            const bot = await this.find(connection, owner, id);
            if (bot.revoked_at || (bot.expires_at && new Date(bot.expires_at).getTime() <= Date.now())) this.fail(410, '폐기되었거나 만료된 토큰입니다. 재발급해 주세요.');
            return { token: this.secrets.reveal(id, bot.token_cipher), expiresAt: bot.expires_at };
        });
    }
    rotate(key: string, id: string) {
        return this.transaction(key, async (connection, owner) => {
            await this.find(connection, owner, id);
            const secret = this.secrets.mint(id);
            await connection.execute('UPDATE user_bot_token SET token_hash=?,token_cipher=?,revoked_at=NULL,expires_at=NULL WHERE bot_id=?', [secret.hash, secret.cipher, id]);
            return { token: secret.token };
        });
    }
    revoke(key: string, id: string, remove = false) {
        return this.transaction(key, async (connection, owner) => {
            await this.find(connection, owner, id);
            await connection.execute("UPDATE user_bot_token SET revoked_at=UTC_TIMESTAMP(),token_cipher='' WHERE bot_id=?", [id]);
            if (remove) await connection.execute('UPDATE user_bot SET deleted_at=UTC_TIMESTAMP() WHERE id=?', [id]);
        });
    }
}
