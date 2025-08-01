
import { type JwtPayload } from '../schema';

export async function verifyJwt(token: string): Promise<JwtPayload> {
  if (!token) {
    throw new Error('Token is required');
  }

  const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';
  
  try {
    // Split JWT into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [header, payload, signature] = parts;

    // Decode header and payload
    const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString());
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());

    // Basic header validation
    if (decodedHeader.alg !== 'HS256' || decodedHeader.typ !== 'JWT') {
      throw new Error('Unsupported token type or algorithm');
    }

    // Validate required payload fields
    if (!decodedPayload.userId && !decodedPayload.id) {
      throw new Error('Token missing user ID');
    }

    if (!decodedPayload.email) {
      throw new Error('Token missing email');
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < now) {
      throw new Error('Token expired');
    }

    // Check if token is issued in the future (clock skew protection)
    if (decodedPayload.iat && decodedPayload.iat > now + 60) { // Allow 60 seconds clock skew
      throw new Error('Token issued in the future');
    }

    // Simple signature verification (in production, use proper HMAC-SHA256)
    const expectedSignature = Buffer.from(`${header}.${payload}.${JWT_SECRET}`)
      .toString('base64url')
      .replace(/=/g, '');
    
    if (signature !== expectedSignature) {
      throw new Error('Invalid token signature');
    }

    return {
      userId: decodedPayload.userId || decodedPayload.id,
      email: decodedPayload.email,
      iat: decodedPayload.iat,
      exp: decodedPayload.exp
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Invalid or malformed token');
  }
}
