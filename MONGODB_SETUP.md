# MongoDB Atlas 연결 설정 가이드

## 문제 해결: MongoDB 연결 실패

현재 MongoDB Atlas 연결이 SSL/TLS 에러로 실패하고 있습니다. 다음 단계를 따라 설정을 확인하세요.

## 1. MongoDB Atlas Network Access 설정

### 방법 1: 모든 IP 허용 (개발/테스트용)

1. [MongoDB Atlas](https://cloud.mongodb.com/) 대시보드에 로그인
2. 왼쪽 메뉴에서 **"Network Access"** 클릭
3. **"Add IP Address"** 버튼 클릭
4. **"Allow Access from Anywhere"** 버튼 클릭 (자동으로 `0.0.0.0/0` 입력됨)
5. **"Confirm"** 클릭

⚠️ **보안 주의**: 프로덕션 환경에서는 특정 IP만 허용하는 것을 권장합니다.

### 방법 2: Heroku IP만 허용 (권장)

1. MongoDB Atlas 대시보드 → **"Network Access"**
2. **"Add IP Address"** 클릭
3. Heroku의 IP 주소를 추가 (Heroku는 동적 IP를 사용하므로 `0.0.0.0/0` 사용 권장)

## 2. MongoDB Atlas Database User 확인

1. MongoDB Atlas 대시보드 → **"Database Access"**
2. 사용자 계정이 올바르게 설정되어 있는지 확인
3. 사용자 권한이 적절한지 확인 (최소한 `readWrite` 권한 필요)

## 3. Connection String 확인

Heroku에서 환경변수가 올바르게 설정되어 있는지 확인:

```bash
heroku config:get MONGO_URI -a vibe-todo-backend0
```

연결 문자열 형식:
```
mongodb+srv://<username>:<password>@cluster0.iabimfk.mongodb.net/<database>?retryWrites=true&w=majority
```

## 4. 코드 레벨 개선 사항

코드에 다음 개선 사항이 적용되었습니다:

- ✅ 연결 타임아웃 증가 (30초)
- ✅ 자동 재시도 로직 (최대 3회)
- ✅ 연결 풀 최적화
- ✅ 백그라운드 재연결 시도 (5분마다)

## 5. 문제가 계속되는 경우

1. **MongoDB Atlas 클러스터 상태 확인**
   - 클러스터가 실행 중인지 확인
   - 클러스터가 일시 중지되어 있지 않은지 확인

2. **연결 문자열 재생성**
   - MongoDB Atlas → "Database" → "Connect"
   - "Connect your application" 선택
   - 새로운 연결 문자열 복사
   - Heroku에 설정: `heroku config:set MONGO_URI="새로운_연결_문자열" -a vibe-todo-backend0`

3. **로그 확인**
   ```bash
   heroku logs --tail -a vibe-todo-backend0
   ```

## 6. 확인 방법

서버가 정상적으로 연결되면 다음 응답을 받을 수 있습니다:

```json
{
  "message": "Todo Backend API",
  "status": "running",
  "mongodb": "connected",  // ← "disconnected"에서 "connected"로 변경됨
  "timestamp": "2026-01-13T10:47:28.074Z"
}
```

## 추가 리소스

- [MongoDB Atlas Network Access 문서](https://docs.atlas.mongodb.com/security/ip-access-list/)
- [MongoDB Connection String 문서](https://docs.mongodb.com/manual/reference/connection-string/)
