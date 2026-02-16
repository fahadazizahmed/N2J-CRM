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

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: { roles: true }
        });
        console.log("user", user)

        if (!user) {
            throw new NotAuthorizedError('User not found');
        }

        if (user.status !== 1) {
            throw new NotAuthorizedError('User account is inactivesss');
        }

        (req as any).user = user;
        (req as any).tokenPayload = decoded;

        next();
    } catch (e) {
        next(e);
    }
};