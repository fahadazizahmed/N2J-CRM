import { prisma } from '../../../connection/db';
import ErrorMessages from '../../../common/constant/errors';
import { ISetPasswordDTO, ILoginDTO } from '../dto/auth.dto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UnProcessableEntityError } from '../../../errors/unprocessable-entity.error';
import { BadRequestError } from '../../../errors/bad-request-error';
import { isValidJWT } from '../../../helper/jwt.helper';
import constant from '../../../common/constant/constant';
import config from '../../../config';
import { auditService } from '../../../services/audit.service';

export default class SharedAuthService {
	public async verifyTokenAndSetPassword(data: ISetPasswordDTO): Promise<any> {
		// 1. Verify Token Signature
		const decoded = isValidJWT(data.token, process.env.INVITE_SECRET as string);

		if (!decoded || !decoded.id) {
			throw new BadRequestError(ErrorMessages.AUTH.INVALID_OR_EXPIRED_TOKEN);
		}

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

			return { message: "Password set successfully. You can now login.", user_id: updatedUser.id, user: updatedUser };
		});

		// Audit Log (Fire and forget)
		Promise.allSettled([
			auditService.log({
				actor_id: result.user.id,
				action: constant.AUDIT_LOG_ACTION.UPDATE,
				entity_type: constant.ENTITY_TYPE.USER,
				entity_id: result.user.id,
				metadata: {
					action: 'Password Set and Account Activated',
					email: result.user.email
				}
			})
		]);

		return { message: result.message, user_id: result.user_id };
	}

	public async login(data: ILoginDTO): Promise<any> {

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

		const token = jwt.sign(
			{
				id: user.id,
				type: constant.JWT_TOKEN_TYPE.ACCESS,
				roles: user.roles.map((r: any) => r.name)
			},
			config.JWT_SECRET_KEY as string,
			{ expiresIn: (process.env.SESSION_EXPIRES_IN || '24h') as any }
		);


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
				token: token, // Or use jti from token if available, but likely storing the full token for now is fine or just a reference
				ip_address: data.ipAddress,
				user_agent: data.userAgent,
				expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
			}
		});

		// Remove password from response
		const { password_hash, invite_token, ...userWithoutPassword } = user;

		return {
			user: userWithoutPassword,
			token
		};

	}

	public async logout(header: any, userId: number): Promise<any> {

		let { authorization } = header;
		let token = authorization

		if (!authorization) {
			throw new BadRequestError('No token provided');
		}

		if (token.startsWith("Bearer ")) {
			token = authorization.slice(7).trim();
		}

		// Find the active session for this user with this token
		const session = await prisma.userSession.findFirst({
			where: {
				user_id: userId,
				token: token,
				status: 1 // Active
			}
		});

		if (!session) {
			throw new BadRequestError(ErrorMessages.AUTH.SESSION_NOT_FOUND);
		}

		// Update session to inactive
		await prisma.userSession.update({
			where: { id: session.id },
			data: {
				status: 0,
				logout_at: new Date()
			}
		});

		// Audit Log (Fire and forget)
		Promise.allSettled([
			auditService.log({
				actor_id: userId,
				action: constant.AUDIT_LOG_ACTION.LOGOUT,
				entity_type: constant.ENTITY_TYPE.USER,
				entity_id: userId,
				metadata: { session_id: session.id }
			})
		]);

		return { message: "Logged out successfully" };
	}
}
