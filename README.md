# api-server

MyCast 서비스를 위한 TypeScript 기반의 백엔드 API 서버입니다. 다양한 외부 데이터 소스를 통합하고 이모지 관리 및 유저 편의 기능을 제공합니다.

## 🚀 주요 기능

### 1. 이모지 시스템 (Emoji Management)

- **업로드**: ImageKit API를 사용하여 이모지를 클라우드에 저장하고 썸네일을 생성합니다.
- **검색**: 이모지 이름을 기반으로 검색하며, 검색어와 일치하는 시작 단어에 우선순위를 두어 결과를 정렬합니다.
- **관리**: 유저별 이모지 보유 목록 확인 및 삭제 기능을 제공합니다.

### 2. 스트리밍 및 미디어 통합 (Media Integration)

- **스트리밍**: 아프리카TV, 치지직(Chzzk), 트위치(Twitch)의 방송 상태 및 정보를 로드합니다.
- **컨텐츠**: 네이버 영화, 카카오 도서, 온나다(Onnada) 애니메이션/성우 정보를 제공합니다.

### 3. 유저 및 커뮤니티

- **유저**: 유저 정보 조회 및 관리 기능을 제공합니다.
- **기타**: 메모 저장 시스템, LOL(Riot API) 게임 데이터 조회, 인벤/루리웹 등 외부 커뮤니티 연동 기능을 포함합니다.

## 🛠 기술 스택

- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MySQL (Custom Wrapper: VegaDbModel)
- **Storage**: ImageKit (이모지 이미지 관리)
- **Utilities**: Axios, Dotenv, Body-parser

## 📂 프로젝트 구조

```text
src/
├── manager/            # 서버 및 데이터 로더 관리
│   ├── server/         # Express 서버 및 라우터 설정
│   └── loader/         # 외부 API 로더 (Afreeca, Kakao, Naver 등)
├── models/             # 비즈니스 로직 및 DB 접근 (DAO/DTO)
│   ├── emoji/          # 이모지 관련 핸들러 및 DB 매니저
│   └── db/             # 데이터베이스 연결 모델
├── util/               # 공통 유틸리티 (Logger 등)
├── Config.ts           # 환경 변수 및 설정 관리
└── App.ts              # 애플리케이션 진입점
```

## ⚙️ 환경 설정 (.env)

서버 실행을 위해 다음과 같은 환경 변수가 필요합니다.

```env
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

IMAGEKIT_PUBLIC_KEY=your_key
IMAGEKIT_PRIVATE_KEY=your_key
IMAGEKIT_ENDPOINT=your_endpoint

RIOT_API_KEY=your_key
TWITCH_CLIENT_KEY=your_key
TWITCH_SECRET_KEY=your_key
```

## 🔌 주요 API 엔드포인트

| 경로                      | 설명                             |
| ------------------------- | -------------------------------- |
| `GET /emoji`              | 전체 이모지 목록 조회            |
| `GET /emoji/search?q=...` | 이모지 이름 검색 (우선순위 정렬) |
| `POST /emoji`             | 새 이모지 업로드                 |
| `GET /stream/...`         | 스트리밍 플랫폼 정보 조회        |
| `GET /animation/:name`    | 애니메이션 정보 조회             |
| `GET /movie/:query`       | 영화 정보 조회                   |

## 🛠 실행 방법

```bash
npm install
npm start
```
