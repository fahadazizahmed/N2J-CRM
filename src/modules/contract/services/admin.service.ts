import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import ErrorMessages from '../../../common/constant/errors';
import { ICreateContractDTO, IUpdateContractDTO, IUpdateContractStatusDTO, IGetContractsQuery } from '../dto/contract.dto';
import { ClientContract, ClientStatus, ContractStatus, GstStatus, SequenceEntity, Prisma, ClientContractRate, } from '../../../../generated/prisma';
import { generateContractNumber } from '../helper';
import InfoMessages from '../../../common/constant/messages';
import { generateEntityCode, normalizeBlobName } from '../../../helper/helper.method';
import { ImageService } from '../../../services/image.service';
import { IAddContractRateDTO, IChangeContractRateDTO, IUpdateContractRateDTO } from '../dto/contract.dto';



// Shared include shape for contract relations
const contractFullInclude = {
    client: {
        include: {
            user: { select: { id: true, email: true, name: true } },
        },
    },
    contract_manager: { select: { id: true, email: true, name: true } },
    creator: { select: { id: true, email: true, name: true } },
    documents: true,
    rates: true,
} satisfies Prisma.ClientContractInclude;

export interface IAdminContractService {
    createContract(dto: ICreateContractDTO, actorId: number | null): Promise<ClientContract>;
    updateContract(id: number, dto: IUpdateContractDTO, actorId: number | null): Promise<ClientContract>;
    updateContractStatus(id: number, dto: IUpdateContractStatusDTO, actorId: number | null): Promise<ClientContract>;
    uploadContractDocs(contractId: number, clientId: number, file: any, documentName: string): Promise<any>;
    getContractById(id: number): Promise<any>;
    getContracts(query: IGetContractsQuery): Promise<{
        data: any[];
        pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean };
        totalDraft: number;
    }>;
    addRate(
        contractId: number,
        dto: IAddContractRateDTO,
        actorId: number | null
    ): Promise<ClientContractRate>;
    changeRate(
        contractId: number,
        dto: IChangeContractRateDTO,
        actorId: number | null
    ): Promise<ClientContractRate>;
    updateDraftContract(
        contractId: number,
        rateId: number,
        dto: IUpdateContractRateDTO,
        actorId: number | null
    ): Promise<ClientContractRate>
    getRates(contractId: number): Promise<ClientContractRate[]>
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

        // 2. Guard: draft-only fields cannot be edited once the contract is no longer in draft status
        const draftOnlyFieldsProvided =
            dto.startDate !== undefined ||
            dto.endDate !== undefined ||
            dto.creditTermsOverride !== undefined ||
            dto.specialTerms !== undefined;

        if (draftOnlyFieldsProvided && existingContract.status !== ContractStatus.draft) {
            throw new BadRequestError(ErrorMessages.CONTRACT.DRAFT_ONLY_FIELDS);
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

    // ─── Update Contract Status ──────────────────────────────────────────
    public async updateContractStatus(
        id: number,
        dto: IUpdateContractStatusDTO,
        actorId: number | null
    ): Promise<ClientContract> {
        // 1. Validate contract exists (fetch with client for eligibility checks)
        const existing = await prisma.clientContract.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                contract_number: true,
                client_id: true,
                start_date: true,
                client: {
                    select: {
                        id: true,
                        status: true,
                        gst_status: true,
                        credit_score: true,

                    },
                },
            },
        });
        console.log("existing", existing)

        if (!existing) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));
        }


        // 2. Run eligibility checks ONLY when activating the contract
        if (dto.status === ContractStatus.active) {
            const client = existing.client;

            // Client must be active
            if (client.status !== ClientStatus.active) {
                throw new BadRequestError(ErrorMessages.CLIENT.CLIENT_NOT_ACTIVE);
            }

            // Client GST must be approved
            if (client.gst_status !== GstStatus.approved) {
                throw new BadRequestError(ErrorMessages.CLIENT.CLIENT_GST_NOT_APPROVED);
            }

            // Client credit score must meet the threshold
            if (client.credit_score < constant.CREDIT_SCORE.THRESHOLD) {
                throw new BadRequestError(
                    ErrorMessages.CLIENT.CLIENT_CREDIT_SCORE_BELOW_THRESHOLD(
                        client.credit_score,
                        constant.CREDIT_SCORE.THRESHOLD
                    )
                );
            }

            // Contract must have at least one rate before activation
            const rateCount = await prisma.clientContractRate.count({
                where: { contract_id: id },
            });
            if (rateCount === 0) {
                throw new BadRequestError(ErrorMessages.CONTRACT_RATE.NO_RATES);
            }



        }
        //  5. Update status only
        const updated = await prisma.clientContract.update({
            where: { id },
            data: { status: dto.status },
        });

        // 6. Fire-and-forget audit log
        auditService.logWithRetry({
            actor_id: actorId,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.CONTRACT,
            entity_id: id,
            metadata: {
                contract_number: existing.contract_number,
                previous_status: existing.status,
                new_status: dto.status,
            },
        });

        return updated;
    }

    public async uploadContractDocs(contractId: number, clientId: number, file: any, documentName: string): Promise<any> {
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
                file_name: documentName,
            },
        });

        return { document };
    }

    // ─── Get Contract By ID ───────────────────────────────────────────────
    public async getContractById(id: number): Promise<any> {
        const contract = await prisma.clientContract.findUnique({
            where: { id },
            include: contractFullInclude,
        });
        if (!contract) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));

        // Resolve signed URLs for each document (parallel)
        const documentsWithUrls = await Promise.all(
            contract.documents.map(async (doc) => ({
                ...doc,
                document_url: await this.imageService.getImageUrl(doc.document_path),
            }))
        );

        return { ...contract, documents: documentsWithUrls };
    }

    // ─── Get Contracts with Pagination, Filter & Search ────────────────────
    public async getContracts(query: IGetContractsQuery): Promise<{
        data: any[];
        pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean };
        totalDraft: number;
    }> {
        const page = query.page ?? constant.PAGINATION.DEFAULT_PAGE;
        const limit = query.limit ?? constant.PAGINATION.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where: Prisma.ClientContractWhereInput = {};

        // ─ Filter by status ────────────────────────────────────────────
        if (query.status) {
            where.status = query.status as ContractStatus;
        }

        // ─ Filter by clientId ──────────────────────────────────────
        if (query.clientId) {
            where.client_id = query.clientId;
        }

        // ─ Search: contract number, title, contact name, email, client name ─
        if (query.search) {
            const search = query.search.trim();
            where.OR = [
                { contract_number: { contains: search, mode: 'insensitive' } },
                { contract_title: { contains: search, mode: 'insensitive' } },
                { contract_contact_name: { contains: search, mode: 'insensitive' } },
                { contract_contact_email: { contains: search, mode: 'insensitive' } },
                { client: { client_name: { contains: search, mode: 'insensitive' } } },
                { client: { client_code: { contains: search, mode: 'insensitive' } } },
                { client: { user: { email: { contains: search, mode: 'insensitive' } } } },
            ];
        }

        const [data, total, totalDraft] = await prisma.$transaction([
            prisma.clientContract.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: contractFullInclude,
            }),
            prisma.clientContract.count({ where }),
            prisma.clientContract.count({ where: { status: ContractStatus.draft } }),
        ]);

        const hasNext = (skip + data.length) < total;
        const hasPrevious = page > 1;

        return {
            data,
            pagination: { total, page, limit, hasNext, hasPrevious },
            totalDraft,
        };
    }



    private toDateOnly(date: Date): Date {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }

    // ─── Helper: subOneDayUTC ───────────────────────────────────────────────────
    private subOneDay(date: Date): Date {
        const d = new Date(date);
        d.setUTCDate(d.getUTCDate() - 1);
        return d;
    } private async assertNoOverlap(
        contractId: number,
        effectiveFrom: Date,
        effectiveTo: Date | null,
        excludeRateId: number | null
    ): Promise<void> {


        // Condition: existing rate overlaps the new rate's period
        const overlapCondition: any = {
            contract_id: contractId,
            // The existing rate starts before or on the new rate's end (or new rate has no end → always)
            effective_from: effectiveTo ? { lte: effectiveTo } : undefined,
            OR: [
                // The existing rate has no end → extends to +infinity, so always overlaps
                { effective_to: null },
                // The existing rate ends on or after the new rate's start
                { effective_to: { gte: effectiveFrom } },
            ],
        };

        if (excludeRateId) {
            overlapCondition.id = { not: excludeRateId };
        }

        // Remove undefined keys (Prisma doesn't like them)
        if (!effectiveTo) {
            delete overlapCondition.effective_from;
        }

        const conflicting = await prisma.clientContractRate.findFirst({
            where: overlapCondition,
        });

        if (conflicting) {
            throw new BadRequestError(ErrorMessages.CONTRACT_RATE.OVERLAP);
        }
    }

    public async addRate(
        contractId: number,
        dto: IAddContractRateDTO,
        actorId: number | null
    ): Promise<ClientContractRate> {
        // 1. Fetch contract
        const contract = await prisma.clientContract.findUnique({
            where: { id: contractId },
            select: { id: true, status: true, start_date: true, end_date: true },
        });

        if (!contract) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));

        // 2. Only draft contracts can use this endpoint
        if (contract.status !== ContractStatus.draft) {
            throw new BadRequestError(ErrorMessages.CONTRACT_RATE.DRAFT_NOT_EDITABLE_AFTER_ACTIVATE);
        }

        const effectiveFrom = this.toDateOnly(new Date(dto.effectiveFrom));
        const contractStart = this.toDateOnly(contract.start_date);
        const contractEnd = contract.end_date ? this.toDateOnly(contract.end_date) : null;

        // 3. effectiveFrom must not be before contract start_date
        if (effectiveFrom < contractStart) {
            throw new BadRequestError(ErrorMessages.CONTRACT_RATE.EFFECTIVE_FROM_BEFORE_CONTRACT_START);
        }
        if (contractEnd && effectiveFrom > contractEnd) {
            throw new BadRequestError(
                ErrorMessages.CONTRACT_RATE.EFFECTIVE_FROM_AFTER_CONTRACT_END
            );
        }
        // 4. Overlap check — no other rate on this contract can cover effectiveFrom
        await this.assertNoOverlap(contractId, effectiveFrom, null, null);

        // // 5. Insert the rate
        const rate = await prisma.clientContractRate.create({
            data: {
                contract_id: contractId,
                billing_type: dto.billingType,
                rate: dto.rate,
                material_type: dto.materialType ?? null,
                minimum_charge: dto.minimumCharge ?? null,
                toll_handling: dto.tollHandling ?? 'included',
                effective_from: effectiveFrom,
                effective_to: null, // open-ended — this is the latest rate
            },
        });

        // 6. Audit log (fire-and-forget)
        auditService.logWithRetry({
            actor_id: actorId,
            action: constant.AUDIT_LOG_ACTION.CREATE,
            entity_type: constant.ENTITY_TYPE.CONTRCT_RATE,
            entity_id: rate.id,
            metadata: { contract_id: contractId, billing_type: dto.billingType, rate: dto.rate, effective_from: effectiveFrom },
        });

        return rate;
    }


    public async updateDraftContract(
        contractId: number,
        rateId: number,
        dto: IUpdateContractRateDTO,
        actorId: number | null
    ): Promise<ClientContractRate> {

        // 1. Fetch contract
        const contract = await prisma.clientContract.findUnique({
            where: { id: contractId },
            select: { id: true, status: true, start_date: true, end_date: true },
        });

        if (!contract) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));
        }

        // 2. Only draft contracts can update rates
        if (contract.status !== ContractStatus.draft) {
            throw new BadRequestError('Rates can only be edited when contract is in draft state.');
        }

        // 3. Fetch the rate
        const rate = await prisma.clientContractRate.findFirst({
            where: {
                id: rateId,
                contract_id: contractId,
            },
        });

        if (!rate) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract Rate'));
        }

        const effectiveFrom = this.toDateOnly(new Date(dto.effectiveFrom));
        const contractStart = this.toDateOnly(contract.start_date);
        const contractEnd = contract.end_date ? this.toDateOnly(contract.end_date) : null;

        // 4. Validate effective_from
        if (effectiveFrom < contractStart) {
            throw new BadRequestError(
                ErrorMessages.CONTRACT_RATE.EFFECTIVE_FROM_BEFORE_CONTRACT_START
            );
        }
        if (contractEnd && effectiveFrom > contractEnd) {
            throw new BadRequestError(
                ErrorMessages.CONTRACT_RATE.EFFECTIVE_FROM_AFTER_CONTRACT_END
            );
        }


        // normalize effectiveTo
        const effectiveTo = dto.effectiveTo
            ? this.toDateOnly(new Date(dto.effectiveTo))
            : null;

        // NEW VALIDATION
        if (effectiveTo && effectiveTo < effectiveFrom) {
            throw new BadRequestError(
                "effectiveTo must be greater than or equal to effectiveFrom"
            );
        }

        // 5. Prevent overlap with other rates
        await this.assertNoOverlap(
            contractId,
            effectiveFrom,
            dto.effectiveTo ? new Date(dto.effectiveTo) : null,
            rateId
        );

        // 6. Update rate
        const updatedRate = await prisma.clientContractRate.update({
            where: { id: rateId },
            data: {
                billing_type: dto.billingType,
                rate: dto.rate,
                material_type: dto.materialType ?? null,
                minimum_charge: dto.minimumCharge ?? null,
                toll_handling: dto.tollHandling ?? 'included',
                effective_from: effectiveFrom,
                effective_to: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
            },
        });

        // 7. Audit log
        auditService.logWithRetry({
            actor_id: actorId,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.CONTRCT_RATE,
            entity_id: updatedRate.id,
            metadata: {
                contract_id: contractId,
                billing_type: dto.billingType,
                rate: dto.rate,
                effective_from: effectiveFrom,
            },
        });

        return updatedRate;
    }

    public async changeRate(
        contractId: number,
        dto: IChangeContractRateDTO,
        actorId: number | null
    ): Promise<ClientContractRate> {
        // 1. Fetch contract
        const contract = await prisma.clientContract.findUnique({
            where: { id: contractId },
            select: { id: true, status: true, start_date: true, end_date: true },
        });

        if (!contract) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));

        // 2. Draft contracts cannot use the rate-change endpoint
        if (contract.status === ContractStatus.draft) {
            throw new BadRequestError(ErrorMessages.CONTRACT_RATE.RATE_CHANGE_NOT_ALLOWED_ON_DRAFT);
        }

        const effectiveFrom = this.toDateOnly(new Date(dto.effectiveFrom));
        const contractStart = this.toDateOnly(contract.start_date);
        const contractEnd = contract.end_date ? this.toDateOnly(contract.end_date) : null;

        // 3. effectiveFrom must not be before contract start_date
        if (effectiveFrom < contractStart) {
            throw new BadRequestError(ErrorMessages.CONTRACT_RATE.EFFECTIVE_FROM_BEFORE_CONTRACT_START);
        }
        if (contractEnd && effectiveFrom > contractEnd) {
            throw new BadRequestError(
                ErrorMessages.CONTRACT_RATE.EFFECTIVE_FROM_AFTER_CONTRACT_END
            );
        }


        // 4. Find the current active rate covering effectiveFrom
        //    (effective_from <= effectiveFrom AND (effective_to IS NULL OR effective_to >= effectiveFrom))
        const currentActiveRate = await prisma.clientContractRate.findFirst({
            where: {
                contract_id: contractId,
                effective_from: { lte: effectiveFrom },
                OR: [
                    { effective_to: null },
                    { effective_to: { gte: effectiveFrom } },
                ],
            },
            orderBy: { effective_from: 'desc' }, // latest first in case of multiple matches
        });

        if (!currentActiveRate) {
            throw new BadRequestError(
                ErrorMessages.CONTRACT_RATE.NO_ACTIVE_RATE_ON_DATE(effectiveFrom.toISOString().split('T')[0])
            );
        }

        // 5. If effectiveFrom == currentActiveRate.effective_from they would collide (zero-duration old rate).
        //    In that case we simply replace the existing rate's values in-place ONLY if this is the open-ended
        //    (effective_to = null) rate AND no jobs have billed against it yet.
        //    For now we reject this edge case with a clear message — keep the append-only rule strict.
        if (effectiveFrom.getTime() === this.toDateOnly(currentActiveRate.effective_from).getTime()) {
            throw new BadRequestError(
                'effectiveFrom cannot be the same as the current rate\'s effective_from. The new rate must start at least 1 day after the current one.'
            );
        }

        // 6. Overlap check against any CLOSED rate whose period would conflict
        //    (excluding the current open-ended rate we are about to close)
        await this.assertNoOverlap(contractId, effectiveFrom, null, currentActiveRate.id);

        // 7. Execute in a transaction: close old rate + insert new rate
        const newRate = await prisma.$transaction(async (tx) => {
            // Close old rate: effective_to = effectiveFrom - 1 day
            const closeDate = this.subOneDay(effectiveFrom);
            await tx.clientContractRate.update({
                where: { id: currentActiveRate.id },
                data: { effective_to: closeDate },
            });

            // Insert new rate
            return tx.clientContractRate.create({
                data: {
                    contract_id: contractId,
                    billing_type: dto.billingType,
                    rate: dto.rate,
                    material_type: dto.materialType ?? null,
                    minimum_charge: dto.minimumCharge ?? null,
                    toll_handling: dto.tollHandling ?? 'included',
                    effective_from: effectiveFrom,
                    effective_to: null, // open-ended
                },
            });
        });

        // 8. Audit log (fire-and-forget)
        auditService.logWithRetry({
            actor_id: actorId,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.CONTRCT_RATE,
            entity_id: newRate.id,
            metadata: {
                contract_id: contractId,
                closed_rate_id: currentActiveRate.id,
                closed_rate_to: this.subOneDay(effectiveFrom).toISOString().split('T')[0],
                new_billing_type: dto.billingType,
                new_rate: dto.rate,
                new_effective_from: effectiveFrom.toISOString().split('T')[0],
            },
        });

        return newRate;
    }




    public async getRates(contractId: number): Promise<ClientContractRate[]> {
        const contract = await prisma.clientContract.findUnique({
            where: { id: contractId },
            select: { id: true },
        });
        if (!contract) throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));

        return prisma.clientContractRate.findMany({
            where: { contract_id: contractId },
            orderBy: { effective_from: 'asc' },
        });
    }




}
