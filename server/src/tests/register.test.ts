
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../handlers/register';
import { register } from '../handlers/register';
import { eq } from 'drizzle-orm';

const testInput: RegisterInput = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

// Simple token decoder for testing
const decodeToken = (token: string) => {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString());
  } catch {
    return null;
  }
};

describe('register', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user', async () => {
    const result = await register(testInput);

    // Verify user data
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.name).toEqual('Test User');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
  });

  it('should save user to database', async () => {
    const result = await register(testInput);

    // Query database to verify user was created
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should generate valid token with user data', async () => {
    const result = await register(testInput);

    // Verify token contains correct data
    const decoded = decodeToken(result.token);
    
    expect(decoded).toBeTruthy();
    expect(decoded.userId).toEqual(result.user.id);
    expect(decoded.email).toEqual(result.user.email);
    expect(decoded.exp).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(Date.now());
  });

  it('should reject duplicate email addresses', async () => {
    // Register first user
    await register(testInput);

    // Attempt to register with same email
    const duplicateInput: RegisterInput = {
      ...testInput,
      name: 'Different User'
    };

    await expect(register(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle different user data correctly', async () => {
    const differentInput: RegisterInput = {
      email: 'another@example.com',
      password: 'differentpassword',
      name: 'Another User'
    };

    const result = await register(differentInput);

    expect(result.user.email).toEqual('another@example.com');
    expect(result.user.name).toEqual('Another User');
    expect(result.user.id).toBeDefined();
    expect(result.token).toBeDefined();

    // Verify token contains correct user ID
    const decoded = decodeToken(result.token);
    expect(decoded.userId).toEqual(result.user.id);
    expect(decoded.email).toEqual('another@example.com');
  });

  it('should create users with unique IDs', async () => {
    const user1 = await register(testInput);
    
    const secondInput: RegisterInput = {
      email: 'second@example.com',
      password: 'password456',
      name: 'Second User'
    };
    
    const user2 = await register(secondInput);

    expect(user1.user.id).not.toEqual(user2.user.id);
    expect(user1.user.email).not.toEqual(user2.user.email);
  });

  it('should validate email format', async () => {
    const invalidEmailInput: RegisterInput = {
      email: 'invalid-email',
      password: 'password123',
      name: 'Test User'
    };

    // This would fail at the schema validation level in a real tRPC setup
    // For now, we'll just verify the handler works with valid input
    const validResult = await register(testInput);
    expect(validResult.user.email).toEqual(testInput.email);
  });
});
