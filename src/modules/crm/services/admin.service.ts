import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { UnProcessableEntityError } from '../../../errors/unprocessable-entity.error';
import { auditService } from '../../../services/audit.service';
import { emailService } from '../../../services/email.service';
import constant from '../../../common/constant/constant';
import config from '../../../config';
import ErrorMessages from '../../../common/constant/errors';
import { ICreateClientDTO, IUpdateClientDTO, IGetClientsQuery } from '../dto/client.dto';
import { Client, ClientStatus as PrismaClientStatus, GstStatus, CreditTerms, Prisma, SequenceEntity } from '../../../../generated/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import InfoMessages from '../../../common/constant/messages';
import { generateEntityCode } from '../../../helper/helper.method';

export interface IAdminCrmService {
    createClient(createClientDTO: ICreateClientDTO, actorId?: number | null): Promise<Client & { user: { id: number; email: string; name: string | null } }>;
    updateClient(id: number, dto: IUpdateClientDTO, actorId?: number | null): Promise<Client & { user: { id: number; email: string; name: string | null } }>;
    getClientById(id: number): Promise<Client & { user: { id: number; email: string; name: string | null } }>;
    getClients(query: IGetClientsQuery): Promise<{
        data: (Client & { user: { id: number; email: string; name: string | null } })[],
        pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean },
        totalPending: number
    }>;

}

