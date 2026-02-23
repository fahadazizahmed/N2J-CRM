import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { UnProcessableEntityError } from '../../../errors/unprocessable-entity.error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import { ICreateClientDTO } from '../dto/client.dto';
import { Client } from '../../../../generated/prisma';

export interface IAdminClientService {
    createClient(dto: ICreateClientDTO, actorId?: number | null): Promise<Client>;
}

export default class AdminClientService implements IAdminClientService {

    public async createClient(dto: ICreateClientDTO, actorId?: number | null): Promise<Client> {

        // 1. Verify the user exists (select only id — avoid loading full user object)
        const user = await prisma.user.findUnique({
            where: { id: dto.user_id },
            select: { id: true },
        });
        if (!user) {
            throw new UnProcessableEntityError('User not found with the provided user_id');
        }

        // 2. Prevent duplicate company per user
        const existing = await prisma.client.findFirst({
            where: { user_id: dto.user_id, company_name: dto.company_name },
        });
        if (existing) {
            throw new BadRequestError('A client with this company name already exists for the given user');
        }

        // 3. Create the client record
        try {
            const client = await prisma.client.create({
                data: {
                    user_id: dto.user_id,
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

            // 4. Audit log (fire-and-forget/retry)
            auditService.logWithRetry({
                actor_id: actorId ?? null,
                action: constant.AUDIT_LOG_ACTION.CREATE,
                entity_type: 'Client',
                entity_id: client.id,
                metadata: {
                    company_name: client.company_name,
                    user_id: client.user_id,
                },
            });

            return client;
        } catch (error: any) {
            // Handle Prisma Unique Constraint Errors (P2002)
            if (error.code === 'P2002') {
                const target = error.meta?.target || [];
                if (target.includes('abn')) {
                    throw new BadRequestError('A client with this ABN already exists');
                }
                if (target.includes('user_id') && target.includes('company_name')) {
                    throw new BadRequestError('A client with this company name already exists for this user');
                }
                throw new BadRequestError('A unique constraint violation occurred on the database');
            }
            throw error;
        }
    }
}
