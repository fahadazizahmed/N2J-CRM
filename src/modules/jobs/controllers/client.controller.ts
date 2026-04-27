import { Request, Response } from 'express';
import { sendSuccessResponse } from '../../../helper/response';
import { GenericError } from '../../../errors/generic-error';
import InfoMessages from '../../../common/constant/messages';
import ClientJobService from '../services/client.service';

export default class ClientJobController {
    private clientJobService = new ClientJobService();

    getClientJobs = async (req: Request, res: Response) => {
        try {
            // Assumes user ID is set by authentication middleware
            const userId = (req as any).user?.id;
            const jobs = await this.clientJobService.getClientJobs(userId);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Client Jobs'), 200, jobs);
        } catch (e: any) {
            throw new GenericError(e, ` Error in getClientJobs ${__filename}`);
        }
    };
}
