
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, todosTable } from '../db/schema';
import { type DeleteTodoInput } from '../schema';
import { deleteTodo } from '../handlers/delete_todo';
import { eq } from 'drizzle-orm';

describe('deleteTodo', () => {
  let testUserId: number;
  let otherUserId: number;
  let testTodoId: number;
  let otherUserTodoId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { email: 'test@example.com', name: 'Test User' },
        { email: 'other@example.com', name: 'Other User' }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test todos
    const todos = await db.insert(todosTable)
      .values([
        { 
          title: 'Test Todo',
          description: 'A todo to delete',
          user_id: testUserId
        },
        {
          title: 'Other User Todo',
          description: 'Another user\'s todo',
          user_id: otherUserId
        }
      ])
      .returning()
      .execute();

    testTodoId = todos[0].id;
    otherUserTodoId = todos[1].id;
  });

  afterEach(resetDB);

  const testInput: DeleteTodoInput = {
    id: 0 // Will be set in tests
  };

  it('should delete a todo successfully', async () => {
    const input = { ...testInput, id: testTodoId };
    
    const result = await deleteTodo(input, testUserId);
    
    expect(result.success).toBe(true);
  });

  it('should remove todo from database', async () => {
    const input = { ...testInput, id: testTodoId };
    
    await deleteTodo(input, testUserId);
    
    // Verify todo is deleted
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodoId))
      .execute();
    
    expect(todos).toHaveLength(0);
  });

  it('should throw error when todo does not exist', async () => {
    const input = { ...testInput, id: 99999 };
    
    await expect(deleteTodo(input, testUserId)).rejects.toThrow(/not found or access denied/i);
  });

  it('should throw error when trying to delete another user\'s todo', async () => {
    const input = { ...testInput, id: otherUserTodoId };
    
    await expect(deleteTodo(input, testUserId)).rejects.toThrow(/not found or access denied/i);
  });

  it('should not delete other user\'s todo from database', async () => {
    const input = { ...testInput, id: otherUserTodoId };
    
    try {
      await deleteTodo(input, testUserId);
    } catch (error) {
      // Expected to throw
    }
    
    // Verify other user's todo still exists
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, otherUserTodoId))
      .execute();
    
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Other User Todo');
  });

  it('should only delete the specified todo', async () => {
    // Create another todo for the same user
    const anotherTodo = await db.insert(todosTable)
      .values({
        title: 'Another Todo',
        description: 'Should not be deleted',
        user_id: testUserId
      })
      .returning()
      .execute();

    const input = { ...testInput, id: testTodoId };
    
    await deleteTodo(input, testUserId);
    
    // Verify only the specified todo was deleted
    const remainingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.user_id, testUserId))
      .execute();
    
    expect(remainingTodos).toHaveLength(1);
    expect(remainingTodos[0].id).toBe(anotherTodo[0].id);
    expect(remainingTodos[0].title).toBe('Another Todo');
  });
});
