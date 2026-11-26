# user-bot 로컬 구현 및 검증

서버 소스의 기준 경로는 `F:/MycastServer/`입니다. API, `vega-chat-server`, `web-client`와 Windows `F:/Mycast/`의 `feature/user-bot` 작업을 함께 검토해야 합니다. 현재 커밋·푸시·운영 DB 변경·Jenkins 배포는 하지 않았습니다.

## 구현 범위

- 기존 봇과 별도로 계정당 최대 3개 생성, 이름·이미지 수정, 삭제.
- 소유자는 웹 프로필 메뉴의 **내 봇**, Windows 설정의 **내 봇**에서 현재 토큰을 다시 조회·복사할 수 있음.
- 토큰은 `mub_` 접두사와 32바이트 난수. 서버 DB에는 AES-256-GCM 암호문 및 SHA256 검증값을 보관. 일반 목록에 토큰을 포함하지 않음.
- 기본 만료 없음. 재발급은 구 토큰을 교체하고, 폐기는 암호문을 비움. 소유자 비활성화·삭제도 인증을 차단.
- 채팅은 기존 봇 아이콘과 소유자 닉네임 표시. 기존 시스템 봇 권한과 분리. 과거 기록은 삭제하지 않음.

## API

모든 요청은 소유자 `Authorization: Bearer <private_key>`로 인증합니다. 응답은 `Cache-Control: no-store`입니다. 봇 토큰으로 계정 관리 API를 사용할 수 없습니다.

| 요청 | 동작 |
|---|---|
| GET /user-bots | 내 봇 목록 |
| POST /user-bots | 생성 (`name`, `icon`) |
| PATCH /user-bots/:id | 프로필 변경 (`name`, `icon`) |
| GET /user-bots/:id/token | 현재 토큰 재조회 |
| PUT /user-bots/:id/token | 토큰 재발급 |
| DELETE /user-bots/:id/token | 토큰 폐기 |
| DELETE /user-bots/:id | 봇 삭제·토큰 폐기 |

암호화 키는 base64로 인코딩한 난수 32바이트이며 API 프로세스에만 필요합니다. 기존 `USER_BOT_TOKEN_KEY` 환경값을 우선하고, 없으면 전용 Jenkins 작업이 만드는 `/var/lib/jenkins/mycast-data/user-bot/token.key`를 읽습니다. 키가 없으면 발급·복호화를 실패 처리하며 다른 API나 기존 봇을 중단하지 않습니다. 이 키는 백업과 함께 보관해야 합니다. 키를 잃으면 토큰 재발급이 필요합니다. 채팅 서버는 해시 검증만 하므로 복호화 키가 필요 없습니다. 키·토큰을 저장소나 배포 파일에 포함하지 마세요.

## 로컬 재검증

1. 두 서버 저장소의 의존성을 설치합니다. 채팅 서버의 기존 pnpm 8 잠금 파일을 유지합니다.
2. API 저장소에서 `MYCAST_TEST_MARIADB_BIN`을 Windows MariaDB의 `bin` 폴더로 지정한 뒤 `node tests/user-bot-local.cjs`를 실행합니다.
3. 테스트는 루프백 13316 포트에 독립 MariaDB를 띄웁니다. 포트가 사용 중이면 중단하며 기존 DB에 연결하지 않습니다. 테스트용 `.user-bot-lab/db` 및 `mycast_user_bot_lab` DB만 사용하고, 이 테스트 DB는 매번 재생성합니다.
4. 기본 모드는 Redis 전송과 기존 사용자 로그인을 대체합니다. 실제 종속성을 검사하려면 `MYCAST_TEST_REDIS_BIN`을 Windows Redis bin 경로로 지정하고 `--full-stack`을 추가합니다. 실제 Express/Passport 로그인·SQL 사용자 조회·Redis 저장/복원을 사용합니다. 로그인 시작 코드의 고정 포트/TLS 바인딩만 제외하며, 인증·세션 코드는 그대로 실행합니다. 운영 데이터나 자격증명은 사용하지 않습니다.
5. 웹: `node tests/video-ui/user-bot-review.mjs`, 단위 검사 `node node_modules/vitest/vitest.mjs run src/app/model/chat/UserBotIdentity.test.ts --threads=false`.
6. Windows: `dotnet run --project outputs/MyCast.Native/checks/NativeChecks/NativeChecks.csproj -c Release -- --user-bot-only`. 창을 표시하지 않는 검사입니다.

확인 결과: SQL/HTTP/WebSocket 20개 검사, 암호화 단위 검사 2개, Windows 55개 검사 통과. 웹 실제 컴포넌트 검사 및 기존 첨부·툴바 검사 통과. API·채팅 서버 컴파일, 웹 빌드, Windows 컴파일 통과. 웹 전체 정적 검사는 기존 오류 10개가 있어 전체 통과로 보고하지 않습니다.

