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
		try {
			// 1. Verify Token Signature
			let decoded: any;

			decoded = isValidJWT(data.token, process.env.INVITE_SECRET as string);

			if (!decoded || !decoded.id) {
				throw new BadRequestError(ErrorMessages.AUTH.INVALID_OR_EXPIRED_TOKEN);
			}

			// // 2. Find User
			const user = await prisma.user.findUnique({
				where: { id: decoded.id }
			});

			if (!user) {
				throw new UnProcessableEntityError(ErrorMessages.AUTH.USER_NOT_FOUND);
			}

			// // 3. Verify Token matches DB (Security check for one-time use)
			if (user.invite_token !== data.token) {
				throw new BadRequestError(ErrorMessages.AUTH.TOKEN_EXPIRED_OR_USED);
			}

			// // 4. Hash Password
			const hashedPassword = await bcrypt.hash(data.password, 12);

			// // 5. Update User
			const updatedUser = await prisma.user.update({
				where: { id: user.id },
				data: {
					password_hash: hashedPassword,
					status: 1, // Active
					invite_token: null // Clear token to prevent reuse
				}
			});

			return { message: "Password set successfully. You can now login.", user_id: updatedUser.id };

		} catch (e) {
			throw e;
		}
	}

	public async login(data: ILoginDTO): Promise<any> {
		try {
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

			// Audit
			await auditService.log({
				actor_id: user.id,
				action: constant.AUDIT_LOG_ACTION.LOGIN,
				entity_type: constant.ENTITY_TYPE.USER,
				entity_id: user.id,
				metadata: { email: user.email, role: data.role }
			});

			// Remove password from response
			const { password_hash, invite_token, ...userWithoutPassword } = user;

			return {
				user: userWithoutPassword,
				token
			};

		} catch (e) {
			throw e;
		}
	}
}