export default class AdminCrmService implements IAdminCrmService {
    public async createClient(
        createClientDTO: ICreateClientDTO,
        actorId?: number | null
    ): Promise<Client & { user: { id: number; email: string; name: string | null } }> {
        try {

            const { clientName, abn, address, phone, countryCode, gstStatus, creditTerms, creditScore, status } = createClientDTO;

            const email = createClientDTO.email.toLowerCase().trim();
            // Check for duplicate email
            const existingUser = await prisma.user.findUnique({
                where: { email },
                select: { id: true },
            });
            if (existingUser) {
                throw new BadRequestError(ErrorMessages.GENERIC.DUPLICATE_EMAIL);
            }

            // Check for duplicate ABN (only if provided)
            if (abn) {
                const existingABN = await prisma.client.findUnique({
                    where: { abn },
                    select: { id: true },
                });
                if (existingABN) {
                    throw new BadRequestError(ErrorMessages.CLIENT.DUPLICATE_ABN);
                }
            }

            // Check for duplicate client name (case-insensitive)
            const existingName = await prisma.client.findFirst({
                where: { client_name: { equals: clientName, mode: 'insensitive' } },
                select: { id: true },
            });
            if (existingName) {
                throw new BadRequestError(ErrorMessages.CLIENT.DUPLICATE_CLIENT_NAME);
            }

            // ── 2. Find the "client" role ──────────────────────────────────────────────
            const clientRole = await prisma.role.findUnique({
                where: { name: constant.ROLES.CLIENT },
            });
            if (!clientRole) {
                throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Client role"));
            }

            // ── 3. Atomic transaction ──────────────────────────────────────────────────
            const result = await prisma.$transaction(async (tx) => {

                // 3a. Create the User account for the client
                const user = await tx.user.create({
                    data: {
                        email,
                        name: clientName,
                        password_hash: 'pending_setup',
                        invite_token: 'pending', // temporary placeholder — overwritten below
                        status: 0,              // inactive until they set a password
                        roles: {
                            connect: { id: clientRole.id },
                        },
                    },
                    select: { id: true, email: true, name: true },
                });

                const clientCode = await generateEntityCode({
                    tx,
                    entity: SequenceEntity.CLIENT,
                    prefix: constant.CODE_PREFIX.CLIENT,
                });
                // 3d. Create the Client record linked to this User
                const client = await tx.client.create({
                    data: {
                        user_id: user.id,
                        client_code: clientCode,
                        client_name: clientName,
                        abn: abn ?? null,
                        address: address ?? null,
                        phone: phone ?? null,
                        country_code: countryCode ?? null,
                        gst_status: gstStatus as GstStatus,
                        credit_terms: creditTerms as CreditTerms,
                        credit_score: creditScore ?? 0,
                        status: status as PrismaClientStatus,
                    },
                    include: {
                        user: { select: { id: true, email: true, name: true } },
                    },
                });

                return { client, user };
            }, { maxWait: 10000, timeout: 20000 });
            const { client, user } = result;

            // 3b. Generate invitation token (signed JWT)
            const inviteToken = jwt.sign(
                {
                    id: user.id,
                    role: constant.ROLES.CLIENT,
                    type: constant.JWT_TOKEN_TYPE.INVITE,
                },
                process.env.INVITE_SECRET as string,
                { expiresIn: (process.env.PASSWORD_SESSION_EXPIRES_IN || '24h') as any }
            );

            const hashedToken = await bcrypt.hash(inviteToken, 12);

            // 3c. Persist the hashed invite token on the User
            await prisma.user.update({
                where: { id: user.id },
                data: { invite_token: hashedToken },
            });

            // ── 4. Fire-and-forget: send invite email + audit log ─────────────────────
            const inviteLink = `${process.env.FRONT_END_DOMAIN}/set-password?token=${inviteToken}`;

            Promise.allSettled([
                emailService.sendEmailWithRetry(
                    email,
                    config.REGISTER_USER_EMAIL.subject,
                    config.REGISTER_USER_EMAIL.content(inviteLink, constant.ROLES.CLIENT),
                    constant.ENTITY_TYPE.USER,
                    user.id
                ),
                auditService.logWithRetry({
                    actor_id: actorId ?? null,
                    action: constant.AUDIT_LOG_ACTION.INVITE_SENT,
                    entity_type: constant.ENTITY_TYPE.CLIENT,
                    entity_id: client.id,
                    metadata: {
                        client_name: clientName,
                        email,
                        abn,
                        action: InfoMessages.LOGGER_MESSAGE.CLIENT_CREATED_AND_INVITATION_SENT
                    },
                }),
            ]);

            return client;

        }
        catch (error: any) {
            if (error.code === 'P2002') {
                const target: string[] = error.meta?.target || [];

                if (target.includes('email'))
                    throw new BadRequestError(ErrorMessages.GENERIC.DUPLICATE_EMAIL);

                if (target.includes('abn'))
                    throw new BadRequestError(ErrorMessages.CLIENT.DUPLICATE_ABN);

                if (target.includes('client_name'))
                    throw new BadRequestError(ErrorMessages.CLIENT.DUPLICATE_CLIENT_NAME);
            }

            throw error;


        }

    }

