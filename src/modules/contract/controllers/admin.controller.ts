import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { BadRequestError } from '../../../errors/bad-request-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import AdminContractService from '../services/admin.service';

export default class AdminContractController {
    private adminContractService = new AdminContractService();

    private actorId = (req: Request): number | null => (req as any).user?.id ?? null;
    private contractId = (req: Request): number => Number(req.params.id);
    private rateId = (req: Request): number => Number(req.params.rateId);


    // POST /api/v1/admin/contract
    createContract = async (req: Request, res: Response): Promise<void> => {
        try {
            const contract = await this.adminContractService.createContract(req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Contract'), 201, contract);
        } catch (e: any) {
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
            throw new GenericError(e, `Error in updateContract ${__filename}`);
        }
    };

    // PUT /api/v1/admin/contract/update-contract-status/:id
    updateContractStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            const contract = await this.adminContractService.updateContractStatus(Number(req.params.id), req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Contract status'), 200, contract);
        } catch (e: any) { throw new GenericError(e, `Error in updateContractStatus ${__filename}`); }
    };

    // POST /api/v1/admin/contract/upload-contract-docs
    uploadDocs = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.file) {
                throw new BadRequestError("Document file is required.");
            }
            const contractId = parseInt(req.body.contractId, 10);
            const clientId = parseInt(req.body.clientId, 10);
            const result = await this.adminContractService.uploadContractDocs(contractId, clientId, req.file as any, req.body.documentName);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Contract Docs uploaded'), 200, result);
        } catch (e: any) {
            throw new GenericError(e, `Error in uploadDocs ${__filename}`);
        }
    };

    // GET /api/v1/admin/contract/get-contract/:id
    getContractById = async (req: Request, res: Response): Promise<void> => {
        try {
            const contract = await this.adminContractService.getContractById(Number(req.params.id));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Contract'), 200, contract);
        } catch (e: any) { throw new GenericError(e, `Error in getContractById ${__filename}`); }
    };

    // GET /api/v1/admin/contract/get-contracts
    getContracts = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.adminContractService.getContracts(req.query as any);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('Contracts'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getContracts ${__filename}`); }
    };


    // POST /contract/:id/rates
    addRate = async (req: Request, res: Response): Promise<void> => {
        try {
            const rate = await this.adminContractService.addRate(this.contractId(req), req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('Contract rate'), 201, rate);
        } catch (e: any) {
            throw new GenericError(e, `Error in addRate ${__filename}`);
        }

    };

    updateDraftContract = async (req: Request, res: Response): Promise<void> => {
        try {
            const rate = await this.adminContractService.updateDraftContract(this.contractId(req), this.rateId(req), req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Draft contract rate'), 201, rate);
        } catch (e: any) {
            throw new GenericError(e, `Error in addRate ${__filename}`);
        }
    };
    // PUT /contract/:id/rates/change
    changeRate = async (req: Request, res: Response): Promise<void> => {
        try {
            const rate = await this.adminContractService.changeRate(this.contractId(req), req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('Contract rate'), 200, rate);
        } catch (e: any) {
            throw new GenericError(e, `Error in changeRate ${__filename}`);
        }
    };


    getRates = async (req: Request, res: Response): Promise<void> => {
        try {
            const rates = await this.adminContractService.getRates(this.contractId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_FETCHED_SUCCESSFULLY('Contract rates'), 200, rates);
        } catch (e: any) {
            throw new GenericError(e, `Error in getRates ${__filename}`);
        }
    };









}
