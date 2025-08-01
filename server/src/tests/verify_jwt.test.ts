
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { verifyJwt } from '../handlers/verify_jwt';

// Helper function to create a test JWT token
function createTestToken(payload: any, secret: string = 'your-secret-key'): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  // Simple signature (in production, use proper HMAC-SHA256)
  const signature = Buffer.from(`${encodedHeader}.${encodedPayload}.${secret}`)
    .toString('base64url')
    .replace(/=/g, '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

describe('verifyJwt', () => {
  const originalEnv = process.env['JWT_SECRET'];

  beforeEach(() => {
    process.env['JWT_SECRET'] = 'test-secret-key';
  });

  afterEach(() => {
    if (originalEnv) {
      process.env['JWT_SECRET'] = originalEnv;
    } else {
      delete process.env['JWT_SECRET'];
    }
  });

  it('should verify a valid JWT token', async () => {
    const payload = {
      userId: 123,
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    };

    const token = createTestToken(payload, 'test-secret-key');
    const result = await verifyJwt(token);

    expect(result.userId).toBe(123);
    expect(result.email).toBe('test@example.com');
    expect(result.iat).toBe(payload.iat);
    expect(result.exp).toBe(payload.exp);
  });

  it('should handle token with id instead of userId', async () => {
    const payload = {
      id: 456,
      email: 'user@test.com',
      iat: Math.floor(Date.now() / 1000)
    };

    const token = createTestToken(payload, 'test-secret-key');
    const result = await verifyJwt(token);

    expect(result.userId).toBe(456);
    expect(result.email).toBe('user@test.com');
  });

  it('should reject empty token', async () => {
    await expect(verifyJwt('')).rejects.toThrow(/token is required/i);
  });

  it('should reject malformed token format', async () => {
    await expect(verifyJwt('invalid.token')).rejects.toThrow(/invalid token format/i);
    await expect(verifyJwt('not-a-token')).rejects.toThrow(/invalid token format/i);
  });

  it('should reject token with wrong algorithm', async () => {
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = { userId: 123, email: 'test@example.com' };
    
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = 'fake-signature';
    
    const token = `${encodedHeader}.${encodedPayload}.${signature}`;
    
    await expect(verifyJwt(token)).rejects.toThrow(/unsupported token type or algorithm/i);
  });

  it('should reject token missing userId', async () => {
    const payload = {
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000)
    };

    const token = createTestToken(payload, 'test-secret-key');
    await expect(verifyJwt(token)).rejects.toThrow(/token missing user id/i);
  });

  it('should reject token missing email', async () => {
    const payload = {
      userId: 123,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = createTestToken(payload, 'test-secret-key');
    await expect(verifyJwt(token)).rejects.toThrow(/token missing email/i);
  });

  it('should reject expired token', async () => {
    const payload = {
      userId: 123,
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 3600  // 1 hour ago (expired)
    };

    const token = createTestToken(payload, 'test-secret-key');
    await expect(verifyJwt(token)).rejects.toThrow(/token expired/i);
  });

  it('should reject token issued in the future', async () => {
    const payload = {
      userId: 123,
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000) + 120, // 2 minutes in the future
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    const token = createTestToken(payload, 'test-secret-key');
    await expect(verifyJwt(token)).rejects.toThrow(/token issued in the future/i);
  });

  it('should accept token with small clock skew', async () => {
    const payload = {
      userId: 123,
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000) + 30, // 30 seconds in the future (within allowed skew)
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    const token = createTestToken(payload, 'test-secret-key');
    const result = await verifyJwt(token);
    
    expect(result.userId).toBe(123);
  });

  it('should reject token with invalid signature', async () => {
    const payload = {
      userId: 123,
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000)
    };

    // Create token with wrong secret
    const token = createTestToken(payload, 'wrong-secret');
    await expect(verifyJwt(token)).rejects.toThrow(/invalid token signature/i);
  });

  it('should handle token without expiration', async () => {
    const payload = {
      userId: 123,
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000)
      // No exp field
    };

    const token = createTestToken(payload, 'test-secret-key');
    const result = await verifyJwt(token);

    expect(result.userId).toBe(123);
    expect(result.email).toBe('test@example.com');
    expect(result.exp).toBeUndefined();
  });

  it('should handle malformed JSON in payload', async () => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from('invalid-json').toString('base64url');
    const signature = 'fake-signature';
    
    const token = `${encodedHeader}.${encodedPayload}.${signature}`;
    
    await expect(verifyJwt(token)).rejects.toThrow(); // Accept any error for malformed JSON
  });
});
