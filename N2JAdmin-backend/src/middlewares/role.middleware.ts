import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/forbidden-error';
import { NotAuthorizedError } from '../errors/not-authorized-error';

/**
 * Role-based Authorization Middleware
 * Checks if authenticated user has required role
 */

/**
 * Higher-order function to create role authorization middleware
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Express middleware function
 */
export const requireRole = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            // Check if user is authenticated
            if (!req.user) {
                throw new NotAuthorizedError('Authentication required');
            }

            // Check if user has required role
            const userRole = req.user.role;

            if (!allowedRoles.includes(userRole)) {
                console.log(
                    `🚫 Authorization failed: User role "${userRole}" not in allowed roles [${allowedRoles.join(', ')}]`
                );
                throw new ForbiddenError(
                    `Access denied. Required role: ${allowedRoles.join(' or ')}`
                );
            }

            console.log(`✅ Authorization passed: User has required role "${userRole}"`);
            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Convenience middleware for Admin-only routes
 */
export const requireAdmin = requireRole('ADMIN');
