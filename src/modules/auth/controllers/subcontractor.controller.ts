


import { Request, Response } from 'express';
import { GenericError } from '../../../errors/generic-error';
import { sendSuccessResponse } from '../../../helper/response';
import InfoMessages from '../../../common/constant/messages';
import SubcontractorAuthService from '../services/subcontractor.service';
import { BadRequestError } from '../../../errors';
import { SubcontractorDocumentType } from '../../../../generated/prisma';

export default class SubcontractorAuthController {

    private subcontractorAuthService = new SubcontractorAuthService();
    private actorId = (req: Request): number | null => (req as any).user?.id ?? null;

    // POST /api/v1/admin/driver/add-driver
    createSubContractor = async (req: Request, res: Response): Promise<void> => {
        try {
            const subcontractor = await this.subcontractorAuthService.createSubContractor(req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('SubContractor'), 201, subcontractor);
        } catch (e: any) { throw new GenericError(e, `Error in createDriver ${__filename}`); }
    };

    // PUT /api/v1/auth/update-subcontractor/:id
    updateSubContractor = async (req: Request, res: Response): Promise<void> => {
        try {
            const subcontractorId = parseInt(req.params.id as string);
            if (isNaN(subcontractorId)) {
                res.status(400).json({ error: 'Invalid ID' });
                return;
            }
            const subcontractor = await this.subcontractorAuthService.updateSubContractor(subcontractorId, req.body, this.actorId(req));
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('SubContractor'), 200, subcontractor);
        } catch (e: any) { throw new GenericError(e, `Error in updateSubContractor ${__filename}`); }
    };


    uploadDocs = async (req: Request, res: Response): Promise<void> => {
        try {
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                throw new BadRequestError("Document file(s) are required.");
            }
            const subcontractorId = parseInt(req.params.id as string, 10);
            if (isNaN(subcontractorId)) {
                res.status(400).json({ error: 'Invalid ID' });
                return;
            }

            const { documentType, expiryDate, documentName } = req.body;

            const SINGLE_DOC_TYPES: SubcontractorDocumentType[] = [
                SubcontractorDocumentType.insurance,
                SubcontractorDocumentType.abnRegistration,
                SubcontractorDocumentType.contract,
            ];
            if (SINGLE_DOC_TYPES.includes(documentType) && files.length > 1) {
                throw new BadRequestError(`Only one document is allowed for type '${documentType}'.`);
            }

            const result = await this.subcontractorAuthService.uploadSubcontractorDocs(
                subcontractorId,
                documentType,
                expiryDate ? new Date(expiryDate) : null,
                files,
                documentName,
                this.actorId(req)
            );
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('SubContractor Docs uploaded'), 200, result);
        } catch (e: any) {
            throw new GenericError(e, `Error in uploadDocs ${__filename}`);
        }
    };

    getSubcontractorById = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = parseInt(req.params.id as string, 10);
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid ID' });
                return;
            }
            const subcontractor = await this.subcontractorAuthService.getSubcontractorById(id);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('SubContractor'), 200, subcontractor);
        } catch (e: any) { throw new GenericError(e, `Error in getSubcontractorById ${__filename}`); }
    };

    getSubcontractors = async (req: Request, res: Response): Promise<void> => {
        try {
            const query = req.query as any;
            const result = await this.subcontractorAuthService.getSubcontractors(query);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('SubContractors'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getSubcontractors ${__filename}`); }
    };

    getSubcontractorsList = async (req: Request, res: Response): Promise<void> => {
        try {
            const status = req.query.status as any;
            const result = await this.subcontractorAuthService.getSubcontractorsList(status);
            sendSuccessResponse(res, InfoMessages.GENERIC.ITEM_GET_SUCCESSFULLY('SubContractors List'), 200, result);
        } catch (e: any) { throw new GenericError(e, `Error in getSubcontractorsList ${__filename}`); }
    };

}










