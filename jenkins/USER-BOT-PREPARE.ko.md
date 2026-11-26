# user-bot 전용 Jenkins 작업

기존 `vega-api-server`, `vega-main-chat-server`, `vega-web-sveltekit` 설정과 빌드 후처리는 변경하지 않습니다. 새 작업 하나로 신규 기능의 DB·키만 준비합니다. 코드·웹 배포나 서비스 재시작은 하지 않습니다.

## 등록할 내용

- 작업 이름: **vega-user-bot-prepare** (안전 확인 때문에 이 이름을 사용해야 함)
- 종류: Freestyle project
- Git: `https://github.com/mycast-xyz/api-server.git`
- 브랜치: `*/main`
- Boolean 매개변수: `APPLY_USER_BOT_PREPARATION`, 기본값 **false**
- String 매개변수: `API_ENV_FILE`, 기본값 `/var/lib/jenkins/workspace/vega-api-server/.env`
- 동시 빌드 금지. 자동 트리거·다른 작업 실행·결과 파일 공개 없음.
- Execute shell:

```sh
#!/bin/sh
set -eu
umask 077
node -e 'if (+process.versions.node.split(".")[0] < 22) process.exit(1)'
npm ci --ignore-scripts --no-audit --no-fund
node scripts/prepare-user-bot.mjs
```

전체 작업 정의는 `user-bot-prepare.config.xml`입니다. **2026-11-26, 사용자가 로그인한 Edge의 Jenkins 화면에서 `vega-user-bot-prepare`를 생성하고 설정을 저장했습니다.** 작업 상세 화면과 비어 있는 빌드 기록을 확인했습니다. 기본 적용 옵션은 꺼 두고 자동 트리거·후속 작업은 추가하지 않았습니다. 기존 작업은 변경하지 않았고 새 작업도 실행하지 않았습니다. SSH 자격증명을 추출하거나 Jenkins 설정 파일을 직접 수정하지 않았습니다. 저장 후 추가 SSH 읽기 검사는 공유 인증 세션이 없어 실행되지 않았습니다.

## 실행 순서

1. 검토된 API 코드와 새 스크립트가 Git main에 반영되어 있어야 합니다. 현재 로컬 작업만 있는 상태에서 이 작업을 실행하면 스크립트를 찾을 수 없습니다.
2. 새 작업을 **점검 모드**(체크 해제)로 실행합니다. DB 스키마·권한 있는 접속·키 상태를 읽고 보고하며 파일·테이블을 만들지 않습니다. 점검 성공은 준비 완료를 뜻하지 않습니다. 로그의 `ready` 상태와 점검 모드 문구를 확인합니다.
3. 준비 내용을 검토한 뒤 **APPLY_USER_BOT_PREPARATION 체크**로 실행합니다. 기존 API .env는 읽기만 합니다.
4. 성공 메시지 `USER-BOT PREPARATION READY`를 확인하고 기존 API·채팅·웹 작업을 원래 방식으로 빌드합니다. 새 API 코드는 별도 파일의 키를 읽으므로 기존 작업에 키 설정을 추가하지 않습니다.
5. 봇 생성·조회·전송·폐기를 확인하고 Windows 클라이언트를 배포합니다.

현재 feature/user-bot을 main에 푸시하지 않았고 운영 준비 작업도 실행하지 않았습니다. 이 순서는 실제 배포 승인을 받은 뒤 수행합니다.

## 생성되는 자료와 재실행

기본 보관 폴더: `/var/lib/jenkins/mycast-data/user-bot/`

- `backups/*.sql`: 변경 전 대상 DB 전체 mysqldump. 파일 권한 0600. Jenkins 결과물로 공개하지 않음.
- `token.key`: 최초 한 번 생성하는 base64 32바이트 키. 파일 권한 0600. 값을 출력하거나 Git에 넣지 않음.
- `ready.json`: 스키마 준비 완료 기록과 백업 경로. 키 내용 없음.

폴더 권한은 신규 생성 시 0700입니다. 현재 운영 API 프로세스는 UID 0이고 Jenkins 폴더 소유자는 UID 123인 것을 읽기 전용으로 확인했으므로 해당 권한의 키를 API가 읽을 수 있습니다. 별도 실행 계정으로 바꾸는 서버에서는 소유권/ACL을 사전에 정해야 합니다. 키 백업도 별도로 보존하세요.

API는 기존 `USER_BOT_TOKEN_KEY`를 우선하고, 값이 없으면 위 기본 키 파일을 읽습니다. 사용자 지정 경로는 `USER_BOT_TOKEN_KEY_FILE`로 바꿀 수 있으나, 현재 전용 작업 기본 경로와 맞춰야 합니다. 현재 운영에서는 기본 경로를 사용합니다. 빌드마다 .env가 다시 생성되어도 키는 별도 파일에 남습니다.

이미 준비된 상태에서 재실행해도 테이블을 삭제·수정하거나 키를 교체하지 않습니다. 기존 스키마가 다르면 자동 수정하지 않고 실패하며, 토큰이 있는데 키가 없으면 새 키를 만들지 않습니다. 첫 실행이 테이블 한 개만 생성하고 멈춘 경우에는 재실행 시 다시 백업하고 나머지를 준비합니다. 백업 실패 시 DB 변경을 시작하지 않습니다. DB/키 준비 실패 시 이 작업은 실패하며 다른 작업을 자동 실행하지 않습니다.

## 로컬 검증

운영과 같은 MySQL 5.6.33 및 실제 mysqldump, Redis, 로그인 코드, C# 봇을 사용했습니다.

```powershell
$env:MYCAST_TEST_MYSQL56_BIN='F:/MycastServer/.tools/mysql-5.6.33-winx64/bin'
$env:MYCAST_TEST_REDIS_BIN='F:/MycastServer/.tools/redis-5.0.14.1'
node tests/user-bot-local.cjs --full-stack --prepare-job
```

전용 준비 검사 10개 + 기존 통합 검사 24개 = **34개 통과**. 키 파일을 직접 읽는 API 암호화 검사도 통과했습니다. 결과: `F:/MycastServer/user-bot-prepare-job-checks.log`. Jenkins 등록·Linux에서의 실행·운영 DB 적용은 아직 수행하지 않았습니다.
