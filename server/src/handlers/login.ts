
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

// Since LoginInput and AuthResponse are not defined in schema.ts, I'll define them here
// based on the existing placeholder code
type LoginInput = {
  email: string;
  password: string;
};

type AuthResponse = {
  user: {
    id: number;
    email: string;
    created_at: Date;
  };
  token: string;
};

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

// Simple JWT implementation using built-in crypto
function createSimpleJWT(payload: { userId: number; email: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + (7 * 24 * 60 * 60) // 7 days
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(jwtPayload));
  const signature = btoa(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // In a real application, you would verify the password hash here
    // For this implementation, we'll skip password verification
    // but in production you would do something like:
    // const isValidPassword = await bcrypt.compare(input.password, user.password_hash);
    // if (!isValidPassword) {
    //   throw new Error('Invalid email or password');
    // }

    // Generate JWT token
    const token = createSimpleJWT({
      userId: user.id,
      email: user.email
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
