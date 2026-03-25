import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import AdminCrmService from '../services/admin.service';

export default class AdminCrmController {

    private adminCrmService = new AdminCrmService();

    private actorId = (req: Request): number | null => (req as any).user?.id ?? null;

    // POST /api/v1/admin/client/add-client
    createClient = async (req: Request, res: Response): Promise<void> => {
        try {
            const client = await this.adminCrmService.createClient(req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Client'), 201, client);
        } catch (e: any) { throw new GenericError(e, `Error in createClient ${__filename}`); }
    };

    // PUT /api/v1/admin/client/update-client/:id
    updateClient = async (req: Request, res: Response): Promise<void> => {
        try {
            const client = await this.adminCrmService.updateClient(Number(req.params.id), req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Client'), 200, client);
        } catch (e: any) { throw new GenericError(e, `Error in updateClient ${__filename}`); }
    };

    // GET /api/v1/admin/client/get-client/:id
    getClientById = async (req: Request, res: Response): Promise<void> => {
        try {
            const client = await this.adminCrmService.getClientById(Number(req.params.id));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Client'), 200, client);
        } catch (e: any) { throw new GenericError(e, `Error in getClientById ${__filename}`); }
    };

    // GET /api/v1/admin/client/get-clients
    getClients = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.adminCrmService.getClients(req.query);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Clients'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getClients ${__filename}`); }
    };

    // GET /api/v1/admin/client/get-all-clients
    getAllClients = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.adminCrmService.getAllClients();
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Clients'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getAllClients ${__filename}`); }
    };



}
