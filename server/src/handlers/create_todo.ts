
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type CreateTodoInput, type Todo } from '../schema';

export const createTodo = async (input: CreateTodoInput, userId: number): Promise<Todo> => {
  try {
    // Insert todo record with the authenticated user's ID
    const result = await db.insert(todosTable)
      .values({
        title: input.title,
        description: input.description || null,
        user_id: userId,
        completed: false // Default value
      })
      .returning()
      .execute();

    const todo = result[0];
    return todo;
  } catch (error) {
    console.error('Todo creation failed:', error);
    throw error;
  }
};
