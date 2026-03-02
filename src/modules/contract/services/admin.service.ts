import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import ErrorMessages from '../../../common/constant/errors';
import { ICreateContractDTO, IUpdateContractDTO } from '../dto/contract.dto';
import { ClientContract, ClientStatus, ContractStatus, SequenceEntity } from '../../../../generated/prisma';
import { generateContractNumber } from '../helper';
import InfoMessages from '../../../common/constant/messages';
import { generateEntityCode, normalizeBlobName } from '../../../helper/helper.method';
import { ImageService } from '../../../services/image.service';

export interface IAdminContractService {
    createContract(dto: ICreateContractDTO, actorId: number | null): Promise<ClientContract>;
    updateContract(id: number, dto: IUpdateContractDTO, actorId: number | null): Promise<ClientContract>;
    uploadContractDocs(contractId: number, clientId: number, file: any): Promise<any>;
}

export default class AdminContractService implements IAdminContractService {
    private imageService = new ImageService();
    public async createContract(
        dto: ICreateContractDTO,
        actorId: number | null
    ): Promise<ClientContract> {
        const {
            clientId,
            contractTitle,
            startDate,
            endDate,
            creditTermsOverride,
            specialTerms,
            contractManagerId,
            contractContactName,
            contractContactEmail,
            contractContactPhone } = dto;

        // ── 1. Validate Client Exists and Get Default Credit Terms ──
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true, credit_terms: true, status: true },
        });

        if (!client) {
            throw new NotFoundError(ErrorMessages.CLIENT.CLIENT_NOT_FOUND);
        }

        if (client.status !== ClientStatus.active) {
            throw new BadRequestError(ErrorMessages.CLIENT.CLIENT_NOT_ACTIVE);
        }

        // ── 3. Handle Contract Manager defaults & admin role check ──
        let managerIdToUse = contractManagerId;


        // Provided, so we must check if manager is admin
        const manager = await prisma.user.findUnique({
            where: { id: managerIdToUse },
            include: { roles: true },
        });

        if (!manager) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract manager'))
        }

        if (manager.status !== 1) {
            throw new NotFoundError(ErrorMessages.CONTRACT.CONTRACT_MANAGER_NOT_ACTIVE);
        }

        const isAdmin = manager.roles.some((r) => r.name.toLowerCase() === constant.ROLES.ADMIN);
        if (!isAdmin) {
            throw new BadRequestError(ErrorMessages.CONTRACT.INVALID_CONTRACT_MANAGER);
        }


        // ── 4. Set final credit terms ──
        const finalCreditTerms = creditTermsOverride || client.credit_terms;

        // ── 5. Create the Contract and Audit Log in a Transaction ──
        const contract = await prisma.$transaction(async (tx) => {

            const contractNumber = await generateEntityCode({
                tx,
                entity: SequenceEntity.CONTRACT,
                prefix: constant.CODE_PREFIX.CONTRACT,
            });


            const newContract = await tx.clientContract.create({
                data: {
                    client_id: clientId,
                    contract_number: contractNumber,
                    contract_title: contractTitle,
                    start_date: new Date(startDate),
                    end_date: new Date(endDate),
                    credit_terms_override: finalCreditTerms,
                    special_terms: specialTerms,
                    contract_manager_id: contractManagerId,
                    contract_contact_name: contractContactName,
                    contract_contact_email: contractContactEmail,
                    contract_contact_phone: contractContactPhone,
                    created_by: actorId,
                    status: ContractStatus.draft,
                },
            });
            return newContract;
        });

        // Fire-and-forget audit log
        auditService.logWithRetry({
            actor_id: actorId,
            action: constant.AUDIT_LOG_ACTION.CREATE,
            entity_type: constant.ENTITY_TYPE.CONTRACT,
            entity_id: contract.id,
            metadata: {
                client_id: contract.client_id,
                contract_number: contract.contract_number,
                contractManagerId: contractManagerId,
                action: InfoMessages.LOGGER_MESSAGE.CONTRACT_GENERATE_INFOT_CREATED_SUCCESSFULLY
            },
        })

        return contract;
    }

    public async updateContract(
        id: number,
        dto: IUpdateContractDTO,
        actorId: number | null
    ): Promise<ClientContract> {
        // 1. Validate contract exists
        const existingContract = await prisma.clientContract.findUnique({
            where: { id },
        });

        if (!existingContract) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));
        }
        // 3. Handle Contract Manager defaults & admin role check
        if (dto.contractManagerId) {
            const manager = await prisma.user.findUnique({
                where: { id: dto.contractManagerId },
                include: { roles: true },
            });

            if (!manager) {
                throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract manager'))
            }

            if (manager.status !== 1) {
                throw new NotFoundError(ErrorMessages.CONTRACT.CONTRACT_MANAGER_NOT_ACTIVE);
            }

            const isAdmin = manager.roles.some((r) => r.name.toLowerCase() === constant.ROLES.ADMIN);
            if (!isAdmin) {
                throw new BadRequestError(ErrorMessages.CONTRACT.INVALID_CONTRACT_MANAGER);
            }
        }

        // 4. Update the Contract and Audit Log in a Transaction
        const updatedContract = await prisma.$transaction(async (tx) => {
            const updateData: any = {};
            if (dto.contractTitle !== undefined) updateData.contract_title = dto.contractTitle;
            if (dto.startDate !== undefined) updateData.start_date = new Date(dto.startDate);
            if (dto.endDate !== undefined) updateData.end_date = new Date(dto.endDate);
            if (dto.creditTermsOverride !== undefined) updateData.credit_terms_override = dto.creditTermsOverride;
            if (dto.specialTerms !== undefined) updateData.special_terms = dto.specialTerms;
            if (dto.contractManagerId !== undefined) updateData.contract_manager_id = dto.contractManagerId;
            if (dto.contractContactName !== undefined) updateData.contract_contact_name = dto.contractContactName;
            if (dto.contractContactEmail !== undefined) updateData.contract_contact_email = dto.contractContactEmail;
            if (dto.contractContactPhone !== undefined) updateData.contract_contact_phone = dto.contractContactPhone;
            if (dto.status !== undefined) updateData.status = dto.status;

            return tx.clientContract.update({
                where: { id },
                data: updateData,
            });
        });

        // Fire-and-forget audit log
        auditService.logWithRetry({
            actor_id: actorId,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.CONTRACT,
            entity_id: updatedContract.id,
            metadata: {
                client_id: updatedContract.client_id,
                contract_number: updatedContract.contract_number,
                contractManagerId: updatedContract.contract_manager_id,
                action: InfoMessages.LOGGER_MESSAGE.CONTRACT_GENERATE_INFOT_UPDATED_SUCCESSFULLY || "Contract updated successfully",
                changes: dto
            },
        });

        return updatedContract;
    }

    public async uploadContractDocs(contractId: number, clientId: number, file: any): Promise<any> {
        // Validate contract exists
        const existingContract = await prisma.clientContract.findUnique({
            where: { id: contractId },
            select: { id: true, contract_number: true, client_id: true }
        });

        if (!existingContract) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));
        }

        if (existingContract.client_id !== clientId) {
            throw new BadRequestError('Contract does not belong to the specified client');
        }

        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true, client_code: true }
        });

        if (!client) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Client'));
        }
        const customBlobName = `contract/${client.client_code}/${existingContract.contract_number}/docs/${file.filename}`;

        // File url to return
        this.imageService.upload(file.path, customBlobName);

        // Store the document path in the new ClientContractDocument table
        const document = await prisma.clientContractDocument.create({
            data: {
                contract_id: contractId,
                document_path: customBlobName,
                file_name: file.filename,
            },
        });

        return { document };
    }
}
