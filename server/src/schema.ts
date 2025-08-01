
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Todo schema
export const todoSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  completed: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Todo = z.infer<typeof todoSchema>;

// Auth input schemas
export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Auth response schema
export const authResponseSchema = z.object({
  user: userSchema.omit({ password_hash: true }),
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Todo input schemas
export const createTodoInputSchema = z.object({
  title: z.string().min(1),
  user_id: z.number()
});

export type CreateTodoInput = z.infer<typeof createTodoInputSchema>;

export const updateTodoInputSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string().min(1).optional(),
  completed: z.boolean().optional()
});

export type UpdateTodoInput = z.infer<typeof updateTodoInputSchema>;

export const deleteTodoInputSchema = z.object({
  id: z.number(),
  user_id: z.number()
});

export type DeleteTodoInput = z.infer<typeof deleteTodoInputSchema>;

export const getTodosInputSchema = z.object({
  user_id: z.number()
});

export type GetTodosInput = z.infer<typeof getTodosInputSchema>;
