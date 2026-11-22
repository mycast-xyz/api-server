import { Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes, randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import { BaseRouter } from '../BaseRouter';
import { UserDbManager } from '../../../../models/user/UserDbManager';

type Ticket = {
    user: number;
    name: string;
    bytes: number;
    expires: number;
    receiving: boolean;
};
type Video = {
    id: string;
    owner: number;
    name: string;
    bytes: number;
    duration: number;
    created: number;
    expires: number;
};

function setting(name: string, fallback: number): number {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isSafeInteger(value) || value < 1)
        throw new Error('Invalid video setting: ' + name);
    return value;
}

export const videoPolicy = () => ({
    maxBytes: setting('VIDEO_MAX_BYTES', 50 * 1024 * 1024),
    maxSeconds: setting('VIDEO_MAX_SECONDS', 180),
    userBytesPerSecond: setting('VIDEO_USER_BYTES_PER_SECOND', 1024 * 1024),
    totalBytesPerSecond: setting(
        'VIDEO_TOTAL_BYTES_PER_SECOND',
        5 * 1024 * 1024
    ),
    maxConcurrent: setting('VIDEO_MAX_CONCURRENT', 3),
    storageBytes: setting('VIDEO_STORAGE_BYTES', 2 * 1024 * 1024 * 1024),
    retentionDays: setting('VIDEO_RETENTION_DAYS', 30),
});

// One shared bucket across both HTTP listeners and all active users in this process.
export class UploadBucket {
    private tokens: number;
    private updated = Date.now();
    constructor(private readonly bytesPerSecond: number) {
        this.tokens = bytesPerSecond;
    }
    async take(bytes: number, signal: AbortSignal): Promise<void> {
        while (bytes > 0) {
            signal.throwIfAborted();
            const now = Date.now();
            this.tokens = Math.min(
                this.bytesPerSecond,
                this.tokens +
                    ((now - this.updated) * this.bytesPerSecond) / 1000
            );
            this.updated = now;
            const available = Math.min(bytes, Math.floor(this.tokens));
            this.tokens -= available;
            bytes -= available;
            if (bytes > 0)
                await sleep(
                    Math.max(
                        2,
                        Math.min(50, (bytes * 1000) / this.bytesPerSecond)
                    ),
                    undefined,
                    { signal }
                );
        }
    }
}

function run(
    executable: string,
    args: string[],
    signal: AbortSignal
): Promise<string> {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
        const child = spawn(executable, args, {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let output = '';
        const kill = () => child.kill();
        signal.addEventListener('abort', kill, { once: true });
        const timer = setTimeout(kill, 60000);
        child.stdout.on('data', (chunk) => {
            output += chunk.toString();
            if (output.length > 1024 * 1024) child.kill();
        });
        child.stderr.resume();
        child.once('error', reject);
        child.once('close', (code) => {
            clearTimeout(timer);
            signal.removeEventListener('abort', kill);
            if (code === 0 && !signal.aborted) resolve(output);
            else
                reject(
                    new Error('Unsupported video or media processing failed.')
                );
        });
    });
}

export class VideoRouter extends BaseRouter {
    private readonly policy = videoPolicy();
    private readonly root = path.resolve(
        process.env.VIDEO_DIR || './data/videos'
    );
    private readonly users = new UserDbManager();
    private readonly tickets = new Map<string, Ticket>();
    private readonly busyUsers = new Set<number>();
    private readonly bucket = new UploadBucket(this.policy.totalBytesPerSecond);
    private readonly initialize: Promise<void>;
    private maintenance = Promise.resolve();
    private reserved = 0;
    private used = 0;
    private readonly cleanup: ReturnType<typeof setInterval>;

    private exclusive<T>(action: () => Promise<T>): Promise<T> {
        const result = this.maintenance.then(action);
        this.maintenance = result.then(
            () => {},
            () => {}
        );
        return result;
    }
    public dispose() {
        clearInterval(this.cleanup);
    }

