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
    if (!MONGODB_URI || MONGODB_URI === 'mongodb://localhost:27017/todo') {
      console.error('❌ MongoDB URI가 설정되지 않았습니다.');
      console.error('💡 Heroku에서 환경변수를 설정하세요:');
      console.error('   heroku config:set MONGO_URI="your-mongodb-connection-string"');
      return false;
    }
    
    // MongoDB 연결 옵션 설정 (SSL/TLS 문제 해결)
    const clientOptions = {
      serverSelectionTimeoutMS: 5000, // 5초 타임아웃
      connectTimeoutMS: 10000, // 10초 연결 타임아웃
    };
    
    client = new MongoClient(MONGODB_URI, clientOptions);
    await client.connect();
    
    // URI에서 데이터베이스 이름 추출
    // mongodb+srv://user:pass@cluster.mongodb.net/dbname 형식 처리
    let dbName = 'todo'; // 기본값
    const uriMatch = MONGODB_URI.match(/\/([^\/\?]+)(\?|$)/);
    if (uriMatch && uriMatch[1] && uriMatch[1] !== '') {
      dbName = uriMatch[1];
    }
    
    db = client.db(dbName);
    
    // Express app에 db 객체 저장
    app.locals.db = db;
    console.log(`✅ MongoDB 연결 성공 (데이터베이스: ${dbName})`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error.message);
    console.error('📋 전체 에러:', error);
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
    mongodb: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// 헬스 체크 엔드포인트 (Heroku용)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    mongodb: db ? 'connected' : 'disconnected'
  });
});

// 라우터 등록
app.use('/api/todos', todosRouter);

// 에러 핸들링 미들웨어 (모든 라우터 이후에 배치)
app.use((err, req, res, next) => {
  console.error('❌ 에러 발생:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? '서버 오류가 발생했습니다.' : err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `경로를 찾을 수 없습니다: ${req.method} ${req.path}`
  });
});

// 서버 시작 함수
async function startServer() {
  try {
    // MongoDB 연결 시도 (연결 실패해도 서버는 시작)
    const isConnected = await connectMongoDB();
    
    if (!isConnected) {
      console.warn('⚠️  MongoDB 연결 실패 - 일부 기능이 제한될 수 있습니다.');
      console.warn('⚠️  Heroku에서 MONGO_URI 환경변수를 확인하세요: heroku config:get MONGO_URI');
    }
    
    // MongoDB 연결 여부와 관계없이 서버 시작 (Heroku 요구사항)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`📊 MongoDB: ${isConnected ? 'Connected' : 'Disconnected'}`);
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    console.error('📋 에러 상세:', error.stack);
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
