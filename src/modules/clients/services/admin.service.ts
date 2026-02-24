import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import { ICreateClientDTO, IUpdateClientDTO, IGetClientsQuery } from '../dto/client.dto';
import { Client, ClientStatus } from '../../../../generated/prisma';

export interface IAdminClientService {
    createClient(dto: ICreateClientDTO, userId: number, actorId?: number | null): Promise<Client>;
    updateClient(id: number, dto: IUpdateClientDTO, actorId?: number | null): Promise<Client>;
    deleteClient(id: number, actorId?: number | null): Promise<void>;
    getClients(query: IGetClientsQuery): Promise<{ data: Client[]; total: number; page: number; limit: number }>;
}

export default class AdminClientService implements IAdminClientService {

    // ─── Create ──────────────────────────────────────────────────────────────
    // userId comes from JWT token, NOT from request body
    public async createClient(dto: ICreateClientDTO, userId: number, actorId?: number | null): Promise<Client> {

        // Prevent duplicate company per user
        const existing = await prisma.client.findFirst({
            where: { user_id: userId, company_name: dto.company_name },
        });
        if (existing) throw new BadRequestError('A client with this company name already exists for this user');

        try {
            const client = await prisma.client.create({
                data: {
                    user_id: userId,
                    company_name: dto.company_name,
                    abn: dto.abn,
                    address: dto.address,
                    phone: dto.phone,
                    gst_approved: dto.gst_approved,
                    credit_terms: dto.credit_terms,
                    credit_score: dto.credit_score ?? 0,
                    status: dto.status,
                },
            });
            auditService.logWithRetry({ actor_id: actorId ?? null, action: constant.AUDIT_LOG_ACTION.CREATE, entity_type: 'Client', entity_id: client.id, metadata: { company_name: client.company_name, user_id: userId } });
            return client;
        } catch (error: any) {
            if (error.code === 'P2002') {
                const target: string[] = error.meta?.target || [];
                if (target.includes('abn')) throw new BadRequestError('A client with this ABN already exists');
                if (target.includes('company_name')) throw new BadRequestError('A client with this company name already exists for this user');
            }
            throw error;
        }
    }

    // ─── Update ──────────────────────────────────────────────────────────────
    public async updateClient(id: number, dto: IUpdateClientDTO, actorId?: number | null): Promise<Client> {

        const existing = await prisma.client.findUnique({ where: { id }, select: { id: true } });
        if (!existing) throw new NotFoundError('Client not found');

        try {
            // Explicitly pick only valid Client columns — ignores unknown fields like `email`
            const { company_name, abn, address, phone, gst_approved, credit_terms, credit_score, status } = dto;
            const updated = await prisma.client.update({
                where: { id },
                data: { company_name, abn, address, phone, gst_approved, credit_terms, credit_score, status },
            });
            auditService.logWithRetry({ actor_id: actorId ?? null, action: constant.AUDIT_LOG_ACTION.UPDATE, entity_type: 'Client', entity_id: id, metadata: { ...dto } });
            return updated;
        } catch (error: any) {
            if (error.code === 'P2002') {
                const target: string[] = error.meta?.target || [];
                if (target.includes('abn')) throw new BadRequestError('A client with this ABN already exists');
                if (target.includes('company_name')) throw new BadRequestError('A client with this company name already exists for this user');
            }
            throw error;
        }
    }

    // ─── Soft Delete (status → Suspended) ────────────────────────────────────
    public async deleteClient(id: number, actorId?: number | null): Promise<void> {

        const existing = await prisma.client.findUnique({ where: { id }, select: { id: true, status: true } });
        if (!existing) throw new NotFoundError('Client not found');
        if (existing.status === ClientStatus.Suspended) throw new BadRequestError('Client is already suspended');

        await prisma.client.update({ where: { id }, data: { status: ClientStatus.Suspended } });
        auditService.logWithRetry({ actor_id: actorId ?? null, action: constant.AUDIT_LOG_ACTION.UPDATE, entity_type: 'Client', entity_id: id, metadata: { status: 'Suspended' } });
    }

    // ─── Get with Pagination ─────────────────────────────────────────────────
    public async getClients(query: IGetClientsQuery): Promise<{ data: Client[]; total: number; page: number; limit: number }> {

        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (query.status) where.status = query.status;
        if (query.search) {
            where.OR = [
                { company_name: { contains: query.search, mode: 'insensitive' } },
                { abn: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await prisma.$transaction([
            prisma.client.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' } }),
            prisma.client.count({ where }),
        ]);

        return { data, total, page, limit };
    }
}
