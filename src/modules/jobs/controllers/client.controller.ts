import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse, sendErrorResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import ClientJobService from '../services/client.service';
import { prisma } from '../../../connection/db';

export default class ClientJobController {
    private clientJobService = new ClientJobService();

    /**
     * GET /api/v1/job/client/my-jobs
     *
     * Returns all jobs for the currently authenticated client.
     * The clientId is derived from the JWT-decoded user (req.user.id),
     * which is then used to look up the Client record in the DB.
     */
    getMyJobs = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId: number = (req as any).user?.id;

            if (!userId) {
                sendErrorResponse(res, 'Unauthorized: user not found in token', 401);
                return;
            }

            // Resolve the Client record that belongs to this user account
            const client = await prisma.client.findUnique({
                where: { user_id: userId },
                select: { id: true },
            });

            if (!client) {
                sendErrorResponse(res, 'No client profile found for this user', 404);
                return;
            }

            const jobs = await this.clientJobService.getClientJobs(client.id);

            sendSuccessResponse(
                res,
                InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Jobs'),
                200,
                { jobs }
            );
        } catch (e: any) {
            throw new GenericError(e, `Error in getMyJobs ${__filename}`);
        }
    };
}
