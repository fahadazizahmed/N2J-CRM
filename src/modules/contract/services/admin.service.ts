import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import ErrorMessages from '../../../common/constant/errors';
import { ICreateContractDTO, IUpdateContractDTO, IUpdateContractStatusDTO, IGetContractsQuery, IUpdateContractApprovalStatusDTO } from '../dto/contract.dto';
import { ClientContract, ClientStatus, ContractStatus, GstStatus, SequenceEntity, Prisma, ClientContractRate, ContractType, TollHandling, ApprovalStatus, } from '../../../../generated/prisma';
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
    updateContractApprovalStatus(id: number, dto: IUpdateContractApprovalStatusDTO, actorId: number | null): Promise<ClientContract>;

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
    getActiveSupplierContracts(): Promise<Partial<ClientContract>[]>
}

export default class AdminContractService implements IAdminContractService {
    private imageService = new ImageService();
    public async createContract(
        dto: ICreateContractDTO,
        actorId: number | null
    ): Promise<ClientContract> {

        try {
            const { companyName, abn, address, phone, countryCode, contractType, email } = dto;

            const contract = await prisma.$transaction(async (tx) => {

                const contractNumber = await generateEntityCode({
                    tx,
                    entity: SequenceEntity.CONTRACT,
                    prefix: constant.CODE_PREFIX.CONTRACT,
                });

                const newContract = await tx.clientContract.create({
                    data: {
                        company_name: companyName,
                        contract_number: contractNumber,
                        abn: abn,
                        address: address ?? null,
                        phone: phone ?? null,
                        country_code: countryCode ?? null,
                        created_by: actorId,
                        status: ContractStatus.draft,
                        contract_type: contractType ? contractType : ContractType.client,
                        email: email,
                    },
                });
                return newContract;
            }, { maxWait: constant.TX_MAX_WAIT, timeout: constant.TX_TIMEOUT });

            auditService.logWithRetry({
                actor_id: actorId,
                action: constant.AUDIT_LOG_ACTION.CREATE,
                entity_type: constant.ENTITY_TYPE.CONTRACT,
                entity_id: contract.id,
                metadata: {
                    client_id: contract.client_id,
                    contract_number: contract.contract_number,
                    action: InfoMessages.LOGGER_MESSAGE.CONTRACT_GENERATE_INFOT_CREATED_SUCCESSFULLY
                },
            })
            return contract;

        } catch (error: any) {
            if (error.code === 'P2002') {
                const target: string[] = error.meta?.target || [];
                if (target.includes('abn')) throw new BadRequestError(ErrorMessages.TIP_COMPANY.DUPLICATE_ABN);
                if (target.includes('tip_name')) throw new BadRequestError(ErrorMessages.TIP_COMPANY.DUPLICATE_NAME);
            }
            throw error;
        }
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

        // // 2. Guard: draft-only fields cannot be edited once the contract is no longer in draft status
        const draftOnlyFieldsProvided =
            dto.startDate !== undefined ||
            dto.endDate !== undefined ||
            // dto.creditTermsOverride !== undefined ||
            dto.specialTerms !== undefined;

        if (draftOnlyFieldsProvided && existingContract.status !== ContractStatus.draft) {
            throw new BadRequestError(ErrorMessages.CONTRACT.DRAFT_ONLY_FIELDS);
        }
        // 4. Update the Contract and Audit Log in a Transaction
        const updatedContract = await prisma.$transaction(async (tx) => {
            const updateData: any = {};
            if (dto.address !== undefined) updateData.address = dto.address;
            if (dto.phone !== undefined) updateData.phone = dto.phone;
            if (dto.countryCode !== undefined) updateData.country_code = dto.countryCode;
            if (dto.abn !== undefined) updateData.abn = dto.abn;
            if (dto.companyName !== undefined) updateData.company_name = dto.companyName;
            if (dto.email !== undefined) updateData.email = dto.email;
            if (dto.contractTitle !== undefined) updateData.contract_title = dto.contractTitle;
            if (dto.startDate !== undefined) updateData.start_date = new Date(dto.startDate);
            if (dto.endDate !== undefined) updateData.end_date = new Date(dto.endDate);
            if (dto.specialTerms !== undefined) updateData.special_terms = dto.specialTerms;
            if (dto.contractType !== undefined) updateData.contract_type = dto.contractType;
            if (dto.contractContactName !== undefined) updateData.contract_contact_name = dto.contractContactName;
            if (dto.contractContactEmail !== undefined) updateData.contract_contact_email = dto.contractContactEmail;
            if (dto.contractContactPhone !== undefined) updateData.contract_contact_phone = dto.contractContactPhone;
            if (dto.status !== undefined) updateData.status = dto.status;

            return tx.clientContract.update({
                where: { id },
                data: updateData,
            });
        }, { maxWait: constant.TX_MAX_WAIT, timeout: constant.TX_MAX_WAIT });

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
                end_date: true,
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

        if (!existing) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));
        }

        // 2. Run eligibility checks ONLY when activating the contract
        if (dto.status === ContractStatus.active) {
            if (!existing.start_date) {
                throw new BadRequestError(ErrorMessages.CONTRACT_RATE.START_DATE_MUST_GIVEN);
            }

            // Contract end date must be in the future — no point activating an already-expired contract
            if (existing.end_date) {
                const today = new Date();
                today.setUTCHours(0, 0, 0, 0);
                const endDate = new Date(existing.end_date);
                endDate.setUTCHours(0, 0, 0, 0);
                if (endDate < today) {
                    throw new BadRequestError(
                        'Contract cannot be activated because its end date is in the past. Please update the end date to a future date.'
                    );
                }
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


    // ─── Update Contract Approval Status ────────────────────────────────
    public async updateContractApprovalStatus(
        id: number,
        dto: IUpdateContractApprovalStatusDTO,
        actorId: number | null
    ): Promise<ClientContract> {
        // 1. Validate contract exists
        const existing = await prisma.clientContract.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                approval_status: true,
                contract_number: true,
                client_id: true,
                start_date: true,
                end_date: true,
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

        if (!existing) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Contract'));
        }

        // 2. Build update payload — include reason only when provided
        const updateData: { approval_status: typeof dto.status; approval_reason?: string | null } = {
            approval_status: dto.status,
        };

        if (dto.reason !== undefined) {
            updateData.approval_reason = dto.reason ?? null;
        }

        // 3. Persist the changes
        const updated = await prisma.clientContract.update({
            where: { id },
            data: updateData,
        });

        // 4. Fire-and-forget audit log
        auditService.logWithRetry({
            actor_id: actorId,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.CONTRACT,
            entity_id: id,
            metadata: {
                contract_number: existing.contract_number,
                previous_approval_status: existing.approval_status,
                new_approval_status: dto.status,
                ...(dto.reason ? { reason: dto.reason } : {}),
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

        const customBlobName = constant.MEDIA_PATHS.CONTRACT_MEDIA(existingContract.contract_number, file.filename);

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
        let doc = { ...document, document_url: await this.imageService.getImageUrl(customBlobName), }

        return { doc };
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
        if (query.approval) {
            where.approval_status = query.approval as ApprovalStatus;
        }

        // ─ Filter by contract type ─────────────────────────────────────
        // If a specific type is passed (e.g. 'supplier' or 'client'), filter by it.
        // If nothing is passed, return all contracts (both supplier and client).
        if (query.contractType) {
            where.contract_type = query.contractType as ContractType;
        }

        // ─ Search: contract number, title, contact name, email, client name ─
        if (query.search) {
            const search = query.search.trim();
            where.OR = [
                { contract_number: { contains: search, mode: 'insensitive' } },
                { contract_title: { contains: search, mode: 'insensitive' } },
                { contract_contact_name: { contains: search, mode: 'insensitive' } },
                { contract_contact_email: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
                { company_name: { contains: search, mode: 'insensitive' } },
                { abn: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
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
            prisma.clientContract.count({ where: { status: ContractStatus.draft, contract_type: query.contractType } }),
        ]);

        const hasNext = (skip + data.length) < total;
        const hasPrevious = page > 1;

        return {
            data,
            pagination: { total, page, limit, hasNext, hasPrevious },
            totalDraft,
        };
    }

    public async getActiveSupplierContracts(): Promise<Partial<ClientContract>[]> {
        return prisma.clientContract.findMany({
            where: {
                status: ContractStatus.active,
                contract_type: ContractType.supplier
            },
            select: {
                id: true,
                contract_number: true,
                company_name: true,
                email: true,
                phone: true,
                address: true,
                rates: {         // ✅ correct relation name
                    select: {
                        id: true,
                        billing_type: true,
                        rate: true,
                        toll_handling: true
                    },
                    orderBy: { id: 'desc' },    // optional: get latest first
                    take: 1,                    // optional: only get last rate
                },
            },
        });
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
        if (!contract.start_date || !contract.end_date) throw new BadRequestError(ErrorMessages.CONTRACT_RATE.DATE_MUST_GIVEN);

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

        // 5. Insert the rate
        const rate = await prisma.clientContractRate.create({
            data: {
                contract_id: contractId,
                billing_type: dto.billingType,
                rate: dto.rate,
                material_type: dto.materialType ?? null,
                minimum_charge: dto.minimumCharge ?? null,
                toll_handling: dto.tollHandling ?? TollHandling.included,
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
        if (!contract.start_date || !contract.end_date) throw new BadRequestError(ErrorMessages.CONTRACT_RATE.DATE_MUST_GIVEN);

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
        }, { maxWait: 10000, timeout: 20000 });

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
