
import { Request, Response } from 'express';
import { sendSuccessResponse } from '../../../helper/response';

export default class DriverAuthController {
    login = async (req: Request, res: Response) => {
        sendSuccessResponse(res, 'Driver Login Placeholder', 200, {});
    };
}
