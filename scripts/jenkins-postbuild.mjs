// Keep the existing Jenkins `npm run build; sudo pm2 reload api` configuration.
// On developer machines a build remains a compile-only operation.
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
if (process.env.JENKINS_HOME && resolve(process.env.WORKSPACE || '') === process.cwd()) {
    if (+process.versions.node.split('.')[0] < 22) throw new Error('Jenkins requires Node.js 22 or newer.');
    await import('./prepare-video.mjs');
    const video = dotenv.parse(await readFile('.env'));
    execFileSync('npm', ['test'], { stdio: 'inherit', env: {
        ...process.env, FFMPEG_PATH: video.FFMPEG_PATH, FFPROBE_PATH: video.FFPROBE_PATH
    } });
    const list = JSON.parse(execFileSync('sudo', ['-n', 'pm2', 'jlist'], { encoding: 'utf8' }));
    const api = list.filter(item => item.name === 'api');
    if (api.length !== 1 || api[0].pm2_env.exec_mode !== 'fork_mode')
        throw new Error('Video quotas require exactly one API fork process.');
    const environment = api[0].pm2_env;
    if (resolve(environment.pm_cwd) !== process.cwd())
        throw new Error('The running API does not belong to this Jenkins workspace.');
    if (environment.exec_interpreter !== process.execPath ||
        +String(environment.node_version || '0').split('.')[0] < 22) {
        // One-time runtime migration; subsequent builds use the existing Jenkins reload.
        execFileSync('sudo', ['-n', 'pm2', 'restart', 'api', '--interpreter', process.execPath], { stdio: 'inherit' });
        await import('./check-video.mjs');
    }
}
