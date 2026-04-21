import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { UnProcessableEntityError } from '../../../errors';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { emailService } from '../../../services/email.service';
import config from '../../../config';
import InfoMessages from '../../../common/constant/messages';
import { ICreateSubcontractorDTO, IUpdateSubcontractorDTO, IGetSubcontractorsQuery } from '../dto/subcontractor.dto';
import { SequenceEntity } from '../../../../generated/prisma';
import { generateEntityCode } from '../../../helper/helper.method';
import ErrorMessages from '../../../common/constant/errors';
import { NotFoundError } from '../../../errors/not-found-error';
import { ImageService } from '../../../services/image.service';

import { SubcontractorDocumentType, SubcontractorStatus } from '../../../../generated/prisma';
import { activityService } from '../../../services/activity.service';

export interface ISubcontractorAuthService {
    createSubContractor: (userCreateDTO: ICreateSubcontractorDTO, actorId?: number | null) => Promise<any>;
    updateSubContractor: (id: number, updateDTO: IUpdateSubcontractorDTO, actorId?: number | null) => Promise<any>;
    uploadSubcontractorDocs(subcontractorId: number, documentType: SubcontractorDocumentType, expiryDate: Date | null, files: Express.Multer.File[], documentName?: string, actorId?: number | null): Promise<any>;
    getSubcontractorById(id: number): Promise<any>;
    getSubcontractors(query: IGetSubcontractorsQuery): Promise<any>;
    getSubcontractorsList(status?: SubcontractorStatus): Promise<any>;
}