    // ─── Update ───────────────────────────────────────────────────────────────────
    public async updateClient(id: number, dto: IUpdateClientDTO, actorId?: number | null): Promise<Client & { user: { id: number; email: string; name: string | null } }> {

        const { clientName, abn, address, phone, countryCode, gstStatus, creditTerms, creditScore, status } = dto;

        // ── 1. Confirm client exists ─────────────────────────────────────────────────
        const existing = await prisma.client.findUnique({
            where: { id },
            select: { id: true, user_id: true, abn: true, client_name: true },
        });
        if (!existing) throw new NotFoundError(ErrorMessages.CLIENT.CLIENT_NOT_FOUND);

        // ── 2. Pre-flight uniqueness guards (skip if value hasn't changed) ────────────
        if (abn && abn !== existing.abn) {
            const abnConflict = await prisma.client.findUnique({
                where: { abn },
                select: { id: true },
            });
            if (abnConflict) throw new BadRequestError(ErrorMessages.CLIENT.DUPLICATE_ABN);
        }

        if (clientName && clientName.toLowerCase() !== existing.client_name.toLowerCase()) {
            const nameConflict = await prisma.client.findFirst({
                where: {
                    client_name: { equals: clientName, mode: 'insensitive' },
                    id: { not: id }, // exclude the record being updated
                },
                select: { id: true },
            });
            if (nameConflict) throw new BadRequestError(ErrorMessages.CLIENT.DUPLICATE_CLIENT_NAME);
        }

        // ── 3. Atomic transaction: update Client + sync User.name if clientName changed ──
        try {
            const updatedClient = await prisma.$transaction(async (tx) => {

                // Keep User.name in sync when clientName changes
                if (clientName !== undefined) {
                    await tx.user.update({
                        where: { id: existing.user_id },
                        data: { name: clientName },
                    });
                }

                // Always update the Client row, include user in return
                const client = await tx.client.update({
                    where: { id },
                    data: {
                        ...(clientName !== undefined && { client_name: clientName }),
                        ...(abn !== undefined && { abn }),
                        ...(address !== undefined && { address }),
                        ...(phone !== undefined && { phone }),
                        ...(countryCode !== undefined && { country_code: countryCode }),
                        ...(gstStatus !== undefined && { gst_status: gstStatus as GstStatus }),
                        ...(creditTerms !== undefined && { credit_terms: creditTerms as CreditTerms }),
                        ...(creditScore !== undefined && { credit_score: creditScore }),
                        ...(status !== undefined && { status: status as PrismaClientStatus }),
                    },
                    include: {
                        user: { select: { id: true, email: true, name: true } },
                    },
                });

                return client;
            }, { maxWait: 10000, timeout: 20000 });

            // ── 4. Fire-and-forget audit log ───────────────────────────────────────────
            auditService.logWithRetry({
                actor_id: actorId ?? null,
                action: constant.AUDIT_LOG_ACTION.UPDATE,
                entity_type: constant.ENTITY_TYPE.CLIENT,
                entity_id: id,
                metadata: { ...dto },
            });

            return updatedClient;

        } catch (error: any) {
            // Surface Prisma unique-constraint violations as clean 400s
            if (error.code === 'P2002') {
                const target: string[] = error.meta?.target || [];
                if (target.includes('abn')) throw new BadRequestError(ErrorMessages.CLIENT.DUPLICATE_ABN);
                if (target.includes('client_name')) throw new BadRequestError(ErrorMessages.CLIENT.DUPLICATE_CLIENT_NAME);
            }
            throw error;
        }
    }


    // ─── Get By ID ────────────────────────────────────────────────────────────
    public async getClientById(id: number): Promise<Client & { user: { id: number; email: string; name: string | null } }> {
        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, email: true, name: true } },
            },
        });
        if (!client) throw new NotFoundError(ErrorMessages.CLIENT.CLIENT_NOT_FOUND);
        return client;
    }
    // ─── Get with Pagination ─────────────────────────────────────────────────
    public async getClients(query: IGetClientsQuery): Promise<{
        data: (Client & { user: { id: number; email: string; name: string | null } })[],
        pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean },
        totalPending: number
    }> {

        const page = query.page ?? constant.PAGINATION.DEFAULT_PAGE;
        const limit = query.limit ?? constant.PAGINATION.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where: Prisma.ClientWhereInput = {};

        if (query.status) {
            where.status = query.status as PrismaClientStatus;
        }

        if (query.search) {
            const search = query.search.trim();
            where.OR = [
                { client_code: { contains: search, mode: 'insensitive' } },
                { client_name: { contains: search, mode: 'insensitive' } },
                { abn: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [data, total, totalPending] = await prisma.$transaction([
            prisma.client.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    user: { select: { id: true, email: true, name: true } },
                },
            }),
            prisma.client.count({ where }),
            prisma.client.count({ where: { status: PrismaClientStatus.pending } }),
        ]);

        const hasNext = (skip + data.length) < total;
        const hasPrevious = page > 1;

        return {
            data,
            pagination: { total, page, limit, hasNext, hasPrevious },
            totalPending,
        };
    }




}
