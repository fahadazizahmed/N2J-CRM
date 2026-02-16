import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import AdminAuthService from '../services/admin.service';


export default class AdminAuthController {
    private adminAuthService = new AdminAuthService();

    AddNewUser = async (req: Request, res: Response) => {
        try {
            let user = await this.adminAuthService.AddNewUser(req.body);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('User'), 200, user);
        } catch (e: any) {
            throw new GenericError(e, ` Error from signup ${__filename}`);
        }
    };
}