export default class SubcontractorAuthService implements ISubcontractorAuthService {
    private imageService = new ImageService();
    public async createSubContractor(createDTO: ICreateSubcontractorDTO, actorId?: number | null): Promise<any> {

        const subRole = await prisma.role.findUnique({
            where: { name: constant.ROLES.SUBCONTRACTOR }
        });
        if (!subRole) {
            throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Subcontractor role"));
        }

        const email = createDTO.email?.toLowerCase().trim();

        const result = await prisma.$transaction(async (tx: any) => {
            const subCode = await generateEntityCode({
                tx,
                entity: SequenceEntity.SUBCONTRACTOR,
                prefix: constant.CODE_PREFIX.SUBCONTRACTOR
            });

            if (createDTO.abn) {
                const existingAbn = await tx.subcontractor.findUnique({
                    where: { abn: createDTO.abn }
                });
                if (existingAbn) {
                    throw new BadRequestError("Subcontractor with this ABN already exists.");
                }
            }

            let user;

            if (email) {
                try {
                    user = await tx.user.create({
                        data: {
                            email,
                            password_hash: "pending_setup",
                            invite_token: "pending",
                            status: 0,
                            roles: { connect: { id: subRole.id } }
                        },
                        select: { id: true, email: true, name: true }
                    });
                } catch (e: any) {
                    if (e.code === "P2002") {
                        throw new BadRequestError(ErrorMessages.GENERIC.DUPLICATE_EMAIL);
                    }
                    throw e;
                }
            }

            const subcontractor = await tx.subcontractor.create({
                data: {
                    subcontractor_code: subCode,
                    company_name: createDTO.companyName,
                    abn: createDTO.abn || null,
                    address: createDTO.address || null,
                    contact_phone: createDTO.phone || null,
                    country_code: createDTO.countryCode || null,
                    contact_name: createDTO.subcontractorContactName || null,
                    contact_email: createDTO.subcontractorContactEmail || null,
                    per_tonne_rate: createDTO.perToneRate || null,
                    per_load_rate: createDTO.perLoadRate || null,
                    hourly_rate: createDTO.hourlyRate || null,
                    travel_hourly_rate: createDTO.travelHoursRate || null,
                    notes: createDTO.notes || null,
                    status: createDTO.status || 'pending',
                    created_by: actorId || null,
                }
            });

            if (user) {
                await tx.user.update({
                    where: { id: user.id },
                    data: { subcontractor_id: subcontractor.id }
                });
            }

            return { subcontractor, user };
        }, { maxWait: constant.TX_MAX_WAIT, timeout: constant.TX_TIMEOUT });

        const { subcontractor, user } = result;

        if (email && user) {
            const inviteToken = jwt.sign(
                {
                    id: user.id,
                    role: constant.ROLES.SUBCONTRACTOR,
                    type: constant.JWT_TOKEN_TYPE.INVITE,
                },
                process.env.INVITE_SECRET as string,
                { expiresIn: (process.env.PASSWORD_SESSION_EXPIRES_IN || '24h') as any }
            );

            const hashedToken = await bcrypt.hash(inviteToken, 12);

            await prisma.user.update({
                where: { id: user.id },
                data: { invite_token: hashedToken },
            });

            const inviteLink = `${process.env.FRONT_END_DOMAIN}/set-password?token=${inviteToken}`;

            Promise.allSettled([
                emailService.sendEmailWithRetry(
                    email,
                    config.REGISTER_USER_EMAIL.subject,
                    config.REGISTER_USER_EMAIL.content(inviteLink, constant.ROLES.SUBCONTRACTOR),
                    constant.ENTITY_TYPE.USER,
                    user.id
                ),
                auditService.logWithRetry({
                    actor_id: actorId ?? null,
                    action: constant.AUDIT_LOG_ACTION.INVITE_SENT,
                    entity_type: constant.ENTITY_TYPE.SUBCONTRACTOR,
                    entity_id: subcontractor.id,
                    metadata: {
                        subcontractor_name: subcontractor.company_name,
                        email,
                        action: InfoMessages.LOGGER_MESSAGE.SUBCONTRACTOR_CREATED_AND_INVITATION_SENT
                    },
                }),
                activityService.log({
                    actor_id: actorId ?? null,
                    entity_type: constant.ENTITY_TYPE.SUBCONTRACTOR,
                    entity_id: subcontractor.id,
                    action: "created",
                    message: `Subcontractor ${subcontractor.company_name} created`,
                })
            ]);
        } else {
            auditService.logWithRetry({
                actor_id: actorId ?? null,
                action: constant.AUDIT_LOG_ACTION.CREATE,
                entity_type: constant.ENTITY_TYPE.SUBCONTRACTOR,
                entity_id: subcontractor.id,
                metadata: {
                    subcontractor_name: subcontractor.company_name,
                    action: "Subcontractor created without invite"
                },
            });
            activityService.log({
                actor_id: actorId ?? null,
                entity_type: constant.ENTITY_TYPE.SUBCONTRACTOR,
                entity_id: subcontractor.id,
                action: "created",
                message: `Subcontractor ${subcontractor.company_name} created`,
            });
        }

        return subcontractor;
    }

    public async updateSubContractor(id: number, updateDTO: IUpdateSubcontractorDTO, actorId?: number | null): Promise<any> {
        const existingSubcontractor = await prisma.subcontractor.findUnique({
            where: { id }
        });

        if (!existingSubcontractor) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Subcontractor'));
        }

        if (updateDTO.abn && updateDTO.abn !== existingSubcontractor.abn) {
            const existingAbn = await prisma.subcontractor.findUnique({
                where: { abn: updateDTO.abn }
            });
            if (existingAbn) {
                throw new BadRequestError("Subcontractor with this ABN already exists.");
            }
        }

