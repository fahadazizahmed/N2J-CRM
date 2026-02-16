import { Request, Response, NextFunction } from 'express';
import { prisma } from '../connection/db';
import { isValidJWT } from '../helper/jwt.helper';
import config from '../config';
import { NotAuthorizedError } from '../errors';

export const authentication = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let { authorization } = req.headers;

        if (!authorization) {
            throw new NotAuthorizedError('Authorization token missing');
        }

        if (authorization.startsWith("Bearer ")) {
            authorization = authorization.slice(7).trim();
        }

        const decoded = isValidJWT(authorization, config.JWT_SECRET_KEY as string);

        if (!decoded) {
            throw new NotAuthorizedError('Invalid or expired token');
        }

        // Check if session exists and is active
        const session = await prisma.userSession.findFirst({
            where: {
                token: authorization,
                user_id: decoded.id,
                status: 1, // Active
                expires_at: {
                    gt: new Date() // Not expired
                }
            }
        });

        if (!session) {
            throw new NotAuthorizedError('Session not found or expired. Please login again.');
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: { roles: true }
        });

        if (!user) {
            throw new NotAuthorizedError('User not found');
        }

        if (user.status !== 1) {
            throw new NotAuthorizedError('User account is inactive');
        }

        (req as any).user = user;
        (req as any).tokenPayload = decoded;

        next();
    } catch (e) {
        next(e);
    }
};