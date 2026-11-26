import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { readFileSync } from 'fs';

export class UserBotSecrets {
    constructor(private readonly encodedKey?: string,
        private readonly keyFile = process.env.USER_BOT_TOKEN_KEY_FILE || '/var/lib/jenkins/mycast-data/user-bot/token.key') {}
    private key(): Buffer {
        let encoded = this.encodedKey;
        if (encoded === undefined) {
            encoded = process.env.USER_BOT_TOKEN_KEY || '';
            if (!encoded) { try { encoded = readFileSync(this.keyFile, 'utf8').trim(); } catch { encoded = ''; } }
        }
        const key = Buffer.from(encoded, 'base64');
        if (key.length !== 32) throw Object.assign(new Error('user-bot 토큰 암호화 키가 설정되지 않았습니다.'), { status: 503 });
        return key;
    }
    mint(id: string) {
        const token = 'mub_' + randomBytes(32).toString('base64url');
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
        cipher.setAAD(Buffer.from(id));
        const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
        return { token, hash: createHash('sha256').update(token).digest('hex'),
            cipher: [iv, cipher.getAuthTag(), data].map(value => value.toString('base64')).join('.') };
    }
    reveal(id: string, encrypted: string): string {
        const [iv, tag, data] = encrypted.split('.').map(value => Buffer.from(value, 'base64'));
        const decipher = createDecipheriv('aes-256-gcm', this.key(), iv);
        decipher.setAAD(Buffer.from(id)); decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    }
}
