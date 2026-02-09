import { Request, Response } from 'express';
import AuthService from './auth.service';
import { GenericError } from '../../errors/generic-error';
import { sendSuccessResponse } from '../../helper/response';
import InfoMessages from '../../constant/messages';

export default class AuthController {
  private authService = new AuthService();

  /**
   * User Login Handler
   * POST /api/v1/auth/login
   */
  login = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.login(req.body);

      sendSuccessResponse(
        res,
        'Login successful',
        200,
        result
      );
    } catch (e: any) {
      throw new GenericError(e, `Error from login ${__filename}`);
    }
  };
}
