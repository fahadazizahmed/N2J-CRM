import { Request, Response } from "express"
import AuthService from "./auth.service"
import { GenericError } from "../../errors/generic-error"
import { sendSuccessResponse } from "../../helper/response";
import InfoMessages from "../../constant/messages";

export default class AuthController {


	private authService = new AuthService();

	userSignUp = async (req: Request, res: Response) => {

		try {
			let user = await this.authService.signUpWithEmail(req.body)
			sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY("User"), 200, user)
		} catch (e: any) {
			throw new GenericError(e, ` Error from signup ${__filename}`)
		}
	}


}
