import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express = require('express');
import { Server } from 'http';
import { request as httpRequest } from 'http';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import { UploadBucket, VideoRouter } from './VideoRouter';

vi.mock('../../../../models/user/UserDbManager', () => ({
    UserDbManager: class {
        async getIdx(key: string) {
            return /^user[1-9]$/.test(key) ? Number(key.slice(4)) : -1;
        }
    },
}));

describe('video upload rate limits', () => {
    it('shares the aggregate budget across simultaneous uploads', async () => {
        const bucket = new UploadBucket(1000);
        const start = Date.now();
        const signal = new AbortController().signal;
        await Promise.all([
            bucket.take(1500, signal),
            bucket.take(1500, signal),
        ]);
        expect(Date.now() - start).toBeGreaterThanOrEqual(1900);
    });
    it('interrupts a throttled upload promptly on cancellation', async () => {
        const controller = new AbortController();
        const pending = new UploadBucket(1).take(10000, controller.signal);
        controller.abort();
        await expect(pending).rejects.toThrow();
    });
});

describe('video HTTP API', () => {
    let root: string;
    let router: VideoRouter;
    let server: Server;
    let base: string;
    const originalEnv = { ...process.env };
    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(tmpdir(), 'mycast-video-'));
        process.env.VIDEO_DIR = root;
        process.env.VIDEO_STORAGE_BYTES = String(8 * 1024 * 1024);
        router = new VideoRouter();
        const app = express();
        app.use(express.json({ limit: '16kb' }));
        app.use('/video', router.getRouter());
        server = app.listen(0, '127.0.0.1');
        await new Promise<void>((resolve) => server.once('listening', resolve));
        base = `http://127.0.0.1:${(server.address() as any).port}/video`;
    });
    afterEach(async () => {
        router?.dispose();
        if (server)
            await new Promise<void>((resolve) => server.close(() => resolve()));
        await fs.rm(root, { recursive: true, force: true });
        process.env = { ...originalEnv };
    });
    const reserve = (
        base: string,
        user = 'user1',
        bytes = 100,
        name = 'clip.mp4'
    ) =>
        fetch(base + '/uploads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + user,
            },
            body: JSON.stringify({ name, bytes }),
        });
    it('rejects unauthenticated, oversized and non-MP4 reservations', async () => {
        expect((await reserve(base, 'invalid')).status).toBe(401);
        expect(
            (await reserve(base, 'user1', 50 * 1024 * 1024 + 1)).status
        ).toBe(413);
        expect((await reserve(base, 'user1', 100, 'fake.webm')).status).toBe(
            415
        );
        expect((await fs.readdir(path.join(root, 'pending'))).length).toBe(0);
    });
    it('serializes per-user admission and enforces three global reservations', async () => {
        const same = await Promise.all(
            Array.from({ length: 5 }, () => reserve(base))
        );
        expect(same.filter((response) => response.status === 201)).toHaveLength(
            1
        );
        expect(same.filter((response) => response.status === 429)).toHaveLength(
            4
        );
        expect((await reserve(base, 'user2')).status).toBe(201);
        expect((await reserve(base, 'user3')).status).toBe(201);
        expect((await reserve(base, 'user4')).status).toBe(429);
        const { token } = await same
            .find((response) => response.status === 201)!
            .json();
        expect(
            (await fetch(base + '/uploads/' + token, { method: 'DELETE' }))
                .status
        ).toBe(204);
        expect((await reserve(base, 'user1')).status).toBe(201);
    });
    it('rejects mismatched lengths and releases the reservation', async () => {
        const { token } = await (await reserve(base)).json();
        const response = await fetch(base + '/uploads/' + token, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: 'short',
        });
        expect(response.status).toBe(413);
        expect((await reserve(base)).status).toBe(201);
        expect(await fs.readdir(path.join(root, 'pending'))).toHaveLength(0);
    });
    it('does not expose arbitrary file paths', async () => {
        expect((await fetch(base + '/not-a-guid/info')).status).toBe(404);
        expect(
            (
                await fetch(
                    base + '/11111111-1111-1111-1111-111111111111/file.mp4'
                )
            ).status
        ).toBe(404);
    });
    it('accepts the native player origin without allowing arbitrary web origins', async () => {
        const native = await fetch(base + '/policy', {
            headers: { Origin: 'https://mycast-player.invalid' },
        });
        expect(native.status).toBe(200);
        expect(native.headers.get('access-control-allow-origin')).toBe(
            'https://mycast-player.invalid'
        );
        const foreign = await fetch(base + '/policy', {
            headers: { Origin: 'https://attacker.test' },
        });
        expect(foreign.headers.get('access-control-allow-origin')).toBeNull();
    });
    it('reserves processing space before accepting a body', async () => {
        expect((await reserve(base, 'user1', 4 * 1024 * 1024)).status).toBe(
            507
        );
        expect((await reserve(base)).status).toBe(201);
    });
    it('removes a partial file and releases the user slot after disconnect', async () => {
        const { token } = await (
            await reserve(base, 'user1', 1024 * 1024)
        ).json();
        const upload = httpRequest(base + '/uploads/' + token, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': 1024 * 1024,
            },
        });
        upload.on('error', () => {});
        upload.write(Buffer.alloc(8192));
        await new Promise((resolve) => setTimeout(resolve, 50));
        upload.destroy();
        let status = 429;
        for (let i = 0; i < 100 && status === 429; i++) {
            await new Promise((resolve) => setTimeout(resolve, 20));
            status = (await reserve(base)).status;
        }
        expect(status).toBe(201);
        expect(await fs.readdir(path.join(root, 'pending'))).toHaveLength(0);
    });
    it.runIf(!!process.env.FFMPEG_PATH && !!process.env.FFPROBE_PATH)(
        'validates actual MP4, creates poster, serves byte ranges, and removes invalid uploads',
        async () => {
            const sample = path.join(root, 'sample.mp4');
            execFileSync(
                process.env.FFMPEG_PATH!,
                [
                    '-v',
                    'error',
                    '-f',
                    'lavfi',
                    '-i',
                    'color=c=blue:s=160x90:r=10',
                    '-t',
                    '1',
                    '-c:v',
                    'libx264',
                    '-pix_fmt',
                    'yuv420p',
                    sample,
                ],
                { windowsHide: true }
            );
            const body = await fs.readFile(sample);
            const { token } = await (
                await reserve(base, 'user1', body.length)
            ).json();
            const result = await fetch(base + '/uploads/' + token, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/octet-stream' },
                body,
            });
            expect(result.status).toBe(201);
            const info = await result.json();
            expect(info.duration).toBe(1);
            const poster = await fetch(base + '/' + info.id + '/poster.jpg');
            expect(poster.status).toBe(200);
            expect(poster.headers.get('content-type')).toContain('image/jpeg');
            const range = await fetch(base + '/' + info.id + '/file.mp4', {
                headers: { Range: 'bytes=0-99' },
            });
            expect(range.status).toBe(206);
            expect((await range.arrayBuffer()).byteLength).toBe(100);
            expect(
                (
                    await fetch(base + '/' + info.id + '/file.mp4', {
                        headers: { Range: 'bytes=999999999-' },
                    })
                ).status
            ).toBe(416);
            expect((await fetch(base + '/' + info.id + '/watch')).status).toBe(
                200
            );
            expect(
                (
                    await fetch(base + '/' + info.id, {
                        method: 'DELETE',
                        headers: { Authorization: 'Bearer user2' },
                    })
                ).status
            ).toBe(403);
            expect(
                (
                    await fetch(base + '/' + info.id, {
                        method: 'DELETE',
                        headers: { Authorization: 'Bearer user1' },
                    })
                ).status
            ).toBe(204);
            expect((await fetch(base + '/' + info.id + '/info')).status).toBe(
                404
            );
            const bad = await (await reserve(base, 'user1', 5)).json();
            expect(
                (
                    await fetch(base + '/uploads/' + bad.token, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/octet-stream' },
                        body: 'wrong',
                    })
                ).status
            ).toBe(400);
            expect(await fs.readdir(path.join(root, 'pending'))).toHaveLength(
                0
            );
        },
        20000
    );
    it.runIf(!!process.env.FFMPEG_PATH && !!process.env.FFPROBE_PATH)(
        'rejects unsupported codecs and videos longer than three minutes',
        async () => {
            for (const [codec, duration] of [
                ['mpeg4', '1'],
                ['libx264', '181'],
            ]) {
                const sample = path.join(root, codec + '.mp4');
                execFileSync(
                    process.env.FFMPEG_PATH!,
                    [
                        '-v',
                        'error',
                        '-f',
                        'lavfi',
                        '-i',
                        'color=c=blue:s=160x90:r=1',
                        '-t',
                        duration,
                        '-c:v',
                        codec,
                        '-pix_fmt',
                        'yuv420p',
                        sample,
                    ],
                    { windowsHide: true }
                );
                const body = await fs.readFile(sample);
                const { token } = await (
                    await reserve(base, 'user1', body.length)
                ).json();
                expect(
                    (
                        await fetch(base + '/uploads/' + token, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/octet-stream',
                            },
                            body,
                        })
                    ).status
                ).toBe(415);
            }
            expect(await fs.readdir(path.join(root, 'pending'))).toHaveLength(
                0
            );
        },
        20000
    );
});
