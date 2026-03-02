import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { BadRequestError } from '../../../errors/bad-request-error';
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

    // PUT /api/v1/admin/contract/:id
    updateContract = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = parseInt(req.params.id as string, 10);
            const contract = await this.adminContractService.updateContract(id, req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Contract'), 200, contract);
        } catch (e: any) {
            console.log("Error", e)
            throw new GenericError(e, `Error in updateContract ${__filename}`);
        }
    };

    // POST /api/v1/admin/contract/upload-contract-docs
    uploadDocs = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.file) {
                throw new BadRequestError("Document file is required.");
            }
            const contractId = parseInt(req.body.contractId, 10);
            const clientId = parseInt(req.body.clientId, 10);
            const result = await this.adminContractService.uploadContractDocs(contractId, clientId, req.file as any);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Contract Docs uploaded'), 200, result);
        } catch (e: any) {
            console.log("Error", e)
            throw new GenericError(e, `Error in uploadDocs ${__filename}`);
        }
    };
}
