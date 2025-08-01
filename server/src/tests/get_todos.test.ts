
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, todosTable } from '../db/schema';
import { type GetTodosInput } from '../schema';
import { getTodos } from '../handlers/get_todos';

describe('getTodos', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get todos for authenticated user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create test todos for this user
    await db.insert(todosTable)
      .values([
        {
          title: 'Todo 1',
          description: 'First todo',
          completed: false,
          user_id: userId
        },
        {
          title: 'Todo 2',
          description: 'Second todo',
          completed: true,
          user_id: userId
        }
      ])
      .execute();

    const input: GetTodosInput = {};
    const result = await getTodos(input, userId);

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Todo 1');
    expect(result[0].completed).toEqual(false);
    expect(result[0].user_id).toEqual(userId);
    expect(result[1].title).toEqual('Todo 2');
    expect(result[1].completed).toEqual(true);
    expect(result[1].user_id).toEqual(userId);
  });

  it('should filter todos by completed status', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create test todos with different completed status
    await db.insert(todosTable)
      .values([
        {
          title: 'Incomplete Todo',
          description: 'Not done yet',
          completed: false,
          user_id: userId
        },
        {
          title: 'Complete Todo',
          description: 'All done',
          completed: true,
          user_id: userId
        }
      ])
      .execute();

    // Test filtering for completed todos
    const completedInput: GetTodosInput = { completed: true };
    const completedResult = await getTodos(completedInput, userId);

    expect(completedResult).toHaveLength(1);
    expect(completedResult[0].title).toEqual('Complete Todo');
    expect(completedResult[0].completed).toEqual(true);

    // Test filtering for incomplete todos
    const incompleteInput: GetTodosInput = { completed: false };
    const incompleteResult = await getTodos(incompleteInput, userId);

    expect(incompleteResult).toHaveLength(1);
    expect(incompleteResult[0].title).toEqual('Incomplete Todo');
    expect(incompleteResult[0].completed).toEqual(false);
  });

  it('should only return todos for the authenticated user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        name: 'User 1'
      })
      .returning()
      .execute();
    
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        name: 'User 2'
      })
      .returning()
      .execute();
    
    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create todos for both users
    await db.insert(todosTable)
      .values([
        {
          title: 'User 1 Todo',
          description: 'Todo for user 1',
          completed: false,
          user_id: user1Id
        },
        {
          title: 'User 2 Todo',
          description: 'Todo for user 2',
          completed: false,
          user_id: user2Id
        }
      ])
      .execute();

    // Get todos for user 1
    const input: GetTodosInput = {};
    const result = await getTodos(input, user1Id);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('User 1 Todo');
    expect(result[0].user_id).toEqual(user1Id);
  });

  it('should return empty array when user has no todos', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const input: GetTodosInput = {};
    const result = await getTodos(input, userId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});
