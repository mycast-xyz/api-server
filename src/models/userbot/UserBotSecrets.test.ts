import { describe, it, expect } from 'vitest';
import { UserBotSecrets } from './UserBotSecrets';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
describe('owner-readable user-bot tokens', () => {
    const secrets = new UserBotSecrets(Buffer.alloc(32, 7).toString('base64'));
    it('can be retrieved repeatedly but are not stored in plaintext', () => {
        const value = secrets.mint('bot-a');
        expect(value.token).toMatch(/^mub_[A-Za-z0-9_-]{43}$/);
        expect(value.cipher).not.toContain(value.token);
        expect(value.hash).toHaveLength(64);
        expect(secrets.reveal('bot-a', value.cipher)).toBe(value.token);
        expect(secrets.reveal('bot-a', value.cipher)).toBe(value.token);
        expect(secrets.mint('bot-a').token).not.toBe(value.token);
    });
    it('binds encryption to the bot and rejects wrong keys or modified ciphertext', () => {
        const value = secrets.mint('bot-a');
        expect(() => secrets.reveal('bot-b', value.cipher)).toThrow();
        expect(() => new UserBotSecrets(Buffer.alloc(32, 8).toString('base64')).reveal('bot-a', value.cipher)).toThrow();
        const parts = value.cipher.split('.'); parts[2] = Buffer.alloc(47).toString('base64');
        expect(() => secrets.reveal('bot-a', parts.join('.'))).toThrow();
        expect(() => new UserBotSecrets('').mint('bot-a')).toThrow();
    });
    it('reads the dedicated job key file without changes to existing build environment', () => {
        const directory=mkdtempSync(join(tmpdir(),'mycast-key-'));
        const previous=process.env.USER_BOT_TOKEN_KEY;
        delete process.env.USER_BOT_TOKEN_KEY;
        try {
            const file=join(directory,'token.key');writeFileSync(file,Buffer.alloc(32,9).toString('base64')+'\n');
            const fromFile=new UserBotSecrets(undefined,file), token=fromFile.mint('file-bot');
            expect(new UserBotSecrets(undefined,file).reveal('file-bot',token.cipher)).toBe(token.token);
            expect(()=>new UserBotSecrets(undefined,join(directory,'missing')).mint('a')).toThrow();
        } finally { if(previous===undefined)delete process.env.USER_BOT_TOKEN_KEY;else process.env.USER_BOT_TOKEN_KEY=previous;rmSync(directory,{recursive:true,force:true}); }
    });
});
