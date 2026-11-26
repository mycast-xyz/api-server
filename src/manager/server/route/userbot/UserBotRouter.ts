import { Request, Response } from 'express';
import { BaseRouter } from '../BaseRouter';
import { UserBotRepository } from '../../../../models/userbot/UserBotRepository';

export class UserBotRouter extends BaseRouter {
    constructor(private readonly repository = new UserBotRepository()) {
        super();
        const router = this.getRouter();
        router.use((_, res, next) => { res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); next(); });
        router.get('/', (req, res) => this.run(req, res, key => this.repository.list(key)));
        router.post('/', (req, res) => this.run(req, res, key => {
            const { name, icon } = this.profile(req); return this.repository.create(key, name, icon);
        }, 201));
        router.patch('/:id', (req, res) => this.run(req, res, key => {
            const { name, icon } = this.profile(req); return this.repository.update(key, this.id(req), name, icon);
        }, 204));
        router.get('/:id/token', (req, res) => this.run(req, res, key => this.repository.token(key, this.id(req))));
        router.put('/:id/token', (req, res) => this.run(req, res, key => this.repository.rotate(key, this.id(req))));
        router.delete('/:id/token', (req, res) => this.run(req, res, key => this.repository.revoke(key, this.id(req)), 204));
        router.delete('/:id', (req, res) => this.run(req, res, key => this.repository.revoke(key, this.id(req), true), 204));
    }
    private id(req: Request) {
        if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(req.params.id)) throw Object.assign(new Error('잘못된 user-bot ID입니다.'), { status: 400 });
        return req.params.id;
    }
    private profile(req: Request) {
        const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
        const icon = typeof req.body?.icon === 'string' ? req.body.icon.trim() : '';
        if (!name || name.length > 32 || /[\x00-\x1f\x7f]/.test(name) || icon.length > 1000) throw Object.assign(new Error('이름은 1~32자로 입력해 주세요.'), { status: 400 });
        if (icon) {
            let url: URL; try { url = new URL(icon); } catch { throw Object.assign(new Error('올바른 이미지 URL을 입력해 주세요.'), { status: 400 }); }
            if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw Object.assign(new Error('HTTP(S) 이미지 URL만 사용할 수 있습니다.'), { status: 400 });
        }
        return { name, icon };
    }
    private async run(req: Request, res: Response, action: (key: string) => Promise<unknown>, status = 200) {
        try {
            const key = /^Bearer ([^\s]{1,256})$/.exec(req.get('Authorization') || '')?.[1];
            if (!key) { res.status(401).json({ error: '소유자 계정으로 로그인해 주세요.' }); return; }
            const result = await action(key);
            if (status === 204) res.sendStatus(204); else res.status(status).json(result);
        } catch (error) {
            const status = (error as any).status || 503;
            res.status(status).json({ error: status === 503 ? 'user-bot 저장소 또는 암호화 키를 준비하지 못했습니다.' : (error as Error).message });
        }
    }
}
