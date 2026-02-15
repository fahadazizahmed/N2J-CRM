import { Request, Response, NextFunction } from 'express';
import { NotAuthorizedError } from '../errors/not-authorized-error';
import { verifyToken } from '../utils/jwt.util';

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
            };
        }
    }
}

/**
 * Middleware to verify JWT token from Authorization header
 * Extracts user information and attaches to request
 */
export const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new NotAuthorizedError('No token provided. Please login first.');
        }

        // Get token (remove 'Bearer ' prefix)
        const token = authHeader.substring(7);

        // Verify token
        const decoded = verifyToken(token);

        // Attach user info to request
        req.user = {
            id: decoded.userId.toString(),
            email: decoded.email,
            role: decoded.role,
        };

        console.log(`🔐 Authentication: User ${decoded.email} authenticated as ${decoded.role}`);
        next();
    } catch (error: any) {
        next(new NotAuthorizedError(error.message || 'Authentication failed'));
    }
};
