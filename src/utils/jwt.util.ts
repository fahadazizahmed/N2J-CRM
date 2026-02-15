import jwt from 'jsonwebtoken';

/**
 * JWT Utility Functions
 * Handles token generation and verification for authentication
 */

interface TokenPayload {
    userId: number;
    email: string;
    role: string;
}

interface DecodedToken extends TokenPayload {
    iat: number;
    exp: number;
}

/**
 * Generate JWT token for authenticated user
 * @param userId - User's unique ID
 * @param email - User's email
 * @param role - User's role (ADMIN, DRIVER, CLIENT, etc.)
 * @returns Signed JWT token
 */
export function generateToken(userId: number, email: string, role: string): string {
    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const payload: TokenPayload = {
        userId,
        email,
        role,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    return token;
}

/**
 * Verify and decode JWT token
 * @param token - JWT token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): DecodedToken {
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
        return decoded;
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        } else {
            throw new Error('Token verification failed');
        }
    }
}
