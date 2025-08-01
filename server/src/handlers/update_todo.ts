
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type UpdateTodoInput, type Todo } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateTodo = async (input: UpdateTodoInput, userId: number): Promise<Todo> => {
  try {
    // First, verify the todo exists and belongs to the authenticated user
    const existingTodos = await db.select()
      .from(todosTable)
      .where(and(
        eq(todosTable.id, input.id),
        eq(todosTable.user_id, userId)
      ))
      .execute();

    if (existingTodos.length === 0) {
      throw new Error('Todo not found or does not belong to user');
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.completed !== undefined) {
      updateData.completed = input.completed;
    }

    // Update the todo
    const result = await db.update(todosTable)
      .set(updateData)
      .where(and(
        eq(todosTable.id, input.id),
        eq(todosTable.user_id, userId)
      ))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Todo update failed:', error);
    throw error;
  }
};
