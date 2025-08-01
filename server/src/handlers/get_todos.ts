
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type GetTodosInput, type Todo } from '../schema';
import { eq, and } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

export async function getTodos(input: GetTodosInput, userId: number): Promise<Todo[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id
    conditions.push(eq(todosTable.user_id, userId));
    
    // Optionally filter by completed status
    if (input.completed !== undefined) {
      conditions.push(eq(todosTable.completed, input.completed));
    }

    // Execute query with conditions
    const results = await db.select()
      .from(todosTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute();

    return results;
  } catch (error) {
    console.error('Get todos failed:', error);
    throw error;
  }
}
