import { Request, Response } from 'express';
import { sendSuccessResponse } from '../../../helper/response';
import SharedAuthService from '../services/shared.service';
import { GenericError } from '../../../errors/generic-error';

export default class SharedAuthController {
  private sharedAuthService = new SharedAuthService();

  SetPassword = async (req: Request, res: Response) => {
    try {
      const result = await this.sharedAuthService.verifyTokenAndSetPassword(req.body);
      sendSuccessResponse(res, "Password set successfully.", 200, result);
    } catch (e: any) {
      throw new GenericError(e, ` Error from SetPassword ${__filename}`);
    }
  };

  Login = async (req: Request, res: Response) => {
    try {
      const result = await this.sharedAuthService.login(req.body);
      sendSuccessResponse(res, "Logged in successfully.", 200, result);
    } catch (e: any) {
      throw new GenericError(e, ` Error from Login ${__filename}`);
    }
  };
}
