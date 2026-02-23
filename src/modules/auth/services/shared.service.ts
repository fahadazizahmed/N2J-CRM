import { prisma } from '../../../connection/db';
import ErrorMessages from '../../../common/constant/errors';
import { ISetPasswordDTO, ILoginDTO, IForgotPasswordDTO } from '../dto/auth.dto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UnProcessableEntityError } from '../../../errors/unprocessable-entity.error';
import { BadRequestError } from '../../../errors/bad-request-error';
import { isValidJWT } from '../../../helper/jwt.helper';
import constant from '../../../common/constant/constant';
import config from '../../../config';
import { auditService } from '../../../services/audit.service';
import { Response, Request } from 'express';
import { emailService } from '../../../services/email.service';

export default class SharedAuthService {
	public async verifyTokenAndSetPassword(data: ISetPasswordDTO): Promise<any> {
		// 1. Verify Token Signature
		const decoded: any = isValidJWT(data.token, process.env.INVITE_SECRET as string);

		if (!decoded || !decoded.id) {
			throw new BadRequestError(ErrorMessages.AUTH.INVALID_OR_EXPIRED_TOKEN);
		}

		const isForgot = decoded.type === constant.JWT_TOKEN_TYPE.FORGOT;

		// 2. Hash Password (outside transaction to reduce lock time)
		const hashedPassword = await bcrypt.hash(data.password, 12);

		const result = await prisma.$transaction(async (tx) => {
			// 3. Find User
			const user = await tx.user.findUnique({
				where: { id: decoded.id }
			});

			if (!user) {
				throw new UnProcessableEntityError(ErrorMessages.AUTH.USER_NOT_FOUND);
			}

			// 4. Verify Token matches DB
			// Check if token exists on user (it might be null if already used)
			if (!user.invite_token) {
				throw new BadRequestError(ErrorMessages.AUTH.TOKEN_EXPIRED_OR_USED);
			}

			const isTokenValid = await bcrypt.compare(data.token, user.invite_token);
			if (!isTokenValid) {
				throw new BadRequestError(ErrorMessages.AUTH.TOKEN_EXPIRED_OR_USED);
			}

			// 5. Update User
			const updatedUser = await tx.user.update({
				where: { id: user.id },
				data: {
					password_hash: hashedPassword,
					status: 1, // Active
					invite_token: null // Clear token to prevent reuse
				}
			});

			return {
				message: isForgot ? "Password reset successfully. You can now login." : "Password set successfully. You can now login.",
				user_id: updatedUser.id,
				user: updatedUser
			};
		});

		// Audit Log (Fire and forget)
		Promise.allSettled([
			auditService.log({
				actor_id: result.user.id,
				action: constant.AUDIT_LOG_ACTION.UPDATE,
				entity_type: constant.ENTITY_TYPE.USER,
				entity_id: result.user.id,
				metadata: {
					action: isForgot ? 'Password Reset' : 'Password Set and Account Activated',
					email: result.user.email
				}
			})
		]);

		return { message: result.message, user_id: result.user_id };
	}




	public async forgotPassword(data: IForgotPasswordDTO): Promise<any> {
		const user = await prisma.user.findUnique({
			where: { email: data.email }
		});

		if (!user) {
			// Do not throw an error to prevent user enumeration
			return { message: "If your email is registered, you will receive a password reset link." };
		}

		if (user.status !== 1) {
			throw new BadRequestError(ErrorMessages.AUTH.ACCOUNT_INACTIVE);
		}

		// Generate a new token using INVITE_SECRET so it works with verifyTokenAndSetPassword
		const resetToken = jwt.sign(
			{
				id: user.id,
				type: constant.JWT_TOKEN_TYPE.FORGOT// Can be anything, verifyTokenAndSetPassword only checks valid JWT and signature
			},
			process.env.INVITE_SECRET as string,
			{ expiresIn: (process.env.PASSWORD_SESSION_EXPIRES_IN || '24h') as any }
		);

		const hashedToken = await bcrypt.hash(resetToken, 12);

		// Update user with the hashed reset token
		await prisma.user.update({
			where: { id: user.id },
			data: { invite_token: hashedToken }
		});

		// Send Email (Fire and forget)
		const resetLink = `${process.env.FRONT_END_DOMAIN}/set-password?token=${resetToken}`;

		Promise.allSettled([
			emailService.sendEmailWithRetry(
				user.email,
				config.FORGOT_PASSWORD_EMAIL.subject,
				config.FORGOT_PASSWORD_EMAIL.content(resetLink),
				constant.ENTITY_TYPE.USER,
				user.id
			),
			auditService.logWithRetry({
				actor_id: user.id,
				action: constant.AUDIT_LOG_ACTION.UPDATE,
				entity_type: constant.ENTITY_TYPE.USER,
				entity_id: user.id,
				metadata: {
					action: 'Password Reset Requested',
					email: user.email
				}
			})
		]);

		return { message: "If your email is registered, you will receive a password reset link." };
	}

