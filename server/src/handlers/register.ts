
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

// Since I can't modify schema.ts, I'll define the types here for now
// In a real implementation, these would be in schema.ts
import { z } from 'zod';

const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1)
});

const authResponseSchema = z.object({
  user: z.object({
    id: z.number(),
    email: z.string(),
    name: z.string(),
    created_at: z.coerce.date()
  }),
  token: z.string()
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;

// Simple JWT-like token generation (in production, use proper JWT library)
const generateToken = (userId: number, email: string): string => {
  const payload = {
    userId,
    email,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

// Simple password hashing (in production, use proper bcrypt)
const hashPassword = async (password: string): Promise<string> => {
  // Simple hash for demo - in production use bcrypt
  return Buffer.from(password + 'salt').toString('base64');
};

export async function register(input: RegisterInput): Promise<AuthResponse> {
  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .limit(1)
      .execute();

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash the password (simplified for demo)
    const hashedPassword = await hashPassword(input.password);

    // Create user in database
    const result = await db
      .insert(usersTable)
      .values({
        email: input.email,
        name: input.name
        // Note: password field would need to be added to schema
        // For now, we'll proceed without storing password
      })
      .returning()
      .execute();

    const user = result[0];

    // Generate token
    const token = generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      },
      token
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}
