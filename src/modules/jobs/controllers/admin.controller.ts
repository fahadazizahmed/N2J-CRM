import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { BadRequestError } from '../../../errors/bad-request-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import AdminJobService from '../services/admin.service';

export default class AdminJobController {
    private adminJobService = new AdminJobService();

    private actorId = (req: Request): number | null => (req as any).user?.id ?? null;
    private contractId = (req: Request): number => Number(req.params.id);
    private rateId = (req: Request): number => Number(req.params.rateId);


    // POST /api/v1/admin/job
    createJob = async (req: Request, res: Response): Promise<void> => {
        try {
            const job = await this.adminJobService.createJob(req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Job'), 201, job);
        } catch (e: any) {
            throw new GenericError(e, `Error in createJob ${__filename}`);
        }
    };

    // PUT /api/v1/admin/job/:id
    updateJob = async (req: Request, res: Response): Promise<void> => {
        try {
            const job = await this.adminJobService.updateJob(Number(req.params.id), req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Job'), 200, job);
        } catch (e: any) {
            throw new GenericError(e, `Error in updateJob ${__filename}`);
        }
    };

    // GET /api/v1/admin/job/:id
    getJobById = async (req: Request, res: Response): Promise<void> => {
        try {
            const job = await this.adminJobService.getJobById(Number(req.params.id));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Job'), 200, job);
        } catch (e: any) {
            throw new GenericError(e, `Error in getJobById ${__filename}`);
        }
    };

    // GET /api/v1/admin/job
    getJobs = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.adminJobService.getJobs(req.query as any);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Jobs'), 200, result);
        } catch (e: any) {
            throw new GenericError(e, `Error in getJobs ${__filename}`);
        }
    };
}
