
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { login } from '../handlers/login';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

// Simple JWT verification function for testing
function verifySimpleJWT(token: string): { userId: number; email: string; exp: number } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const payload = JSON.parse(atob(parts[1]));
  
  // Verify signature (simple check)
  const expectedSignature = btoa(`${parts[0]}.${parts[1]}.${JWT_SECRET}`);
  if (parts[2] !== expectedSignature) {
    throw new Error('Invalid token signature');
  }

  return payload;
}

// Test input
const testLoginInput = {
  email: 'test@example.com',
  password: 'testpassword'
};

// Test user data
const testUser = {
  email: 'test@example.com',
  name: 'Test User'
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = users[0];

    // Attempt login
    const result = await login(testLoginInput);

    // Verify response structure
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');

    // Verify user data
    expect(result.user.id).toEqual(createdUser.id);
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.created_at).toBeInstanceOf(Date);
  });

  it('should generate valid JWT token', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = users[0];

    // Attempt login
    const result = await login(testLoginInput);

    // Verify JWT token
    const decoded = verifySimpleJWT(result.token);
    expect(decoded.userId).toEqual(createdUser.id);
    expect(decoded.email).toEqual('test@example.com');
    expect(decoded.exp).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should throw error for non-existent user', async () => {
    // Attempt login without creating user
    await expect(login(testLoginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for invalid email format', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const invalidInput = {
      email: 'wrong@example.com',
      password: 'testpassword'
    };

    // Attempt login with wrong email
    await expect(login(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should save user correctly in database', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = users[0];

    // Verify user was saved correctly
    expect(createdUser.email).toEqual('test@example.com');
    expect(createdUser.name).toEqual('Test User');
    expect(createdUser.id).toBeDefined();
    expect(createdUser.created_at).toBeInstanceOf(Date);

    // Attempt login
    const result = await login(testLoginInput);
    expect(result.user.id).toEqual(createdUser.id);
  });

  it('should handle token parsing correctly', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Attempt login
    const result = await login(testLoginInput);

    // Verify token structure
    const tokenParts = result.token.split('.');
    expect(tokenParts).toHaveLength(3);

    // Verify each part is base64 encoded
    expect(() => atob(tokenParts[0])).not.toThrow();
    expect(() => atob(tokenParts[1])).not.toThrow();
    
    // Verify header
    const header = JSON.parse(atob(tokenParts[0]));
    expect(header.alg).toEqual('HS256');
    expect(header.typ).toEqual('JWT');
  });
});
