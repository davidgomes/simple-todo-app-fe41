
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, todosTable } from '../db/schema';
import { type UpdateTodoInput } from '../schema';
import { updateTodo } from '../handlers/update_todo';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  name: 'Test User'
};

const testUser2 = {
  email: 'test2@example.com',
  name: 'Test User 2'
};

const testTodo = {
  title: 'Original Todo',
  description: 'Original description',
  completed: false
};

describe('updateTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update todo title', async () => {
    // Create user and todo
    const user = await db.insert(usersTable).values(testUser).returning().execute();
    const todo = await db.insert(todosTable).values({
      ...testTodo,
      user_id: user[0].id
    }).returning().execute();

    const input: UpdateTodoInput = {
      id: todo[0].id,
      title: 'Updated Title'
    };

    const result = await updateTodo(input, user[0].id);

    expect(result.id).toEqual(todo[0].id);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.completed).toEqual(false); // Unchanged
    expect(result.user_id).toEqual(user[0].id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(todo[0].updated_at.getTime());
  });

  it('should update todo description', async () => {
    // Create user and todo
    const user = await db.insert(usersTable).values(testUser).returning().execute();
    const todo = await db.insert(todosTable).values({
      ...testTodo,
      user_id: user[0].id
    }).returning().execute();

    const input: UpdateTodoInput = {
      id: todo[0].id,
      description: 'Updated description'
    };

    const result = await updateTodo(input, user[0].id);

    expect(result.id).toEqual(todo[0].id);
    expect(result.title).toEqual('Original Todo'); // Unchanged
    expect(result.description).toEqual('Updated description');
    expect(result.completed).toEqual(false); // Unchanged
    expect(result.user_id).toEqual(user[0].id);
  });

  it('should update todo completion status', async () => {
    // Create user and todo
    const user = await db.insert(usersTable).values(testUser).returning().execute();
    const todo = await db.insert(todosTable).values({
      ...testTodo,
      user_id: user[0].id
    }).returning().execute();

    const input: UpdateTodoInput = {
      id: todo[0].id,
      completed: true
    };

    const result = await updateTodo(input, user[0].id);

    expect(result.id).toEqual(todo[0].id);
    expect(result.title).toEqual('Original Todo'); // Unchanged
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.completed).toEqual(true);
    expect(result.user_id).toEqual(user[0].id);
  });

  it('should update multiple fields at once', async () => {
    // Create user and todo
    const user = await db.insert(usersTable).values(testUser).returning().execute();
    const todo = await db.insert(todosTable).values({
      ...testTodo,
      user_id: user[0].id
    }).returning().execute();

    const input: UpdateTodoInput = {
      id: todo[0].id,
      title: 'Updated Title',
      description: 'Updated description',
      completed: true
    };

    const result = await updateTodo(input, user[0].id);

    expect(result.id).toEqual(todo[0].id);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Updated description');
    expect(result.completed).toEqual(true);
    expect(result.user_id).toEqual(user[0].id);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set description to null when explicitly provided', async () => {
    // Create user and todo
    const user = await db.insert(usersTable).values(testUser).returning().execute();
    const todo = await db.insert(todosTable).values({
      ...testTodo,
      user_id: user[0].id
    }).returning().execute();

    const input: UpdateTodoInput = {
      id: todo[0].id,
      description: null
    };

    const result = await updateTodo(input, user[0].id);

    expect(result.id).toEqual(todo[0].id);
    expect(result.title).toEqual('Original Todo'); // Unchanged
    expect(result.description).toBeNull();
    expect(result.completed).toEqual(false); // Unchanged
    expect(result.user_id).toEqual(user[0].id);
  });

  it('should save updated todo to database', async () => {
    // Create user and todo
    const user = await db.insert(usersTable).values(testUser).returning().execute();
    const todo = await db.insert(todosTable).values({
      ...testTodo,
      user_id: user[0].id
    }).returning().execute();

    const input: UpdateTodoInput = {
      id: todo[0].id,
      title: 'Updated Title',
      completed: true
    };

    await updateTodo(input, user[0].id);

    // Verify in database
    const savedTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, todo[0].id))
      .execute();

    expect(savedTodos).toHaveLength(1);
    expect(savedTodos[0].title).toEqual('Updated Title');
    expect(savedTodos[0].completed).toEqual(true);
    expect(savedTodos[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when todo does not exist', async () => {
    // Create user but no todo
    const user = await db.insert(usersTable).values(testUser).returning().execute();

    const input: UpdateTodoInput = {
      id: 999, // Non-existent ID
      title: 'Updated Title'
    };

    await expect(updateTodo(input, user[0].id)).rejects.toThrow(/todo not found/i);
  });

  it('should throw error when todo belongs to different user', async () => {
    // Create two users
    const user1 = await db.insert(usersTable).values(testUser).returning().execute();
    const user2 = await db.insert(usersTable).values(testUser2).returning().execute();

    // Create todo for user1
    const todo = await db.insert(todosTable).values({
      ...testTodo,
      user_id: user1[0].id
    }).returning().execute();

    const input: UpdateTodoInput = {
      id: todo[0].id,
      title: 'Updated Title'
    };

    // Try to update with user2's ID
    await expect(updateTodo(input, user2[0].id)).rejects.toThrow(/todo not found.*does not belong to user/i);
  });

  it('should not modify todo when no fields provided except updated_at', async () => {
    // Create user and todo
    const user = await db.insert(usersTable).values(testUser).returning().execute();
    const todo = await db.insert(todosTable).values({
      ...testTodo,
      user_id: user[0].id
    }).returning().execute();

    const input: UpdateTodoInput = {
      id: todo[0].id
      // No fields to update
    };

    const result = await updateTodo(input, user[0].id);

    expect(result.id).toEqual(todo[0].id);
    expect(result.title).toEqual('Original Todo'); // Unchanged
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.completed).toEqual(false); // Unchanged
    expect(result.user_id).toEqual(user[0].id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(todo[0].updated_at.getTime());
  });
});
