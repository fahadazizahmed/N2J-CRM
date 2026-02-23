import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import AdminClientService from '../services/admin.service';

export default class AdminClientController {
    private adminClientService = new AdminClientService();

    createClient = async (req: Request, res: Response): Promise<void> => {
        try {
            // Dev-only logging — never logs in production
            if (process.env.NODE_ENV !== 'production') {
                console.log('[createClient] req.body:', JSON.stringify(req.body, null, 2));
            }
            const actorId = (req as any).user?.id ?? null;
            const client = await this.adminClientService.createClient(req.body, actorId);
            // Fix: 201 Created is correct HTTP status for resource creation
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Client'), 201, client);
        } catch (e: any) {
            throw new GenericError(e, `Error in createClient ${__filename}`);
        }
    };
}
