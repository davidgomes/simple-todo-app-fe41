
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Todo schema
export const todoSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  completed: z.boolean(),
  user_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Todo = z.infer<typeof todoSchema>;

// Auth context schema
export const authContextSchema = z.object({
  userId: z.number()
});

export type AuthContext = z.infer<typeof authContextSchema>;

// Input schema for creating todos (user_id removed - comes from auth context)
export const createTodoInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional()
});

export type CreateTodoInput = z.infer<typeof createTodoInputSchema>;

// Input schema for updating todos (user_id removed - comes from auth context)
export const updateTodoInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  completed: z.boolean().optional()
});

export type UpdateTodoInput = z.infer<typeof updateTodoInputSchema>;

// Input schema for deleting todos (user_id removed - comes from auth context)
export const deleteTodoInputSchema = z.object({
  id: z.number()
});

export type DeleteTodoInput = z.infer<typeof deleteTodoInputSchema>;

// Input schema for getting todos (user_id removed - comes from auth context)
export const getTodosInputSchema = z.object({
  completed: z.boolean().optional()
});

export type GetTodosInput = z.infer<typeof getTodosInputSchema>;

// JWT payload schema
export const jwtPayloadSchema = z.object({
  userId: z.number(),
  email: z.string(),
  iat: z.number().optional(),
  exp: z.number().optional()
});

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
