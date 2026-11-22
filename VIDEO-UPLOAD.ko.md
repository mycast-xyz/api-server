# 채팅 동영상 첨부

기존 API 서버의 `/video` 경로에 업로드와 재생 파일 제공을 추가한다. 별도 서버나 외부 저장소는 사용하지 않는다. 웹과 Windows 앱은 업로드 완료 후 **보내기**를 눌렀을 때만 일반 채팅 메시지로 `/video/{id}/watch` 링크를 보낸다. 새 클라이언트는 이 링크를 채팅 안의 동영상 카드로 표시하고, 구버전에서는 링크를 열어 볼 수 있다. 채팅 서버나 DB 스키마 변경은 필요하지 않다. 실제 채팅 서버의 링크 변환 및 기록 재접속 호환성은 배포 전 스테이징에서 확인한다.

## 기본 정책

| 설정 | 기본값 | 의미 |
|---|---:|---|
| `VIDEO_MAX_BYTES` | 52428800 | 원본 및 최종 MP4 최대 50 MiB |
| `VIDEO_MAX_SECONDS` | 180 | 최대 3분 |
| `VIDEO_USER_BYTES_PER_SECOND` | 1048576 | 사용자당 지속 업로드 속도 1 MiB/s |
| `VIDEO_TOTAL_BYTES_PER_SECOND` | 5242880 | 이 프로세스 전체 지속 업로드 속도 5 MiB/s |
| `VIDEO_MAX_CONCURRENT` | 3 | 업로드 예약·수신·검사를 합친 최대 동시 작업 수 |
| `VIDEO_STORAGE_BYTES` | 2147483648 | 업로드 임시 공간까지 예약하는 저장 용량 상한 2 GiB |
| `VIDEO_RETENTION_DAYS` | 30 | 영상 보관 기간 |
| `VIDEO_DIR` | `./data/videos` | 영구 저장 경로. 운영에서는 절대 경로를 지정 |
| `FFMPEG_PATH` | `ffmpeg` | FFmpeg 실행 파일 경로 |
| `FFPROBE_PATH` | `ffprobe` | FFprobe 실행 파일 경로 |

정수 설정은 양의 정수여야 한다. 변경 후 서버를 재시작한다. 웹과 앱의 파일 선택 상한도 50 MiB이므로 서버 상한을 더 크게 바꾸려면 클라이언트도 함께 변경한다. 사용자당 동시 업로드는 1개다. 예약은 60초, 수신 전체는 15분, 각 미디어 검사 작업은 60초 후 만료한다. 처리 중 원본·결과·썸네일 공간을 미리 예약하고, 디스크 여유 128 MiB도 확보한다.

H.264 영상 1개와 선택적인 AAC 오디오 1개가 들어 있는 MP4만 받는다. 최대 영상 크기는 3840×2160이다. 확장자 외에도 FFprobe로 내부 형식과 길이를 검사한다. FFmpeg로 재인코딩하지 않고 메타데이터를 제거하고 faststart로 재포장하며 JPEG 썸네일을 만든다. 임의 URL 입력은 받지 않는다. 실패·중단된 임시 파일은 정리하며, 재시작 때 남은 임시 파일도 지운다. 미전송 완료 파일은 클라이언트 취소 시 업로더 인증으로 삭제한다. 클라이언트 강제 종료·통신 단절로 삭제 요청 자체가 도달하지 못한 파일은 보관 기한에 정리된다.

만료 영상은 즉시 410으로 응답한다. 저장 파일 정리는 시작 시·새 업로드 예약 시·1시간마다 수행한다. Windows에서 파일이 열려 있어 삭제에 실패하면 다음 정리 때 다시 시도하며, 차지하는 용량은 계속 계산한다. 자동 삭제는 해당 디렉터리 안의 UUID 동영상 폴더와 `pending`에만 적용되므로 **전용 디렉터리**를 지정한다.

## 설치 및 배포 순서

### 운영 Jenkins 진입점

운영 서버 파일을 SSH로 수정하거나 로컬 산출물을 복사하지 않는다. 이 저장소의 `main`을 체크아웃하는 **vega-api-server** 작업을 기존 설정 그대로 빌드한다. 기존 `npm install → npm run build → sudo pm2 reload api` 명령은 변경하지 않는다.

`npm run build`의 `postbuild`에서 `scripts/jenkins-postbuild.mjs`가 실행된다. Jenkins 환경에서만 설정·도구 준비·실제 미디어 자동 검사·단일 API 프로세스 확인을 수행한다. 로컬 빌드는 컴파일만 한다. 기존 API 인터프리터가 현재 빌드의 Node.js와 다르거나 버전이 22 미만일 때만, 기존 `sudo pm2` 권한으로 API 인터프리터를 변경·재시작하고 상태를 확인한다. 첫 적용에서는 이 재시작과 기존 Jenkins reload가 이어질 수 있다. 이후에는 기존 reload만 수행한다. 다른 서비스는 재시작하지 않는다. Jenkins 자체의 Node.js가 22 미만이면 작업을 중단한다.

`prepare-video.mjs`가 Jenkins 작업 안에서만 전용 저장소 `$JENKINS_HOME/mycast-data/videos`를 만들고 기존 `.env`의 DB/TLS 설정을 보존한 채 없는 VIDEO 설정을 추가한다. 기존 시스템 FFmpeg 4.2는 변경하지 않고, 별도의 FFmpeg 9.0 빌드를 FFmpeg 공식 안내에 연결된 BtbN 제공처에서 받아 배포 체크섬 검증 후 `$JENKINS_HOME/tools/mycast-video/ffmpeg-9.0`에 설치한다. 첫 설치 시 외부 다운로드가 필요하며 이후 빌드에서는 도구를 재사용한다. 라이선스·문서를 포함한 배포 디렉터리를 유지한다.

