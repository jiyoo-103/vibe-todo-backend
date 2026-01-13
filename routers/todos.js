const express = require('express');
const { ObjectId } = require('mongodb');
const { validateTodo, createTodo, updateTodo } = require('../models/todoSchema');

const router = express.Router();

/**
 * 할일 목록 조회 라우터
 * GET /api/todos
 */
router.get('/', async (req, res) => {
  try {
    // 데이터베이스 연결 확인 및 재연결 시도
    let db = req.app.locals.db;
    if (!db) {
      // 연결이 없으면 재연결 시도
      const ensureMongoConnection = req.app.locals.ensureMongoConnection;
      if (ensureMongoConnection) {
        db = await ensureMongoConnection();
        if (!db) {
          return res.status(503).json({
            error: 'Database not connected',
            message: '데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
          });
        }
      } else {
        return res.status(503).json({
          error: 'Database not connected',
          message: '데이터베이스에 연결되지 않았습니다.'
        });
      }
    }

    // 쿼리 파라미터 (선택적)
    const { priority, sort = 'createdAt', order = 'desc' } = req.query;

    // 필터 생성
    const filter = {};
    if (priority) {
      filter.priority = priority;
    }

    // 정렬 옵션
    const sortOption = {};
    sortOption[sort] = order === 'asc' ? 1 : -1;

    // 할일 목록 조회
    let todos;
    try {
      todos = await db.collection('todos')
        .find(filter)
        .sort(sortOption)
        .toArray();
    } catch (dbError) {
      // MongoDB 연결 에러인 경우 재연결 시도
      if (dbError.name === 'MongoServerSelectionError' || dbError.name === 'MongoNetworkError') {
        console.log('🔄 MongoDB 연결 에러 감지, 재연결 시도 중...');
        // 재연결 시도
        const ensureMongoConnection = req.app.locals.ensureMongoConnection;
        if (ensureMongoConnection) {
          const reconnectedDb = await ensureMongoConnection();
          if (reconnectedDb) {
            // 재연결 성공 시 다시 쿼리 실행
            todos = await reconnectedDb.collection('todos')
              .find(filter)
              .sort(sortOption)
              .toArray();
          } else {
            throw dbError;
          }
        } else {
          throw dbError;
        }
      } else {
        throw dbError;
      }
    }

    // 응답
    res.json({
      message: '할일 목록을 성공적으로 조회했습니다.',
      count: todos.length,
      todos: todos
    });
  } catch (error) {
    console.error('할일 목록 조회 오류:', error);
    
    // MongoDB 연결 에러인 경우 더 자세한 메시지
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
      return res.status(503).json({
        error: 'Database connection error',
        message: '데이터베이스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: '할일 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 특정 할일 조회 라우터
 * GET /api/todos/:id
 */
router.get('/:id', async (req, res) => {
  try {
    // 데이터베이스 연결 확인
    const db = req.app.locals.db;
    if (!db) {
      return res.status(503).json({
        error: 'Database not connected',
        message: '데이터베이스에 연결되지 않았습니다.'
      });
    }

    // ID 파라미터
    const { id } = req.params;

    // ObjectId 유효성 검증
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: '유효하지 않은 ID 형식입니다.'
      });
    }

    // 할일 조회
    const todo = await db.collection('todos').findOne({ _id: new ObjectId(id) });

    // 할일이 없는 경우
    if (!todo) {
      return res.status(404).json({
        error: 'Todo not found',
        message: '해당 할일을 찾을 수 없습니다.'
      });
    }

    // 응답
    res.json({
      message: '할일을 성공적으로 조회했습니다.',
      todo: todo
    });
  } catch (error) {
    console.error('할일 조회 오류:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '할일 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 할일 수정 라우터
 * PUT /api/todos/:id
 */
router.put('/:id', async (req, res) => {
  try {
    // 데이터베이스 연결 확인
    const db = req.app.locals.db;
    if (!db) {
      return res.status(503).json({
        error: 'Database not connected',
        message: '데이터베이스에 연결되지 않았습니다.'
      });
    }

    // ID 파라미터
    const { id } = req.params;

    // ObjectId 유효성 검증
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: '유효하지 않은 ID 형식입니다.'
      });
    }

    // 기존 할일 조회
    const existingTodo = await db.collection('todos').findOne({ _id: new ObjectId(id) });

    // 할일이 없는 경우
    if (!existingTodo) {
      return res.status(404).json({
        error: 'Todo not found',
        message: '해당 할일을 찾을 수 없습니다.'
      });
    }

    // 요청 본문 데이터
    const updateData = req.body;

    // 스키마 검증
    const validation = validateTodo(updateData);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        message: '입력 데이터 검증에 실패했습니다.',
        errors: validation.errors
      });
    }

    // Todo 객체 업데이트
    const updatedTodo = updateTodo(existingTodo, updateData);

    // MongoDB에 업데이트
    await db.collection('todos').updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedTodo }
    );

    // 업데이트된 Todo 조회
    const result = await db.collection('todos').findOne({ _id: new ObjectId(id) });

    // 응답
    res.json({
      message: '할일이 성공적으로 수정되었습니다.',
      todo: result
    });
  } catch (error) {
    console.error('할일 수정 오류:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '할일 수정 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 할일 삭제 라우터
 * DELETE /api/todos/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    // 데이터베이스 연결 확인
    const db = req.app.locals.db;
    if (!db) {
      return res.status(503).json({
        error: 'Database not connected',
        message: '데이터베이스에 연결되지 않았습니다.'
      });
    }

    // ID 파라미터
    const { id } = req.params;

    // ObjectId 유효성 검증
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: '유효하지 않은 ID 형식입니다.'
      });
    }

    // 기존 할일 조회
    const existingTodo = await db.collection('todos').findOne({ _id: new ObjectId(id) });

    // 할일이 없는 경우
    if (!existingTodo) {
      return res.status(404).json({
        error: 'Todo not found',
        message: '해당 할일을 찾을 수 없습니다.'
      });
    }

    // MongoDB에서 삭제
    await db.collection('todos').deleteOne({ _id: new ObjectId(id) });

    // 응답
    res.json({
      message: '할일이 성공적으로 삭제되었습니다.',
      deletedTodo: existingTodo
    });
  } catch (error) {
    console.error('할일 삭제 오류:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '할일 삭제 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 할일 생성 라우터
 * POST /api/todos
 */
router.post('/', async (req, res) => {
  try {
    // 데이터베이스 연결 확인
    const db = req.app.locals.db;
    if (!db) {
      return res.status(503).json({
        error: 'Database not connected',
        message: '데이터베이스에 연결되지 않았습니다.'
      });
    }

    // 요청 본문 데이터
    const todoData = req.body;

    // 디버깅: 요청 본문 로깅
    console.log('받은 요청 본문:', JSON.stringify(todoData, null, 2));

    // 스키마 검증
    const validation = validateTodo(todoData);
    if (!validation.valid) {
      console.log('검증 실패:', validation.errors);
      return res.status(400).json({
        error: 'Validation failed',
        message: '입력 데이터 검증에 실패했습니다.',
        errors: validation.errors,
        receivedData: todoData // 디버깅을 위해 받은 데이터도 포함
      });
    }

    // Todo 객체 생성
    const todo = createTodo(todoData);

    // MongoDB에 저장
    const result = await db.collection('todos').insertOne(todo);

    // 생성된 Todo 조회
    const createdTodo = await db.collection('todos').findOne({ _id: result.insertedId });

    // 응답
    res.status(201).json({
      message: '할일이 성공적으로 생성되었습니다.',
      todo: createdTodo
    });
  } catch (error) {
    console.error('할일 생성 오류:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '할일 생성 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