    constructor() {
        super(['https://mycast-player.invalid']);
        this.initialize = this.initializeStorage();
        // Attach a rejection handler immediately, including before the first video request.
        this.initialize.catch(() => {});
        this.cleanup = setInterval(() => {
            this.initialize
                .then(() => this.exclusive(() => this.sweep()))
                .catch(() => {});
        }, 3600000);
        this.cleanup.unref();
        const router = this.getRouter();
        router.get('/policy', (_, res) => res.json(this.policy));
        router.post('/uploads', (req, res) =>
            this.guard(res, () => this.reserve(req, res))
        );
        router.put('/uploads/:token', (req, res) =>
            this.guard(res, () => this.upload(req, res))
        );
        router.delete('/uploads/:token', (req, res) => {
            const ticket = this.tickets.get(req.params.token);
            if (ticket && !ticket.receiving)
                this.release(req.params.token, ticket);
            res.sendStatus(204);
        });
        router.delete('/:id', (req, res) =>
            this.guard(res, async () => {
                const owner = await this.authenticate(req);
                await this.exclusive(async () => {
                    const video = await this.info(req.params.id);
                    if (video.owner !== owner)
                        this.fail(
                            403,
                            '본인이 업로드한 영상만 취소할 수 있습니다.'
                        );
                    await fs.rm(path.join(this.root, video.id), {
                        recursive: true,
                    });
                    await this.sweep();
                });
                res.sendStatus(204);
            })
        );
        router.get('/:id/info', (req, res) =>
            this.guard(res, async () => {
                const { owner, ...info } = await this.info(req.params.id);
                res.json(info);
            })
        );
        router.get('/:id/poster.jpg', (req, res) =>
            this.guard(res, async () => {
                const video = await this.info(req.params.id);
                res.set('Cache-Control', 'private, max-age=300');
                res.sendFile(path.join(this.root, video.id, 'poster.jpg'));
            })
        );
        router.get('/:id/file.mp4', (req, res) =>
            this.guard(res, async () => {
                const video = await this.info(req.params.id);
                res.set({
                    'Cache-Control': 'private, max-age=300',
                    'X-Content-Type-Options': 'nosniff',
                });
                // Express sendFile implements HEAD and byte ranges, including 206 and 416.
                res.sendFile(path.join(this.root, video.id, 'file.mp4'));
            })
        );
        router.get('/:id/watch', (req, res) =>
            this.guard(res, async () => {
                const video = await this.info(req.params.id);
                res.set({
                    'Content-Security-Policy':
                        "default-src 'none'; media-src 'self'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors https://mycast.xyz https://test.mycast.xyz",
                    'X-Content-Type-Options': 'nosniff',
                });
                const title = this.escape(video.name);
                res.type('html').send(
                    `<!doctype html><meta charset="utf-8"><title>${title}</title><meta property="og:title" content="${title}"><meta name="viewport" content="width=device-width"><style>body{margin:0;background:#1f2226;color:white;font:16px sans-serif}video{width:100%;max-height:90vh}p{padding:8px}</style><video controls playsinline preload="none" poster="poster.jpg" src="file.mp4"></video><p>${title} · ${Math.ceil(
                        video.duration
                    )}초 · ${(video.bytes / 1048576).toFixed(1)} MB</p>`
                );
            })
        );
    }