실패 시 Windows 앱 릴리스를 게시하지 않는다. 코드 복구는 이 변경을 Git에서 revert한 다음 Jenkins를 다시 빌드하는 방식으로 수행한다. 데이터 디렉터리는 Git 체크아웃·workspace 정리와 분리되어 있다. 아래 수동 설치 설명은 설정 값의 의미를 설명하는 참고 자료이며, 운영 적용은 Jenkins 빌드로만 한다.

1. 기존 API의 DB·TLS 설정은 유지한다. Node.js 24에서 검사했다. 해당 서버에 FFmpeg/FFprobe를 설치하고 서비스 계정으로 실행 가능한지 확인한다. Windows 빌드는 [FFmpeg 공식 다운로드 안내](https://ffmpeg.org/download.html#build-windows)에 연결된 제공처에서 받을 수 있다.
2. `.env.video.example`을 참고해 기존 서비스 환경변수에 설정을 추가한다. Linux 예: `VIDEO_DIR=/var/lib/mycast/videos`. Windows 예: `VIDEO_DIR=F:/MycastServer/data/videos`. 저장 디렉터리는 배포 소스 디렉터리 밖에 두고, 서비스 계정에만 쓰기 권한을 준다.
3. `pnpm install --frozen-lockfile`, `pnpm build` 후 기존 API 프로세스를 재시작한다. 새 `/video` 경로는 기존 HTTPS API 포트 `9011`을 사용한다. 영상 파일 디렉터리를 별도 정적 경로로 노출하지 않는다.
4. `GET https://mycast.xyz:9011/video/policy`와 테스트 계정으로 작은 MP4 업로드·취소·재생을 확인한다. 그다음 웹과 Windows 앱을 배포한다. 클라이언트를 먼저 배포하면 첨부 서버 미지원 오류가 표시된다.
5. `VIDEO_DIR`은 한 API 프로세스에서만 사용한다. **PM2 cluster / 여러 인스턴스를 사용하면 안 된다.** 용량 예약·사용자 동시성·전체 속도 버킷이 프로세스 메모리에 있기 때문이다. 기존 HTTP/HTTPS 두 리스너는 한 라우터를 공유하므로 하나의 제한을 사용한다.

속도 제한은 요청 본문을 16 KiB 단위로 읽는 속도를 실제로 늦춰 TCP backpressure를 발생시킨다. 단순 경고나 파일 전송 후 대기가 아니다. 토큰 버킷은 약 1초 분량의 초기 burst를 허용하며 OS·TLS 버퍼에 의한 짧은 추가 burst도 가능하다. API 앞에 프록시를 두는 경우 **요청 본문 선행 버퍼링을 끄고 스트리밍 전달**해야 클라이언트까지 제한이 전달된다. 이 설정은 업로드에만 적용되며 영상 시청에 따른 서버 송신 트래픽은 별도로 발생한다.

## API와 인증

- `GET /video/policy`: 정책 조회.
- `POST /video/uploads`: `Authorization: Bearer <기존 세션 private key>`, JSON `{name, bytes}`. 로그인 확인 후 일회성 예약 토큰 반환.
- `PUT /video/uploads/{token}`: `application/octet-stream` 원본 파일. 예약한 크기와 실제 크기가 같아야 한다. 성공하면 `{id,name,bytes,duration,created,expires}` 반환.
- `DELETE /video/uploads/{token}`: 아직 전송을 시작하지 않은 예약 취소. 전송 중에는 PUT 요청 자체도 중단한다.
- `DELETE /video/{id}`: 업로더의 Bearer 인증으로 미전송 파일 취소.
- `GET /video/{id}/info`, `/poster.jpg`, `/file.mp4`, `/watch`: 공개 재생 리소스. UUID 링크를 아는 사람은 열 수 있으므로 비공개 파일 보관 기능으로 사용하지 않는다. 파일은 Range/HEAD를 지원한다.

토큰과 세션 키를 로그에 남기지 않는다. 세션 키는 URL에 넣지 않는다. 업로드 예약 토큰도 외부 로그 수집 시 URL에서 가린다. 원본 영상·썸네일·메타데이터는 Git에 올리지 않는다.

## 자동 검사

`FFMPEG_PATH`와 `FFPROBE_PATH`를 지정하고 `pnpm test`를 실행한다. 미디어 도구가 없으면 실제 영상 처리 검사 2개는 skip되므로, 배포 전에는 두 경로를 반드시 지정한다. 인증·크기·동시성·속도·중단 정리·용량·코덱·길이·Range·업로더 삭제 권한을 검사한다. 운영 DB·공용 채팅은 사용하지 않는다.

## 배포 후 확인 목록

- 실제 계정 로그인 후 웹/앱/별도 채팅 창에서 첨부 → 진행률 → 보내기 → 다른 클라이언트에 카드가 보이는지.
- 기존 채팅 서버가 링크를 `chat`/`rich-text`/`link` 중 어떤 형식으로 저장하더라도 재접속 후 재생되는지.
- 업로드 도중 취소 및 업로드 완료 후 보내기 취소, 앱 종료 뒤 재접속.
- 썸네일·길이·크기, 클릭 재생, 스크롤로 화면 밖에 나갔을 때 재생 종료. 자동 재생 및 보이지 않는 영상의 선행 다운로드가 없는지.
- 실제 서비스 계정의 FFmpeg 실행 권한, 저장 디렉터리, PM2 인스턴스 수 및 디스크 사용량.
