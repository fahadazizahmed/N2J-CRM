import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import AdminTipService from '../services/admin.service';

export default class AdminCrmController {

    private adminTipService = new AdminTipService();

    private actorId = (req: Request): number | null => (req as any).user?.id ?? null;

    // POST /api/v1/admin/crm/add-tip-company
    createTipCompany = async (req: Request, res: Response): Promise<void> => {
        try {
            const tipCompany = await this.adminTipService.createTipCompany(req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Tip Company'), 201, tipCompany);
        } catch (e: any) { throw new GenericError(e, `Error in createTipCompany ${__filename}`); }
    };

    // POST /api/v1/admin/crm/update-tip-company/:id
    updateTipCompany = async (req: Request, res: Response): Promise<void> => {
        try {
            const tipCompany = await this.adminTipService.updateTipCompany(Number(req.params.id), req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Tip Company'), 200, tipCompany);
        } catch (e: any) { throw new GenericError(e, `Error in updateTipCompany ${__filename}`); }
    };

    // GET /api/v1/admin/crm/get-tip-company/:id
    getTipCompanyById = async (req: Request, res: Response): Promise<void> => {
        try {
            const tipCompany = await this.adminTipService.getTipCompanyById(Number(req.params.id));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Tip Company'), 200, tipCompany);
        } catch (e: any) { throw new GenericError(e, `Error in getTipCompanyById ${__filename}`); }
    };

    // GET /api/v1/admin/crm/get-tip-companies
    getTipCompanies = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.adminTipService.getTipCompanies(req.query as any);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Tip Companies'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getTipCompanies ${__filename}`); }
    };


    getImage = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.adminTipService.uploadTipImage(req.file as any);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Tip Companies'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getTipCompanies ${__filename}`); }
    };

}
