import InfoMessages from '../../constant/messages';
import { UnProcessableEntityError } from '../../errors/unprocessable-entity.error';
import { NotAuthorizedError } from '../../errors/not-authorized-error';
import { BadRequestError } from '../../errors/bad-request-error';
import { IUserCreateDTO, ILoginDTO, ILoginResponseDTO } from './auth.dto';
import User from './user.model';
import prisma from '../../utils/prisma.util';
import { comparePassword } from '../../utils/hash.util';
import { generateToken } from '../../utils/jwt.util';

export interface IAuthService {
	signUpWithEmail: (userCreateDTO: IUserCreateDTO) => Promise<IUserCreateDTO>;
	login: (loginDTO: ILoginDTO) => Promise<ILoginResponseDTO>;
}

export default class AuthService implements IAuthService {
	/* email singup service */
	public async signUpWithEmail(userCreateDTO: IUserCreateDTO): Promise<any> {
		try {
			// to throw an any error
			if (userCreateDTO.password.length < 6)
				throw new UnProcessableEntityError(InfoMessages.AUTH.PASSWORD_LENGTH_ERROR);

			const userCreation: any = {
				password: userCreateDTO.password,
				fullName: userCreateDTO.fullName,
				username: userCreateDTO.username,
				role: userCreateDTO.role,
			};

			await User.create(userCreation);
			return userCreateDTO;
		} catch (e) {
			throw e;
		}
	}

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

			// Step 5: Return token and user info (excluding password)
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
}
