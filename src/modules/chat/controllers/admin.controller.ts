import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import AdminMessageService from '../services/admin.service';

export default class AdminMessageController {
    private adminMessageService = new AdminMessageService();

    private actorId = (req: Request): number | null => (req as any).user?.id ?? null;

    // POST /api/v1/admin/message/send-message
    sendMessage = async (req: Request, res: Response): Promise<void> => {
        try {
            const message = await this.adminMessageService.sendMessage(req.body as any, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Message'), 201, message);
        } catch (e: any) {
            throw new GenericError(e, `Error in sendMessage ${__filename}`);
        }
    };

    // GET /api/v1/admin/message/:jobId
    getMessages = async (req: Request, res: Response): Promise<void> => {
        try {
            const jobId = parseInt(req.params.jobId as string, 10);
            const messages = await this.adminMessageService.getMessages(jobId);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Messages'), 200, messages);
        } catch (e: any) {
            throw new GenericError(e, `Error in getMessages ${__filename}`);
        }
    };
}
