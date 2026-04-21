import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import DashboardAdminService from '../services/admin.service';

export default class DashboardAdminController {
    private service = new DashboardAdminService();

    // GET /api/v1/admin/dashboard/activity-logs
    // Full paginated log — for a dedicated "Activity Log" page/table
    getActivityLogs = async (req: Request, res: Response): Promise<void> => {
        try {
            const query = {
                page: req.query.page ? Number(req.query.page) : undefined,
                limit: req.query.limit ? Number(req.query.limit) : undefined,
                entityType: req.query.entityType ? String(req.query.entityType) : undefined,
                entityId: req.query.entityId ? Number(req.query.entityId) : undefined,
            };

            const result = await this.service.getActivityLogs(query);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Activity logs'), 200, result);
        } catch (e: any) {
            throw new GenericError(e, `Error in getActivityLogs ${__filename}`);
        }
    };

    // GET /api/v1/admin/dashboard/recent-activity
    // Lightweight top-20 feed — for the dashboard home widget/timeline card
    getRecentActivity = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.service.getRecentActivity();
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Recent activity'), 200, result);
        } catch (e: any) {
            throw new GenericError(e, `Error in getRecentActivity ${__filename}`);
        }
    };

    // GET /api/v1/admin/dashboard/dashboard-stats
    getDashboardStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await this.service.getDashboardStats();
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Dashboard stats'), 200, stats);
        } catch (e: any) {
            throw new GenericError(e, `Error in getDashboardStats ${__filename}`);
        }
    };
}
