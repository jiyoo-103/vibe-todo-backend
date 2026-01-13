/**
 * Todo 데이터베이스 스키마 정의
 * MongoDB 컬렉션: todos
 */

/**
 * Todo 스키마 구조
 * @typedef {Object} Todo
 * @property {string} _id - MongoDB 자동 생성 ID (ObjectId)
 * @property {string} title - 할일 제목 (필수)
 * @property {string} [description] - 할일 설명 (선택)
 * @property {string} [priority] - 우선순위: 'low', 'medium', 'high' (기본값: 'medium')
 * @property {Date} [dueDate] - 마감일 (선택)
 * @property {Date} createdAt - 생성 시간 (자동 생성)
 * @property {Date} updatedAt - 수정 시간 (자동 업데이트)
 */

// 스키마 기본값
const DEFAULT_VALUES = {
  priority: 'medium',
  createdAt: new Date(),
  updatedAt: new Date()
};

// 우선순위 옵션
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

/**
 * Todo 스키마 검증 함수
 * @param {Object} data - 검증할 데이터
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateTodo(data) {
  const errors = [];

  // title 검증 (필수)
  if (!data.title || typeof data.title !== 'string') {
    errors.push('title은 필수이며 문자열이어야 합니다.');
  } else if (data.title.trim().length === 0) {
    errors.push('title은 비어있을 수 없습니다.');
  } else if (data.title.length > 200) {
    errors.push('title은 200자 이하여야 합니다.');
  }

  // description 검증 (선택)
  if (data.description !== undefined) {
    if (typeof data.description !== 'string') {
      errors.push('description은 문자열이어야 합니다.');
    } else if (data.description.length > 1000) {
      errors.push('description은 1000자 이하여야 합니다.');
    }
  }

  // priority 검증
  if (data.priority !== undefined) {
    if (!PRIORITY_OPTIONS.includes(data.priority)) {
      errors.push(`priority는 ${PRIORITY_OPTIONS.join(', ')} 중 하나여야 합니다.`);
    }
  }

  // dueDate 검증
  if (data.dueDate !== undefined) {
    const dueDate = new Date(data.dueDate);
    if (isNaN(dueDate.getTime())) {
      errors.push('dueDate는 유효한 날짜 형식이어야 합니다.');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Todo 데이터를 스키마에 맞게 정규화
 * @param {Object} data - 정규화할 데이터
 * @returns {Object} 정규화된 Todo 객체
 */
function normalizeTodo(data) {
  const todo = {
    title: data.title?.trim(),
    priority: data.priority ?? DEFAULT_VALUES.priority,
    createdAt: data.createdAt || DEFAULT_VALUES.createdAt,
    updatedAt: new Date() // 항상 현재 시간으로 업데이트
  };

  // 선택적 필드 추가
  if (data.description !== undefined) {
    todo.description = data.description.trim();
  }

  if (data.dueDate !== undefined) {
    todo.dueDate = new Date(data.dueDate);
  }

  return todo;
}

/**
 * 새 Todo 생성 시 사용할 초기 데이터 생성
 * @param {Object} data - 사용자 입력 데이터
 * @returns {Object} 초기화된 Todo 객체
 */
function createTodo(data) {
  const todo = normalizeTodo(data);
  todo.createdAt = new Date();
  todo.updatedAt = new Date();
  return todo;
}

/**
 * Todo 업데이트 시 사용할 데이터 생성
 * @param {Object} existingTodo - 기존 Todo 객체
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {Object} 업데이트된 Todo 객체
 */
function updateTodo(existingTodo, updateData) {
  const todo = {
    ...existingTodo,
    ...normalizeTodo(updateData),
    _id: existingTodo._id, // ID는 변경하지 않음
    createdAt: existingTodo.createdAt // 생성 시간은 변경하지 않음
  };
  todo.updatedAt = new Date(); // 수정 시간은 항상 업데이트
  return todo;
}

module.exports = {
  DEFAULT_VALUES,
  PRIORITY_OPTIONS,
  validateTodo,
  normalizeTodo,
  createTodo,
  updateTodo
};
