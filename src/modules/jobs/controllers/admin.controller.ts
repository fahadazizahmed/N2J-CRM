import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import AdminJobService from '../services/admin.service';

export default class AdminJobController {
    private adminJobService = new AdminJobService();

    private actorId = (req: Request): number | null => (req as any).user?.id ?? null;

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

    // PUT /api/v1/admin/job/update-job-status/:id
    updateJobStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            const job = await this.adminJobService.updateJobStatus(Number(req.params.id), req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Job status'), 200, job);
        } catch (e: any) {
            throw new GenericError(e, `Error in updateJobStatus ${__filename}`);
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

    // GET /api/v1/admin/job-stats
    getJobStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await this.adminJobService.getJobStats();
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Job stats'), 200, stats);
        } catch (e: any) {
            throw new GenericError(e, `Error in getJobStats ${__filename}`);
        }
    };
}
