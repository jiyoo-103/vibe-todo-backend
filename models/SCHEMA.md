# Todo 데이터베이스 스키마

## 컬렉션: `todos`

### 필드 구조

| 필드명 | 타입 | 필수 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `_id` | ObjectId | 자동 | - | MongoDB 자동 생성 고유 ID |
| `title` | String | ✅ | - | 할일 제목 (최대 200자) |
| `description` | String | ❌ | - | 할일 설명 (최대 1000자) |
| `priority` | String | ❌ | `'medium'` | 우선순위: `'low'`, `'medium'`, `'high'` |
| `dueDate` | Date | ❌ | - | 마감일 |
| `createdAt` | Date | 자동 | 현재 시간 | 생성 시간 |
| `updatedAt` | Date | 자동 | 현재 시간 | 수정 시간 |

### 예시 데이터

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "프로젝트 문서 작성",
  "description": "API 문서와 README 작성하기",
  "priority": "high",
  "dueDate": "2024-12-31T23:59:59.000Z",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 검증 규칙

1. **title**: 
   - 필수 필드
   - 문자열 타입
   - 공백 제거 후 길이가 0보다 커야 함
   - 최대 200자

2. **description**: 
   - 선택 필드
   - 문자열 타입
   - 최대 1000자

3. **priority**: 
   - 선택 필드
   - 허용 값: `'low'`, `'medium'`, `'high'`
   - 기본값: `'medium'`

4. **dueDate**: 
   - 선택 필드
   - 유효한 Date 형식

5. **createdAt / updatedAt**: 
   - 자동 생성/업데이트
   - Date 타입

### 사용 방법

```javascript
const { validateTodo, createTodo, updateTodo } = require('./models/todoSchema');

// 새 Todo 생성
const newTodoData = {
  title: "할일 제목",
  description: "할일 설명",
  priority: "high"
};

// 검증
const validation = validateTodo(newTodoData);
if (!validation.valid) {
  console.error('검증 실패:', validation.errors);
  return;
}

// 정규화된 Todo 객체 생성
const todo = createTodo(newTodoData);

// MongoDB에 저장
await db.collection('todos').insertOne(todo);

// Todo 업데이트
const existingTodo = await db.collection('todos').findOne({ _id: todoId });
const updateData = { priority: 'low' };
const updatedTodo = updateTodo(existingTodo, updateData);
await db.collection('todos').updateOne(
  { _id: todoId },
  { $set: updatedTodo }
);
```