        const data: any = {};
        if (updateDTO.companyName !== undefined) data.company_name = updateDTO.companyName;
        if (updateDTO.abn !== undefined) data.abn = updateDTO.abn;
        if (updateDTO.address !== undefined) data.address = updateDTO.address;
        if (updateDTO.phone !== undefined) data.contact_phone = updateDTO.phone;
        if (updateDTO.countryCode !== undefined) data.country_code = updateDTO.countryCode;
        if (updateDTO.subcontractorContactName !== undefined) data.contact_name = updateDTO.subcontractorContactName;
        if (updateDTO.subcontractorContactEmail !== undefined) data.contact_email = updateDTO.subcontractorContactEmail;
        if (updateDTO.subcontractorContactPhone !== undefined) data.contact_phone = updateDTO.subcontractorContactPhone;
        if (updateDTO.perToneRate !== undefined) data.per_tonne_rate = updateDTO.perToneRate;
        if (updateDTO.perLoadRate !== undefined) data.per_load_rate = updateDTO.perLoadRate;
        if (updateDTO.hourlyRate !== undefined) data.hourly_rate = updateDTO.hourlyRate;
        if (updateDTO.travelHoursRate !== undefined) data.travel_hourly_rate = updateDTO.travelHoursRate;
        if (updateDTO.notes !== undefined) data.notes = updateDTO.notes;
        if (updateDTO.status !== undefined) data.status = updateDTO.status;

        const updated = await prisma.subcontractor.update({
            where: { id },
            data
        });

