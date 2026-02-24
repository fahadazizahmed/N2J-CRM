import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import AdminClientService from '../services/admin.service';

export default class AdminClientController {
    private svc = new AdminClientService();
    private userId = (req: Request): number => (req as any).user?.id;
    private actorId = (req: Request): number | null => (req as any).user?.id ?? null;

    // POST /api/v1/admin/add-client
    createClient = async (req: Request, res: Response): Promise<void> => {
        try {
            const client = await this.svc.createClient(req.body, this.userId(req), this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Client'), 201, client);
        } catch (e: any) { throw new GenericError(e, `Error in createClient ${__filename}`); }
    };

    // PUT /api/v1/admin/update-client/:id
    updateClient = async (req: Request, res: Response): Promise<void> => {
        try {
            const client = await this.svc.updateClient(Number(req.params.id), req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Client'), 200, client);
        } catch (e: any) { throw new GenericError(e, `Error in updateClient ${__filename}`); }
    };

    // DELETE /api/v1/admin/delete-client/:id  (soft delete → Suspended)
    deleteClient = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.svc.deleteClient(Number(req.params.id), this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_DELETED_SUCCESSFULLY('Client'), 200, null);
        } catch (e: any) { throw new GenericError(e, `Error in deleteClient ${__filename}`); }
    };

    // GET /api/v1/admin/get-clients
    getClients = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.svc.getClients(req.query as any);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Clients'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getClients ${__filename}`); }
    };
}
