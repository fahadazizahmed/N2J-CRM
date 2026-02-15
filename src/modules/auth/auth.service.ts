import InfoMessages from '../../constant/messages';
import { UnProcessableEntityError } from '../../errors/unprocessable-entity.error';
import { NotAuthorizedError } from '../../errors/not-authorized-error';
import { BadRequestError } from '../../errors/bad-request-error';
import { ILoginDTO, ILoginResponseDTO } from './auth.dto';
import prisma from '../../utils/prisma.util';
import { comparePassword } from '../../utils/hash.util';
import { generateToken } from '../../utils/jwt.util';

export interface IAuthService {
	login: (loginDTO: ILoginDTO) => Promise<ILoginResponseDTO>;
	logout: (token: string) => Promise<void>;
}

export default class AuthService implements IAuthService {
	/**
	 * User Login Service
	 * Authenticates user (any role) and generates JWT token
	 */
	public async login(loginDTO: ILoginDTO): Promise<ILoginResponseDTO> {
		try {
			// Normalize email to lowercase
			const { email: rawEmail, password, role } = loginDTO;
			const email = rawEmail.toLowerCase().trim();

			// Step 1: Check if email exists in database (with any role)
			const emailExists = await prisma.user.findFirst({
				where: { email },
			});

			if (!emailExists) {
				throw new NotAuthorizedError('Invalid email or password');
			}

			// Step 2: Find user with specific email+role combination
			const user = await prisma.user.findUnique({
				where: {
					email_role_unique: {
						email,
						role: role as any,
					},
				},
			});

			if (!user) {
				throw new NotAuthorizedError(`This email does not have ${role} role`);
			}

			// Step 3: Verify password
			const isPasswordValid = await comparePassword(password, user.password);

			if (!isPasswordValid) {
				throw new NotAuthorizedError('Invalid email or password');
			}

			// Step 4: Generate JWT token
			const token = generateToken(user.id, user.email, user.role);

			// Step 5: Create session record in database
			await prisma.userSession.create({
				data: {
					userId: user.id,
					sessionToken: token,
					ipAddress: null, // Can be added via req.ip if needed
					status: 1, // Active
				},
			});

			// Step 6: Return token and user info (excluding password)
			return {
				token,
				user: {
					id: user.id,
					email: user.email,
					role: user.role,
					createdAt: user.createdAt,
				},
			};
		} catch (e) {
			throw e;
		}
	}

	/**
	 * User Logout Service
	 * Updates session status to inactive (0) and records logout time
	 */
	public async logout(token: string): Promise<void> {
		try {
			// Find session by token
			const session = await prisma.userSession.findUnique({
				where: { sessionToken: token },
			});

			if (!session) {
				throw new NotAuthorizedError('Invalid session token');
			}

			// Check if already logged out
			if (session.status === 0) {
				throw new BadRequestError('Session already logged out');
			}

			// Update session: mark as inactive and record logout time
			await prisma.userSession.update({
				where: { sessionToken: token },
				data: {
					status: 0, // Inactive
					logoutAt: new Date(),
				},
			});
		} catch (e) {
			throw e;
		}
	}
}