        if (updateDTO.sendInvite && updateDTO.email) {
            const email = updateDTO.email.toLowerCase().trim();

            const existingUser = await prisma.user.findFirst({
                where: { OR: [{ email: email }, { subcontractor_id: id }] }
            });

            if (!existingUser) {
                const subRole = await prisma.role.findUnique({
                    where: { name: constant.ROLES.SUBCONTRACTOR }
                });

                if (!subRole) throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Subcontractor role"));

                let newUser;
                try {
                    newUser = await prisma.user.create({
                        data: {
                            email,
                            password_hash: "pending_setup",
                            invite_token: "pending",
                            status: 0,
                            subcontractor_id: id,
                            roles: { connect: { id: subRole.id } }
                        },
                        select: { id: true, email: true, name: true }
                    });
                } catch (e: any) {
                    if (e.code === "P2002") throw new BadRequestError(ErrorMessages.GENERIC.DUPLICATE_EMAIL);
                    throw e;
                }

                if (newUser) {
                    const inviteToken = jwt.sign(
                        { id: newUser.id, role: constant.ROLES.SUBCONTRACTOR, type: constant.JWT_TOKEN_TYPE.INVITE },
                        process.env.INVITE_SECRET as string,
                        { expiresIn: (process.env.PASSWORD_SESSION_EXPIRES_IN || '24h') as any }
                    );
                    const hashedToken = await bcrypt.hash(inviteToken, 12);

                    await prisma.user.update({
                        where: { id: newUser.id },
                        data: { invite_token: hashedToken },
                    });

                    const inviteLink = `${process.env.FRONT_END_DOMAIN}/set-password?token=${inviteToken}`;

                    Promise.allSettled([
                        emailService.sendEmailWithRetry(
                            email,
                            config.REGISTER_USER_EMAIL.subject,
                            config.REGISTER_USER_EMAIL.content(inviteLink, constant.ROLES.SUBCONTRACTOR),
                            constant.ENTITY_TYPE.USER,
                            newUser.id
                        ),
                        auditService.logWithRetry({
                            actor_id: actorId ?? null,
                            action: constant.AUDIT_LOG_ACTION.INVITE_SENT,
                            entity_type: constant.ENTITY_TYPE.SUBCONTRACTOR,
                            entity_id: id,
                            metadata: {
                                subcontractor_name: updated.company_name,
                                email,
                                action: "Subcontractor invitation sent via Update Profile."
                            },
                        }),
                    ]);
                }
            } else {
                throw new BadRequestError("User with this email or subcontractor already exists. If pending, please use the resend invite functionality.");
            }
        }

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.SUBCONTRACTOR,
            entity_id: id,
            metadata: {
                message: InfoMessages.GENERIC.ITEM_UPDATED_SUCCESSFULLY('SubContractor'),
                updates: Object.keys(data)
            },
        });

        return updated;
    }


    public async uploadSubcontractorDocs(subcontractorId: number, documentType: SubcontractorDocumentType, expiryDate: Date | null, files: Express.Multer.File[], documentName?: string, actorId?: number | null): Promise<any> {
        const existingSubcontractor = await prisma.subcontractor.findUnique({
            where: { id: subcontractorId },
            select: { id: true, subcontractor_code: true }
        });

        if (!existingSubcontractor) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Subcontractor'));
        }

        const uploadedDocs = await Promise.all(
            files.map(async (file) => {
                const blobName = constant.MEDIA_PATHS.SUBCONTRACTOR_MEDIA(
                    existingSubcontractor.subcontractor_code,
                    documentType,
                    file.filename
                );

                await this.imageService.upload(file.path, blobName);

                const document = await prisma.subcontractorDocument.create({
                    data: {
                        subcontractor_id: subcontractorId,
                        document_type: documentType,
                        file_path: blobName,
                        file_name: documentName || file.originalname,
                        expiry_date: expiryDate
                    }
                });

                return { ...document, document_url: await this.imageService.getImageUrl(blobName) };
            })
        );

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.SUBCONTRACTOR,
            entity_id: subcontractorId,
            metadata: {
                message: `Uploaded ${files.length} document(s)`,
                document_type: documentType
            },
        });

        return uploadedDocs;
    }

    public async getSubcontractorById(id: number): Promise<any> {
        const subcontractor = await prisma.subcontractor.findUnique({
            where: { id },
            include: {
                documents: true,
                users: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        status: true,
                        created_at: true,
                        subcontractor_id: true
                    }
                },
                vehicles: {
                    select: {
                        id: true,
                        registration_number: true,
                        vehicle_type_id: true,
                        status: true,
                    }
                },
                drivers: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        status: true,
                    }
                },
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        });

        if (!subcontractor) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Subcontractor'));
        }

        // Resolve signed URLs for all documents in parallel
        const documentsWithUrls = await Promise.all(
            subcontractor.documents.map(async (doc) => ({
                ...doc,
                document_url: await this.imageService.getImageUrl(doc.file_path),
            }))
        );

        return { ...subcontractor, documents: documentsWithUrls };
    }

    public async getSubcontractors(query: IGetSubcontractorsQuery): Promise<{
        data: any[];
        pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean };
    }> {
        const page = query.page ?? constant.PAGINATION.DEFAULT_PAGE;
        const limit = query.limit ?? constant.PAGINATION.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (query.status) {
            where.status = query.status;
        }

        if (query.search) {
            const search = query.search.trim();
            where.OR = [
                { subcontractor_code: { contains: search, mode: 'insensitive' } },
                { company_name: { contains: search, mode: 'insensitive' } },
                { contact_name: { contains: search, mode: 'insensitive' } },
                { contact_email: { contains: search, mode: 'insensitive' } },
                { contact_phone: { contains: search, mode: 'insensitive' } },
                { abn: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [data, total] = await prisma.$transaction([
            prisma.subcontractor.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    documents: true,
                    users: {
                        select: { id: true, email: true, name: true, status: true, created_at: true, subcontractor_id: true }
                    },
                    vehicles: {
                        select: { id: true, registration_number: true, status: true }
                    },
                    drivers: {
                        select: { id: true, first_name: true, last_name: true, status: true }
                    },
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    }
                }
            }),
            prisma.subcontractor.count({ where })
        ]);

        const hasNext = (skip + data.length) < total;
        const hasPrevious = page > 1;

        return {
            data,
            pagination: { total, page, limit, hasNext, hasPrevious }
        };
    }

    public async getSubcontractorsList(status?: SubcontractorStatus): Promise<any> {
        const where: any = {};
        if (status) {
            where.status = status;
        }

        const subcontractors = await prisma.subcontractor.findMany({
            where,
            orderBy: { company_name: 'asc' },
            select: {
                id: true,
                subcontractor_code: true,
                company_name: true,
                abn: true,
                contact_name: true,
                contact_email: true,
                contact_phone: true,
                country_code: true,
                status: true,
                per_load_rate: true,
                per_tonne_rate: true,
                hourly_rate: true,
                travel_hourly_rate: true
            }
        });

        return subcontractors;
    }
}