    private async guard(res: Response, action: () => Promise<unknown>) {
        try {
            await this.initialize;
            await action();
        } catch (error) {
            if (!res.headersSent && !res.destroyed) {
                const status = (error as any).status || 400;
                res.status(status).json({
                    error:
                        status >= 500
                            ? '동영상 저장소를 사용할 수 없습니다.'
                            : (error as Error).message,
                });
            }
        }
    }
    private fail(status: number, message: string): never {
        throw Object.assign(new Error(message), { status });
    }
    private escape(text: string) {
        return text.replace(
            /[&<>"']/g,
            (value) =>
                ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;',
                }[value]!)
        );
    }
    private async initializeStorage() {
        await fs.mkdir(this.root, { recursive: true });
        await fs.mkdir(path.join(this.root, 'pending'), { recursive: true });
        for (const name of await fs.readdir(path.join(this.root, 'pending')))
            await fs.rm(path.join(this.root, 'pending', name), {
                recursive: true,
                force: true,
            });
        await this.sweep();
    }
    private async sweep() {
        let used = 0;
        for (const id of await fs.readdir(this.root)) {
            if (!/^[a-f0-9-]{36}$/.test(id)) continue;
            const directory = path.join(this.root, id);
            try {
                const video: Video = JSON.parse(
                    await fs.readFile(path.join(directory, 'info.json'), 'utf8')
                );
                if (video.expires <= Date.now()) {
                    await fs.rm(directory, { recursive: true });
                    continue;
                }
                for (const name of await fs.readdir(directory))
                    used += (await fs.stat(path.join(directory, name))).size;
            } catch {
                // Failed deletion (for example an active Windows reader) still occupies storage.
                for (const name of await fs.readdir(directory))
                    used += (await fs.stat(path.join(directory, name))).size;
            }
        }
        this.used = used;
    }
    private release(token: string, ticket: Ticket) {
        if (!this.tickets.delete(token)) return;
        this.busyUsers.delete(ticket.user);
        this.reserved -= ticket.bytes * 2 + 2 * 1024 * 1024;
    }
    private async authenticate(req: Request): Promise<number> {
        const key = /^Bearer ([^\s]{1,256})$/.exec(
            req.get('Authorization') || ''
        )?.[1];
        if (!key) this.fail(401, '로그인이 필요합니다.');
        const user = await this.users.getIdx(key!);
        if (!Number.isSafeInteger(user) || user < 1)
            this.fail(401, '로그인이 필요합니다.');
        return user;
    }
    private async reserve(req: Request, res: Response) {
        const user = await this.authenticate(req);
        const bytes = req.body?.bytes;
        const name = req.body?.name;
        if (
            !Number.isSafeInteger(bytes) ||
            bytes < 1 ||
            bytes > this.policy.maxBytes
        )
            this.fail(413, '동영상 파일 크기 제한을 초과했습니다.');
        if (
            typeof name !== 'string' ||
            name.length > 200 ||
            !/\.mp4$/i.test(name)
        )
            this.fail(415, 'MP4 파일을 선택해 주세요.');
        await this.exclusive(async () => {
            for (const [token, ticket] of this.tickets)
                if (!ticket.receiving && ticket.expires < Date.now())
                    this.release(token, ticket);
            if (
                this.busyUsers.has(user) ||
                this.tickets.size >= this.policy.maxConcurrent
            )
                this.fail(
                    429,
                    '업로드가 진행 중입니다. 잠시 후 다시 시도해 주세요.'
                );
            // Serialize quota refreshes. No uploads are admitted while an old refresh can overwrite usage.
            await this.sweep();
            if (
                this.busyUsers.has(user) ||
                this.tickets.size >= this.policy.maxConcurrent
            )
                this.fail(
                    429,
                    '업로드가 진행 중입니다. 잠시 후 다시 시도해 주세요.'
                );
            const allocation = bytes * 2 + 2 * 1024 * 1024;
            if (
                this.used + this.reserved + allocation >
                this.policy.storageBytes
            )
                this.fail(507, '동영상 저장 용량이 부족합니다.');
            const disk = await fs.statfs(this.root);
            if (disk.bavail * disk.bsize < allocation + 128 * 1024 * 1024)
                this.fail(507, '디스크 공간이 부족합니다.');
            // Recheck after asynchronous disk access.
            if (
                this.busyUsers.has(user) ||
                this.tickets.size >= this.policy.maxConcurrent ||
                this.used + this.reserved + allocation >
                    this.policy.storageBytes
            )
                this.fail(429, '업로드가 진행 중입니다.');
            const token = randomBytes(32).toString('hex');
            this.tickets.set(token, {
                user,
                name: path.basename(name).replace(/[\x00-\x1f]/g, ''),
                bytes,
                expires: Date.now() + 60000,
                receiving: false,
            });
            this.busyUsers.add(user);
            this.reserved += allocation;
            res.set('Cache-Control', 'no-store').status(201).json({ token });
        });
    }
    private async upload(req: Request, res: Response) {
        const token = req.params.token;
        const ticket = this.tickets.get(token);
        if (!ticket || ticket.receiving || ticket.expires < Date.now())
            this.fail(410, '업로드 요청이 만료되었습니다.');
        ticket!.receiving = true;
        const id = randomUUID();
        const directory = path.join(this.root, 'pending', id);
        let committed = false;
        const abort = new AbortController();
        const timeout = setTimeout(() => {
            abort.abort();
            req.destroy();
        }, 15 * 60 * 1000);
        const disconnected = () => {
            if (res.writableFinished) return;
            abort.abort();
            if (committed)
                this.exclusive(async () => {
                    await fs.rm(path.join(this.root, id), {
                        recursive: true,
                        force: true,
                    });
                    await this.sweep();
                }).catch(() => {});
        };
        res.once('close', disconnected);
        try {
            if (
                req.get('Content-Type')?.split(';')[0] !==
                'application/octet-stream'
            )
                this.fail(415, '잘못된 전송 형식입니다.');
            const length = req.get('Content-Length');
            if (length && Number(length) !== ticket!.bytes)
                this.fail(413, '파일 크기가 일치하지 않습니다.');
            if (req.get('Content-Encoding'))
                this.fail(415, '압축된 요청은 지원하지 않습니다.');
            await fs.mkdir(directory);
            const input = path.join(directory, 'input.mp4');
            const output = await fs.open(input, 'wx');
            let written = 0;
            const userBucket = new UploadBucket(this.policy.userBytesPerSecond);
            try {
                for await (const chunk of req) {
                    if (written + chunk.length > ticket!.bytes)
                        this.fail(413, '파일 크기 제한을 초과했습니다.');
                    for (
                        let offset = 0;
                        offset < chunk.length;
                        offset += 16384
                    ) {
                        const piece = chunk.subarray(offset, offset + 16384);
                        await userBucket.take(piece.length, abort.signal);
                        await this.bucket.take(piece.length, abort.signal);
                        let position = 0;
                        while (position < piece.length) {
                            const result = await output.write(
                                piece,
                                position,
                                piece.length - position
                            );
                            if (result.bytesWritten === 0)
                                throw new Error('Cannot write video file.');
                            position += result.bytesWritten;
                        }
                    }
                    written += chunk.length;
                }
            } finally {
                await output.close();
            }
            if (written !== ticket!.bytes)
                this.fail(400, '전송이 완료되지 않았습니다.');
            const probe = JSON.parse(
                await run(
                    process.env.FFPROBE_PATH || 'ffprobe',
                    [
                        '-v',
                        'error',
                        '-protocol_whitelist',
                        'file,pipe',
                        '-f',
                        'mov',
                        '-show_streams',
                        '-show_format',
                        '-of',
                        'json',
                        input,
                    ],
                    abort.signal
                )
            );
            const streams = probe.streams || [];
            const video = streams.filter(
                (stream: any) => stream.codec_type === 'video'
            );
            const audio = streams.filter(
                (stream: any) => stream.codec_type === 'audio'
            );
            const duration = Number(probe.format?.duration);
            if (
                video.length !== 1 ||
                video[0].codec_name !== 'h264' ||
                !(
                    video[0].width > 0 &&
                    video[0].width <= 3840 &&
                    video[0].height > 0 &&
                    video[0].height <= 2160
                ) ||
                audio.length > 1 ||
                audio.some((stream: any) => stream.codec_name !== 'aac') ||
                !Number.isFinite(duration) ||
                duration <= 0 ||
                duration > this.policy.maxSeconds
            )
                this.fail(
                    415,
                    'H.264/AAC MP4이며 길이 제한 이내인 동영상을 선택해 주세요.'
                );
            const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
            const media = path.join(directory, 'file.mp4');
            await run(
                ffmpeg,
                [
                    '-v',
                    'error',
                    '-nostdin',
                    '-protocol_whitelist',
                    'file,pipe',
                    '-f',
                    'mov',
                    '-i',
                    input,
                    '-map',
                    '0:v:0',
                    '-map',
                    '0:a:0?',
                    '-c',
                    'copy',
                    '-map_metadata',
                    '-1',
                    '-movflags',
                    '+faststart',
                    media,
                ],
                abort.signal
            );
            const poster = path.join(directory, 'poster.jpg');
            await run(
                ffmpeg,
                [
                    '-v',
                    'error',
                    '-nostdin',
                    '-protocol_whitelist',
                    'file,pipe',
                    '-f',
                    'mov',
                    '-i',
                    media,
                    '-frames:v',
                    '1',
                    '-vf',
                    'scale=480:270:force_original_aspect_ratio=decrease',
                    '-update',
                    '1',
                    poster,
                ],
                abort.signal
            );
            await fs.unlink(input);
            const bytes = (await fs.stat(media)).size;
            if (bytes > this.policy.maxBytes)
                this.fail(413, '저장할 동영상 크기 제한을 초과했습니다.');
            const info: Video = {
                id,
                owner: ticket!.user,
                name: ticket!.name,
                bytes,
                duration,
                created: Date.now(),
                expires: Date.now() + this.policy.retentionDays * 86400000,
            };
            await fs.writeFile(
                path.join(directory, 'info.json'),
                JSON.stringify(info),
                { flag: 'wx' }
            );
            const storage =
                bytes +
                (await fs.stat(poster)).size +
                (await fs.stat(path.join(directory, 'info.json'))).size;
            abort.signal.throwIfAborted();
            // Do not race quota sweeps with committing a new directory.
            await this.exclusive(async () => {
                abort.signal.throwIfAborted();
                if (storage > ticket!.bytes + 2 * 1024 * 1024)
                    this.fail(413, '처리된 동영상 용량이 너무 큽니다.');
                await fs.rename(directory, path.join(this.root, id));
                if (abort.signal.aborted) {
                    await fs.rm(path.join(this.root, id), {
                        recursive: true,
                        force: true,
                    });
                    abort.signal.throwIfAborted();
                }
                committed = true;
                this.used += storage;
            });
            const { owner, ...publicInfo } = info;
            res.status(201).json(publicInfo);
        } finally {
            clearTimeout(timeout);
            res.removeListener('close', disconnected);
            await fs
                .rm(directory, { recursive: true, force: true })
                .catch(() => {});
            this.release(token, ticket!);
        }
    }
    private async info(id: string): Promise<Video> {
        if (!/^[a-f0-9-]{36}$/.test(id))
            this.fail(404, '동영상을 찾을 수 없습니다.');
        let video: Video;
        try {
            video = JSON.parse(
                await fs.readFile(path.join(this.root, id, 'info.json'), 'utf8')
            );
        } catch {
            return this.fail(404, '동영상을 찾을 수 없습니다.');
        }
        if (video.expires <= Date.now())
            this.fail(410, '보관 기간이 만료된 동영상입니다.');
        return video;
    }
}
