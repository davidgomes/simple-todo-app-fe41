
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, todosTable } from '../db/schema';
import { type CreateTodoInput } from '../schema';
import { createTodo } from '../handlers/create_todo';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  name: 'Test User'
};

// Simple test input
const testInput: CreateTodoInput = {
  title: 'Test Todo',
  description: 'A todo for testing'
};

const testInputWithoutDescription: CreateTodoInput = {
  title: 'Todo without description'
};

describe('createTodo', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user first (required for foreign key)
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create a todo with description', async () => {
    const result = await createTodo(testInput, testUserId);

    // Basic field validation
    expect(result.title).toEqual('Test Todo');
    expect(result.description).toEqual('A todo for testing');
    expect(result.completed).toEqual(false);
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a todo without description', async () => {
    const result = await createTodo(testInputWithoutDescription, testUserId);

    expect(result.title).toEqual('Todo without description');
    expect(result.description).toBeNull();
    expect(result.completed).toEqual(false);
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
  });

  it('should save todo to database', async () => {
    const result = await createTodo(testInput, testUserId);

    // Query using proper drizzle syntax
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toEqual('Test Todo');
    expect(todos[0].description).toEqual('A todo for testing');
    expect(todos[0].completed).toEqual(false);
    expect(todos[0].user_id).toEqual(testUserId);
    expect(todos[0].created_at).toBeInstanceOf(Date);
    expect(todos[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple todos for the same user', async () => {
    const firstTodo = await createTodo(testInput, testUserId);
    const secondTodo = await createTodo(testInputWithoutDescription, testUserId);

    expect(firstTodo.id).not.toEqual(secondTodo.id);
    expect(firstTodo.user_id).toEqual(testUserId);
    expect(secondTodo.user_id).toEqual(testUserId);

    // Verify both todos exist in database
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.user_id, testUserId))
      .execute();

    expect(todos).toHaveLength(2);
  });

  it('should handle empty description correctly', async () => {
    const inputWithEmptyDescription: CreateTodoInput = {
      title: 'Todo with empty description',
      description: undefined
    };

    const result = await createTodo(inputWithEmptyDescription, testUserId);

    expect(result.title).toEqual('Todo with empty description');
    expect(result.description).toBeNull();
    expect(result.user_id).toEqual(testUserId);
  });

  it('should fail when user does not exist', async () => {
    const nonExistentUserId = 99999;

    await expect(createTodo(testInput, nonExistentUserId))
      .rejects.toThrow(/violates foreign key constraint/i);
  });
});