	public async login(res: Response, data: ILoginDTO): Promise<any> {

		const user = await prisma.user.findUnique({
			where: { email: data.email },
			include: { roles: true }
		});

		if (!user) {
			throw new BadRequestError(ErrorMessages.AUTH.INVALID_CREDENTIALS);
		}

		const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);
		if (!isPasswordValid) {
			throw new BadRequestError(ErrorMessages.AUTH.INVALID_CREDENTIALS);
		}

		if (user.status !== 1) {
			throw new BadRequestError(ErrorMessages.AUTH.ACCOUNT_INACTIVE);
		}

		if (data.role) {
			const hasRole = user.roles.some((r: any) => r.name === data.role);
			if (!hasRole) {
				throw new BadRequestError(ErrorMessages.AUTH.NO_ACCESS_TO_LOGIN_AS(data.role));
			}
		}


		const accessToken = jwt.sign(
			{
				id: user.id,
				type: constant.JWT_TOKEN_TYPE.ACCESS,
			},
			config.JWT_ACCESS_TOKEN_SECRET_KEY as string,
			{ expiresIn: (process.env.ACCESS_SESSION_EXPIRES_IN || '15m') as any }
		);

		const refreshToken = jwt.sign(
			{
				id: user.id,
				type: constant.JWT_TOKEN_TYPE.REFRESH,
			},
			config.JWT_REFRESH_TOKEN_SECRET_KEY as string,
			{ expiresIn: (process.env.REFRESH_SESSION_EXPIRES_IN || '7d') as any }
		);

		const hashedToken = await bcrypt.hash(refreshToken, 12);

		// Audit Log (Fire and forget)
		Promise.allSettled([
			auditService.log({
				actor_id: user.id,
				action: constant.AUDIT_LOG_ACTION.LOGIN,
				entity_type: constant.ENTITY_TYPE.USER,
				entity_id: user.id,
				metadata: { email: user.email, role: data.role }
			})
		]);

		// Create Session
		await prisma.userSession.create({
			data: {
				user_id: user.id,
				token: hashedToken, // Or use jti from token if available, but likely storing the full token for now is fine or just a reference
				ip_address: data.ipAddress,
				user_agent: data.userAgent,
				expires_at: new Date(Date.now() + constant.REFRESH_TOKEN_COOKIES_EXPIRY),
			}
		});

		const isProduction = process.env.NODE_ENV === "production";

		// 🔥 Set Cookies
		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			secure: isProduction,
			sameSite: isProduction ? "strict" : "lax", // lax works for localhost
			maxAge: constant.ACCESS_TOKEN_COOKIES_EXPIRY
		});

		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: isProduction,
			sameSite: isProduction ? "strict" : "lax",
			maxAge: constant.REFRESH_TOKEN_COOKIES_EXPIRY
		});

		const { password_hash, invite_token, ...safeUser } = user;

		return {
			user: safeUser
		};

	}


	public async getCurrentUser(req: Request, res: Response): Promise<any> {

		let userSession = (req as any).user;

		const user = await prisma.user.findUnique({
			where: { id: userSession.id },
			include: { roles: true }
		});

		const { password_hash, invite_token, ...safeUser } = user!;
		return safeUser

	}

	public async logout(req: Request, res: Response, header: any, userId: number): Promise<any> {
		const accessToken = req.cookies?.accessToken;
		const refreshToken = req.cookies?.refreshToken;

		if (!accessToken && !refreshToken) {
			throw new BadRequestError("No active session found");
		}

		// Find active session by refresh token (hashed)
		const sessions = await prisma.userSession.findMany({
			where: {
				status: 1,
			},
		});

		let validSession = null;

		for (const session of sessions) {
			if (refreshToken) {
				const match = await bcrypt.compare(refreshToken, session.token);
				if (match) {
					validSession = session;
					break;
				}
			}
		}

		if (!validSession) {
			throw new BadRequestError("Session not found or already logged out");
		}

		// Mark session as inactive
		await prisma.userSession.update({
			where: { id: validSession.id },
			data: { status: 0, logout_at: new Date() },
		});

		// Clear cookies
		res.clearCookie("accessToken");
		res.clearCookie("refreshToken");

		// Audit Log (Fire and forget)
		Promise.allSettled([
			auditService.log({
				actor_id: userId,
				action: constant.AUDIT_LOG_ACTION.LOGOUT,
				entity_type: constant.ENTITY_TYPE.USER,
				entity_id: userId,
				metadata: { session_id: validSession.id }
			})
		]);

		return { message: "Logged out successfully" };
	}
}