### 2026-11-25 추가 검증

- **MySQL 5.6.33 + 실제 Redis 5.0.14.1 + 실제 로그인 코드 + C# 봇 예제**로 통합 검사 **24개 통과**. SQL 생성·조회·프로필 소유권·재발급·폐기·비활성 소유자·잘못된 메시지·최근 기록 복원·기존 봇/일반 채팅을 검사했습니다.
- MySQL은 운영과 같은 버전이며 Antelope, large_prefix OFF, latin1 서버 기본값, 운영과 같은 sql_mode로 실행했습니다. 새 두 테이블은 자체 utf8mb4 지정으로 생성했습니다. 운영 데이터는 복사하지 않고 최소 테스트 사용자 테이블을 사용했습니다.
- 실행: `MYCAST_TEST_MYSQL56_BIN=F:/MycastServer/.tools/mysql-5.6.33-winx64/bin`, `MYCAST_TEST_REDIS_BIN=F:/MycastServer/.tools/redis-5.0.14.1`을 환경에 지정하고 `node tests/user-bot-local.cjs --full-stack`. MariaDB 대신 별도 MySQL 데이터 경로를 사용하며 검사 후 자신이 띄운 DB·Redis를 종료합니다.
- 실제 로그인 검사를 위해 DB 호스트·포트와 Redis URL을 선택 설정할 수 있게 했습니다. 미지정 시 기존 localhost/기본 포트를 유지합니다. 로그인 저장소의 오래된 pnpm 잠금 파일을 기존 package.json의 Passport 0.7/Node 타입 22 요구와 맞췄습니다. 런타임 요구 버전을 새로 올린 것은 아닙니다.
- API의 전체 단위/HTTP 검사 **13개**, 채팅 서버의 기존 단위 검사 **8개** 통과. pnpm 채팅 의존성에서 기존 Vitest 실행 시 vite 탐색이 실패하여 `NODE_PATH=F:/MycastServer/vega-chat-server/node_modules/.pnpm/vitest@0.28.5/node_modules`을 지정했습니다. 별도 패키지 추가 없이 기존 설치본을 사용했습니다.
- 결과 로그: `F:/MycastServer/user-bot-mysql56-full-stack.log`, `user-bot-api-regression.log`, `user-bot-chat-regression.log`. 검사 중 발견한 로컬 세션 작업 경로·테스트 DB 초기 데이터 추출·C# 콘솔 인코딩 문제는 수정하고 재검사했습니다.

## 운영 전 남은 확인 및 배포 절차

현재 결과는 기존 전체 서버를 복제해 통과시켰다는 뜻은 아닙니다. 실제 종속성 및 C# 봇 통합 검사는 완료했으나 운영 데이터·Linux 런타임·공개 TLS/프록시와 배포 후 실제 웹/Windows 사용자 조작은 별도 확인이 필요합니다. 현재 공개 서버에는 새 API가 없으므로 앱의 내 봇 관리에서 오류가 발생하는 것이 정상입니다.

사용자 검토 후 Git/Jenkins 경로로만 배포합니다. SSH로 운영 파일을 직접 고치거나 업로드하지 않습니다.

1. Git에 들어 있는 전용 `vega-user-bot-prepare` 작업을 점검 모드로 실행 후 적용 모드로 실행. DB 백업·새 두 테이블·영구 키를 준비. [작업 등록 안내](../jenkins/USER-BOT-PREPARE.ko.md).
2. 전용 작업 성공을 확인. 기존 API·채팅·웹 Jenkins 설정과 PM2 명령은 변경하지 않음. API는 별도 키 파일을 직접 읽음.
3. API와 채팅 서버 코드를 Git에서 배포하고 발급·접속·폐기를 확인.
4. 웹·Windows 클라이언트를 배포하고 소유자 표시·관리 UI를 확인.
5. 문제 시 이전 API·채팅·클라이언트 커밋으로 되돌림. 추가 테이블은 보존하되 신규 기능 사용 중단. 키를 보존하고 복구할 수 있게 관리.

개별 호출은 새 테이블이 없으면 503/UNAVAILABLE로 닫힙니다. 로컬 검사에서 이 상태에도 기존 사용자와 기존 봇의 채팅은 계속 동작함을 확인했습니다. 단, 실제 운영 환경에서 전체 기능이 영향 없음을 보장하는 검증은 배포 전 별도 필요합니다.

현재 Jenkins로 충분한지에 대한 운영 읽기 전용 확인 결과는 [배포 준비 점검](user-bot-deployment-review.md)에 정리했습니다.
