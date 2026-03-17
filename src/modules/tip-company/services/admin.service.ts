import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import ErrorMessages from '../../../common/constant/errors';
import { ICreateTipCompanyDTO, IUpdateTipCompanyDTO, IGetTipCompaniesQuery } from '../dto/tip-company.dto';
import { TipCompany, TipStatus as PrismaTipStatus, Prisma, SequenceEntity } from '../../../../generated/prisma';
import { ImageService } from '../../../services/image.service';
import { generateEntityCode, normalizeBlobName } from '../../../helper/helper.method';
import InfoMessages from '../../../common/constant/messages';


export interface IAdminTipService {
    createTipCompany(dto: ICreateTipCompanyDTO, actorId?: number | null): Promise<TipCompany>;
    updateTipCompany(id: number, dto: IUpdateTipCompanyDTO, actorId?: number | null): Promise<TipCompany>;
    getTipCompanyById(id: number): Promise<TipCompany>;
    getTipCompanies(query: IGetTipCompaniesQuery): Promise<{
        data: TipCompany[];
        pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean };
    }>;
    uploadTipImage(file: any): Promise<any>;
}

export default class AdminTipService implements IAdminTipService {
    private imageService = new ImageService();

    // ─── Create ──────────────────────────────────────────────────────────────
    public async createTipCompany(
        dto: ICreateTipCompanyDTO,
        actorId?: number | null
    ): Promise<TipCompany> {
        try {
            const { tipName, abn, address, phone, countryCode, status } = dto;


            // ── 1. Duplicate ABN check ─────────────────────────────────────────────────
            if (abn) {
                const existingABN = await prisma.tipCompany.findUnique({
                    where: { abn },
                    select: { id: true },
                });
                if (existingABN) throw new BadRequestError(ErrorMessages.TIP_COMPANY.DUPLICATE_ABN);
            }

            // ── 2. Duplicate name check (case-insensitive) ─────────────────────────────
            const existingName = await prisma.tipCompany.findFirst({
                where: { tip_name: { equals: tipName, mode: 'insensitive' } },
                select: { id: true },
            });
            if (existingName) throw new BadRequestError(ErrorMessages.TIP_COMPANY.DUPLICATE_NAME);

            // ── 3. Create (atomic: generate code + insert in one transaction) ──────────
            const tipCompany = await prisma.$transaction(async (tx) => {
                const clientCode = await generateEntityCode({
                    tx,
                    entity: SequenceEntity.TIPPER,
                    prefix: constant.CODE_PREFIX.TIP_COMPANY,
                });

                return tx.tipCompany.create({
                    data: {
                        tip_name: tipName,
                        client_code: clientCode,
                        abn: abn,
                        address: address ?? null,
                        phone: phone ?? null,
                        country_code: countryCode ?? null,
                        status: status as PrismaTipStatus,
                    },
                });
            }, { maxWait: 10000, timeout: 20000 });

            // ── 4. Fire-and-forget audit log ───────────────────────────────────────────
            auditService.logWithRetry({
                actor_id: actorId ?? null,
                action: constant.AUDIT_LOG_ACTION.CREATE,
                entity_type: constant.ENTITY_TYPE.TIP_COMPANY,
                entity_id: tipCompany.id,
                metadata: { tip_name: tipName, abn, action: InfoMessages.LOGGER_MESSAGE.TIP_COMPANY_CREATED },
            });

            return tipCompany;

        } catch (error: any) {
            if (error.code === 'P2002') {
                const target: string[] = error.meta?.target || [];
                if (target.includes('abn')) throw new BadRequestError(ErrorMessages.TIP_COMPANY.DUPLICATE_ABN);
                if (target.includes('tip_name')) throw new BadRequestError(ErrorMessages.TIP_COMPANY.DUPLICATE_NAME);
            }
            throw error;
        }
    }

