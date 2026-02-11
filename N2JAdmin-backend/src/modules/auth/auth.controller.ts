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

  /**
   * User Logout Handler
   * POST /api/v1/auth/logout
   */
  logout = async (req: Request, res: Response) => {
    try {
      // Extract JWT token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];

      await this.authService.logout(token);

      sendSuccessResponse(
        res,
        'Logout successful',
        200,
        {}
      );
    } catch (e: any) {
      throw new GenericError(e, `Error from logout ${__filename}`);
    }
  };
}
