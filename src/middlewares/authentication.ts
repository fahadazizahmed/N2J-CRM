import { Request, Response, NextFunction } from 'express';
import { prisma } from '../connection/db';
import { isValidJWT } from '../helper/jwt.helper';
import config from '../config';
import jwt from 'jsonwebtoken';
import constant from '../common/constant/constant';
import { sendErrorResponse } from '../helper/response';
import bcrypt from 'bcrypt';


export const authentication = async (req: Request, res: Response, next: NextFunction) => {

    try {

        const accessToken = req.cookies?.accessToken;
        const refreshToken = req.cookies?.refreshToken;

        if (accessToken) {
            const decoded: any = isValidJWT(
                accessToken,
                config.JWT_ACCESS_TOKEN_SECRET_KEY as string
            );
            if (decoded) {
                const user = await prisma.user.findUnique({
                    where: { id: decoded.id },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        roles: true,
                        active_role:true
                    },
                });

                if (!user) {
                    res.clearCookie("accessToken");
                    res.clearCookie("refreshToken");
                    return sendErrorResponse(res, "User not found", 401);
                }

                (req as any).user = user;
                return next();
            }

        }

        if (!refreshToken) {

            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            return sendErrorResponse(res, "Session expired", 401);
        }

        const decodedRefresh: any = isValidJWT(
            refreshToken,
            config.JWT_REFRESH_TOKEN_SECRET_KEY as string
        );
        console.log("decodedRefresh", decodedRefresh);
        if (!decodedRefresh) {

            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            return sendErrorResponse(res, "Invalid refresh token", 401);
        }


        const sessions = await prisma.userSession.findMany({
            where: {
                user_id: decodedRefresh.id,
                status: 1,
                expires_at: {
                    gt: new Date(),
                },
            },
        });


        let validSession = null;

        for (const session of sessions) {

            const match = await bcrypt.compare(refreshToken, session.token);

            if (match) {
                validSession = session;
                break;
            }
        }

        if (!validSession) {
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            return sendErrorResponse(res, "Session revoked or expired", 401);
        }
        // Invalidate old session
        await prisma.userSession.update({
            where: { id: validSession.id },
            data: { status: 0 },
        });

        const newAccessToken = jwt.sign(
            {
                id: decodedRefresh.id,
                type: constant.JWT_TOKEN_TYPE.ACCESS,
            },
            config.JWT_ACCESS_TOKEN_SECRET_KEY as string,
            { expiresIn: (process.env.ACCESS_SESSION_EXPIRES_IN || '15m') as any }
        );

        const newRefreshToken = jwt.sign(
            {
                id: decodedRefresh.id,
                type: constant.JWT_TOKEN_TYPE.REFRESH,
            },
            config.JWT_REFRESH_TOKEN_SECRET_KEY as string,
            { expiresIn: (process.env.REFRESH_SESSION_EXPIRES_IN || '7d') as any }
        );

        const hashedRefresh = await bcrypt.hash(newRefreshToken, 12);

        await prisma.userSession.create({
            data: {
                user_id: decodedRefresh.id,
                token: hashedRefresh,
                status: 1,
                expires_at: new Date(
                    Date.now() + constant.REFRESH_TOKEN_COOKIES_EXPIRY
                ),
            },
        });


        const isProduction = process.env.NODE_ENV === "production";
        let sameSiteValue: 'strict' | 'lax' | 'none' =
            (process.env.COOKIE_SAMESITE as 'strict' | 'lax' | 'none')
            || (isProduction ? 'strict' : 'lax');

        res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: sameSiteValue == "none" ? true : isProduction,
            sameSite: sameSiteValue,
            maxAge: constant.ACCESS_TOKEN_COOKIES_EXPIRY,
        });

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: sameSiteValue == "none" ? true : isProduction,
            sameSite:sameSiteValue,
            maxAge: constant.REFRESH_TOKEN_COOKIES_EXPIRY,
        });


        const user = await prisma.user.findUnique({
            where: { id: decodedRefresh.id },
            select: {
                id: true,
                name: true,
                email: true,
                roles: true,
                active_role:true
            },
        });

        if (!user) {
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            return sendErrorResponse(res, "User not found", 401);
        }

        (req as any).user = user;
        return next();

    } catch (error) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        console.error("Authentication error:", error);
        return sendErrorResponse(res, "Authentication failed", 401);
    }
};