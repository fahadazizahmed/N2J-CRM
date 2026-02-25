import { Request, Response } from 'express';
import { sendSuccessResponse } from '../../../helper/response';
import SharedAuthService from '../services/shared.service';
import { GenericError } from '../../../errors/generic-error';
import InfoMessages from '../../../common/constant/messages';

export default class SharedAuthController {
  private sharedAuthService = new SharedAuthService();

  setPassword = async (req: Request, res: Response) => {
    try {
      const result = await this.sharedAuthService.verifyTokenAndSetPassword(req.body);
      sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Password'), 200, result);
    } catch (e: any) {
      throw new GenericError(e, ` Error from SetPassword ${__filename}`);
    }
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      const result = await this.sharedAuthService.forgotPassword(req.body);
      sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Password reset email sent'), 200, result);
    } catch (e: any) {
      throw new GenericError(e, ` Error from forgotPassword ${__filename}`);
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      // Extract IP address and user agent
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const result = await this.sharedAuthService.login(res, {

        ...req.body,
        ipAddress,
        userAgent
      });
      sendSuccessResponse(res, InfoMessages.AUTH.LOGGED_IN_SUCCESSFULLY, 200, result);
    } catch (e: any) {
      throw new GenericError(e, ` Error from Login ${__filename}`);
    }
  };



  getCurrentUser = async (req: Request, res: Response) => {
    try {
      const result = await this.sharedAuthService.getCurrentUser(req, res);
      sendSuccessResponse(res, InfoMessages.AUTH.LOGGED_OUT_SUCCESSFULLY, 200, result);
    } catch (e: any) {
      throw new GenericError(e, ` Error from Logout ${__filename}`);
    }
  };


  logout = async (req: Request, res: Response) => {
    try {
      // Get user ID from authenticated request
      let userId = (req as any).user?.id;
      const result = await this.sharedAuthService.logout(req, res, req.headers, userId);
      sendSuccessResponse(res, InfoMessages.AUTH.LOGGED_OUT_SUCCESSFULLY, 200, result);
    } catch (e: any) {
      throw new GenericError(e, ` Error from Logout ${__filename}`);
    }
  };

  selectRole = async (req: Request, res: Response) => {
    try {
      let userId = (req as any).user?.id;
      const result = await this.sharedAuthService.selectRole(userId, req.body.roleId);
      sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Role'), 200, result);
    } catch (e: any) {
      throw new GenericError(e, ` Error from selectRole ${__filename}`);
    }
  };
}
