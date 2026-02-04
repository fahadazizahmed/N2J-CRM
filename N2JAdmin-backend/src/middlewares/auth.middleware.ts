import { Request, Response, NextFunction } from 'express';
import { NotAuthorizedError } from '../errors/not-authorized-error';

/**
 * Mock Authentication Middleware
 * For now, this is a mock that simulates an authenticated admin user
 * TODO: Replace with real JWT authentication
 */

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
                fullName: string;
            };
        }
    }
}

/**
 * Mock middleware to simulate authenticated admin user
 * TODO: Replace with real JWT verification
 */
export const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
    try {
        // Mock authenticated admin user
        // TODO: add DB queries here to verify token and get real user
        req.user = {
            id: 'mock-admin-id-123',
            email: 'admin@n2jcrm.com',
            fullName: 'Mock Admin',
            role: 'ADMIN',
        };

        console.log('🔐 Mock Authentication: User authenticated as ADMIN');
        next();
    } catch (error) {
        next(new NotAuthorizedError('Authentication failed'));
    }
};
