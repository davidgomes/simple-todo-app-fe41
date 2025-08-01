
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type DeleteTodoInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function deleteTodo(input: DeleteTodoInput, userId: number): Promise<{ success: boolean }> {
  try {
    // Delete the todo only if it exists and belongs to the authenticated user
    const result = await db.delete(todosTable)
      .where(and(
        eq(todosTable.id, input.id),
        eq(todosTable.user_id, userId)
      ))
      .returning()
      .execute();

    // If no rows were affected, the todo either doesn't exist or doesn't belong to the user
    if (result.length === 0) {
      throw new Error('Todo not found or access denied');
    }

    return { success: true };
  } catch (error) {
    console.error('Todo deletion failed:', error);
    throw error;
  }
}
