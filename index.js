require('dotenv').config();

// 디버깅: 환경변수 로드 확인
console.log('Environment variables loaded:');
console.log('MONGO_URI:', process.env.MONGO_URI ? '✓ Loaded' : '✗ Not found');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✓ Loaded' : '✗ Not found');

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const todosRouter = require('./routers/todos');

const app = express();
const PORT = process.env.PORT || 5000;

// MONGO_URI를 우선적으로 사용
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/todo';

// 디버깅: 사용할 MongoDB URI 확인 (비밀번호 마스킹)
if (MONGODB_URI) {
  const maskedURI = MONGODB_URI.replace(/:[^:@]+@/, ':****@');
  console.log('Using MongoDB URI:', maskedURI);
} else {
  console.error('✗ MongoDB URI가 설정되지 않았습니다!');
}

let client;
let db;

// MongoDB 연결 함수
async function connectMongoDB() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    // URI에서 데이터베이스 이름 추출하거나 기본값 사용
    const dbName = MONGODB_URI.match(/\/([^\/\?]+)(\?|$)/)?.[1] || 'todo';
    db = client.db(dbName);
    
    // Express app에 db 객체 저장
    app.locals.db = db;
    console.log(`MongoDB 연결 성공 (데이터베이스: ${dbName})`);
    return true;
  } catch (error) {
    console.error('MongoDB 연결 실패:', error);
    return false;
  }
}

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 설정 - strict-origin-when-cross-origin 문제 해결
// cors 패키지를 사용하여 간단하고 확실하게 설정
app.use(cors({
  origin: '*', // 모든 origin 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  credentials: false, // origin: '*'와 함께 사용할 수 없으므로 false
  maxAge: 86400, // 24시간
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// 보안 헤더 설정
app.use((req, res, next) => {
  // Referrer Policy를 명시적으로 설정하여 브라우저 기본값 오버라이드
  // 'unsafe-url'은 모든 경우에 referrer를 전송 (개발 환경용)
  // 프로덕션에서는 'no-referrer-when-downgrade' 또는 'same-origin' 권장
  res.setHeader('Referrer-Policy', 'unsafe-url');
  
  // 추가 보안 헤더
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
});

// 기본 라우팅
app.get('/', (req, res) => {
  res.json({
    message: 'Todo Backend API',
    status: 'running',
    mongodb: db ? 'connected' : 'disconnected'
  });
});

// 라우터 등록
app.use('/api/todos', todosRouter);

// 서버 시작 함수
async function startServer() {
  const isConnected = await connectMongoDB();
  
  if (isConnected) {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } else {
    console.error('MongoDB 연결 실패로 서버를 시작할 수 없습니다.');
    process.exit(1);
  }
}

// 프로세스 종료 시 MongoDB 연결 종료
process.on('SIGINT', async () => {
  console.log('\n서버를 종료합니다...');
  if (client) {
    await client.close();
    console.log('MongoDB 연결이 종료되었습니다.');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n서버를 종료합니다...');
  if (client) {
    await client.close();
    console.log('MongoDB 연결이 종료되었습니다.');
  }
  process.exit(0);
});

// 서버 시작
startServer();