    // ─── Update ───────────────────────────────────────────────────────────────────
    public async updateTipCompany(
        id: number,
        dto: IUpdateTipCompanyDTO,
        actorId?: number | null
    ): Promise<TipCompany> {
        const { tipName, abn, address, phone, countryCode, status } = dto;

        // ── 1. Confirm record exists ──────────────────────────────────────────────────
        const existing = await prisma.tipCompany.findUnique({
            where: { id },
            select: { id: true, abn: true, tip_name: true },
        });
        if (!existing) throw new NotFoundError(ErrorMessages.TIP_COMPANY.NOT_FOUND);

        // ── 2. Pre-flight uniqueness guards ───────────────────────────────────────────
        if (abn && abn !== existing.abn) {
            const abnConflict = await prisma.tipCompany.findUnique({
                where: { abn },
                select: { id: true },
            });
            if (abnConflict) throw new BadRequestError(ErrorMessages.TIP_COMPANY.DUPLICATE_ABN);
        }

        if (tipName && tipName.toLowerCase() !== existing.tip_name.toLowerCase()) {
            const nameConflict = await prisma.tipCompany.findFirst({
                where: {
                    tip_name: { equals: tipName, mode: 'insensitive' },
                    id: { not: id },
                },
                select: { id: true },
            });
            if (nameConflict) throw new BadRequestError(ErrorMessages.TIP_COMPANY.DUPLICATE_NAME);
        }

        // ── 3. Update ──────────────────────────────────────────────────────────────────
        try {
            const updated = await prisma.tipCompany.update({
                where: { id },
                data: {
                    ...(tipName !== undefined && { tip_name: tipName }),
                    ...(abn !== undefined && { abn }),
                    ...(address !== undefined && { address }),
                    ...(phone !== undefined && { phone }),
                    ...(countryCode !== undefined && { country_code: countryCode }),
                    ...(status !== undefined && { status: status as PrismaTipStatus }),
                },
            });

            // ── 4. Fire-and-forget audit log ─────────────────────────────────────────
            auditService.logWithRetry({
                actor_id: actorId ?? null,
                action: constant.AUDIT_LOG_ACTION.UPDATE,
                entity_type: constant.ENTITY_TYPE.TIP_COMPANY,
                entity_id: id,
                metadata: { ...dto },
            });

            return updated;

        } catch (error: any) {
            if (error.code === 'P2002') {
                const target: string[] = error.meta?.target || [];
                if (target.includes('abn')) throw new BadRequestError(ErrorMessages.TIP_COMPANY.DUPLICATE_ABN);
                if (target.includes('tip_name')) throw new BadRequestError(ErrorMessages.TIP_COMPANY.DUPLICATE_NAME);
            }
            throw error;
        }
    }

    // ─── Get By ID ─────────────────────────────────────────────────────────────
    public async getTipCompanyById(id: number): Promise<TipCompany> {
        const tipCompany = await prisma.tipCompany.findUnique({ where: { id } });
        if (!tipCompany) throw new NotFoundError(ErrorMessages.TIP_COMPANY.NOT_FOUND);
        return tipCompany;
    }

    // ─── Get with Pagination ──────────────────────────────────────────────────
    public async getTipCompanies(query: IGetTipCompaniesQuery): Promise<{
        data: TipCompany[];
        pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean };
    }> {
        const page = query.page ?? constant.PAGINATION.DEFAULT_PAGE;
        const limit = query.limit ?? constant.PAGINATION.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where: Prisma.TipCompanyWhereInput = {};

        if (query.status) {
            where.status = query.status as PrismaTipStatus;
        }

        if (query.search) {
            const search = query.search.trim();
            where.OR = [
                { tip_name: { contains: search, mode: 'insensitive' } },
                { abn: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await prisma.$transaction([
            prisma.tipCompany.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            prisma.tipCompany.count({ where }),
        ]);

        const hasNext = (skip + data.length) < total;
        const hasPrevious = page > 1;

        return {
            data,
            pagination: { total, page, limit, hasNext, hasPrevious },
        };
    }

    public async uploadTipImage(file: any): Promise<any> {
        //File wil come from the db
        let url = this.imageService.getImageUrl(normalizeBlobName(file.path));
        return url

    }

}
