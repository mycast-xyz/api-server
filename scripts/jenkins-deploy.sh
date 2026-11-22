#!/usr/bin/env bash
set -euo pipefail
test -n "${JENKINS_HOME:-}"
test "${WORKSPACE:?}" = "$PWD"
NODE="$(command -v node)"
"$NODE" -e 'if (+process.versions.node.split(".")[0] < 22) throw Error("Node.js 22 or newer is required")'
npm install
npm run build
"$NODE" scripts/prepare-video.mjs
FFMPEG_PATH="$JENKINS_HOME/tools/mycast-video/ffmpeg-9.0/bin/ffmpeg" \
FFPROBE_PATH="$JENKINS_HOME/tools/mycast-video/ffmpeg-9.0/bin/ffprobe" npm test
sudo pm2 jlist | "$NODE" -e '
let input=""; process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
 const api=JSON.parse(input).filter(p => p.name === "api");
 if(api.length !== 1 || api[0].pm2_env.exec_mode !== "fork_mode")
   throw Error("Video quota requires one API fork process");
});'
# The existing API uses root PM2. Explicitly select the build's current Node runtime.
sudo pm2 restart api --interpreter "$NODE"
sudo pm2 jlist | "$NODE" -e '
let input=""; process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
 const api=JSON.parse(input).find(p => p.name === "api");
 if(!api || +api.pm2_env.node_version.split(".")[0] < 22)
   throw Error("API did not restart with Node.js 22 or newer");
});'
"$NODE" scripts/check-video.mjs
sudo pm2 save
