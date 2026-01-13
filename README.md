# Todo Backend API

Todo 애플리케이션을 위한 백엔드 API 서버입니다.

## 📋 목차

- [기술 스택](#기술-스택)
- [시작하기](#시작하기)
- [설치](#설치)
- [실행](#실행)
- [API 엔드포인트](#api-엔드포인트)
- [프로젝트 구조](#프로젝트-구조)

## 기술 스택

- **Node.js** - JavaScript 런타임 환경
- **Native HTTP Module** - 기본 HTTP 서버 모듈

## 시작하기

### 필요 조건

- Node.js (v14.0.0 이상 권장)
- npm (Node.js와 함께 설치됨)

### 설치

프로젝트를 클론한 후 의존성을 설치하세요:

```bash
npm install
```

### 실행

#### 개발 모드 (파일 변경 시 자동 재시작)

```bash
npm run dev
```

#### 프로덕션 모드

```bash
npm start
```

서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

포트를 변경하려면 환경 변수를 설정하세요:

```bash
PORT=8080 npm start
```

## API 엔드포인트

### GET /

서버 상태 확인

**요청 예시:**
```bash
curl http://localhost:3000/
```

**응답 예시:**
```json
{
  "message": "Todo Backend API",
  "status": "running"
}
```

## 프로젝트 구조

```
todo-backend/
├── index.js          # 메인 서버 파일
├── package.json      # 프로젝트 설정 및 의존성
├── .gitignore       # Git 제외 파일 목록
└── README.md        # 프로젝트 문서
```

## 라이센스

ISC
