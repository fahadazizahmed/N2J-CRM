import InfoMessages from "../../constant/messages";
import { UnProcessableEntityError } from "../../errors/unprocessable-entity.error";
import { IUserCreateDTO } from "./auth.dto"
import User from "./user.model";

export interface IAuthService {
	signUpWithEmail: (userCreateDTO: IUserCreateDTO) => Promise<any>

}

export default class AuthService implements IAuthService {

	/* email singup service */
	public async signUpWithEmail(userCreateDTO: IUserCreateDTO): Promise<any> {
		try {
			// to throw an any error
			if (userCreateDTO.password.length < 6) throw new UnProcessableEntityError(InfoMessages.AUTH.PASSWORD_LENGTH_ERROR)

			const userCreation: any = {
				password: userCreateDTO.password,
				fullName: userCreateDTO.fullName,
				username: userCreateDTO.username,
				role: userCreateDTO.role,
			}

			await User.create(userCreation)
			return userCreateDTO

		} catch (e) {
			throw e
		}
	}

}
