import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import AdminContractService from '../services/admin.service';

export default class AdminContractController {
    private adminContractService = new AdminContractService();

    private actorId = (req: Request): number | null => (req as any).user?.id ?? null;

    // POST /api/v1/admin/contract
    createContract = async (req: Request, res: Response): Promise<void> => {
        try {
            const contract = await this.adminContractService.createContract(req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Contract'), 201, contract);
        } catch (e: any) {
            console.log("Error", e)
            throw new GenericError(e, `Error in createContract ${__filename}`);
        }
    };
}
