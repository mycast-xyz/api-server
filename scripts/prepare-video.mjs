// Run by Jenkins after compiling. Keeps runtime data outside the SCM workspace.
import { mkdir, readFile, writeFile, mkdtemp, access, rename, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
if (process.platform !== 'linux' || !process.env.JENKINS_HOME ||
    resolve(process.env.WORKSPACE || '') !== process.cwd()) {
    throw new Error('Run this deployment preparation inside the Linux Jenkins checkout.');
}
const home = resolve(process.env.JENKINS_HOME);
const tools = join(home, 'tools/mycast-video/ffmpeg-9.0');
const data = join(home, 'mycast-data/videos');
await mkdir(data, { recursive: true, mode: 0o750 });
const ffmpeg = join(tools, 'bin/ffmpeg');
const ffprobe = join(tools, 'bin/ffprobe');
try { await access(ffmpeg); await access(ffprobe); }
catch {
    await mkdir(join(home, 'tools/mycast-video'), { recursive: true });
    const temp = await mkdtemp(join(home, 'tools/mycast-video/download-'));
    try {
        const name = 'ffmpeg-n9.0-latest-linux64-gpl-9.0.tar.xz';
        const base = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/';
        const sums = await fetch(base + 'checksums.sha256', { signal: AbortSignal.timeout(60000) });
        if (!sums.ok) throw new Error('Cannot download media tools checksum.');
        const expected = (await sums.text()).split(/\r?\n/).map(line => line.trim().split(/\s+/))
            .find(parts => parts[1]?.replace(/^\*/, '') === name)?.[0];
        if (!expected || !/^[a-f0-9]{64}$/i.test(expected)) throw new Error('Missing media tools checksum.');
        const response = await fetch(base + name, { signal: AbortSignal.timeout(300000) });
        if (!response.ok || !response.body) throw new Error('Cannot download media tools.');
        const archive = join(temp, 'tools.tar.xz');
        const digest = createHash('sha256');
        await pipeline(Readable.fromWeb(response.body), async function* (source) {
            let bytes = 0;
            for await (const chunk of source) {
                bytes += chunk.length;
                if (bytes > 500 * 1024 * 1024) throw new Error('Media tools archive is too large.');
                digest.update(chunk); yield chunk;
            }
        }, createWriteStream(archive, { flags: 'wx', mode: 0o600 }));
        if (digest.digest('hex') !== expected.toLowerCase()) throw new Error('Media tools checksum mismatch.');
        const unpacked = join(temp, 'unpacked'); await mkdir(unpacked);
        execFileSync('tar', ['-xJf', archive, '--strip-components=1', '-C', unpacked]);
        for (const name of ['ffmpeg', 'ffprobe']) execFileSync(join(unpacked, 'bin', name), ['-version'], { stdio: 'ignore' });
        await writeFile(join(unpacked, 'source.sha256'), expected + '\n');
        await rename(unpacked, tools);
    } finally { await rm(temp, { recursive: true, force: true }); }
}
for (const executable of [ffmpeg, ffprobe]) {
    console.log(execFileSync(executable, ['-version'], { encoding: 'utf8' }).split('\n')[0]);
}
const settings = { VIDEO_DIR: data, FFMPEG_PATH: ffmpeg, FFPROBE_PATH: ffprobe,
    VIDEO_MAX_BYTES: '52428800', VIDEO_MAX_SECONDS: '180', VIDEO_USER_BYTES_PER_SECOND: '1048576',
    VIDEO_TOTAL_BYTES_PER_SECOND: '5242880', VIDEO_MAX_CONCURRENT: '3',
    VIDEO_STORAGE_BYTES: '2147483648', VIDEO_RETENTION_DAYS: '30' };
let env = '';
try { env = await readFile('.env', 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
// Only add these feature's missing settings; never print or replace existing DB/TLS credentials.
for (const [key, value] of Object.entries(settings)) {
    if (!new RegExp('^\\s*' + key + '\\s*=', 'm').test(env)) env += '\n' + key + '=' + JSON.stringify(value);
}
await writeFile('.env', env + '\n', { mode: 0o600 });
console.log('Video tools and persistent storage prepared by Jenkins.');
