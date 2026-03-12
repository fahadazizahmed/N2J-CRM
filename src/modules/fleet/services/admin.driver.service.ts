import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import { ICreateDriverDTO, IAddDriverRateDTO, IUpdateDriverDTO, IGetDriversQuery } from '../dto/driver.dto';
import { Driver, DriverType, LicenseClass, Prisma, DriverStatus, DriverDocumentType } from '../../../../generated/prisma';
import ErrorMessages from '../../../common/constant/errors';
import { UnProcessableEntityError } from '../../../errors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { emailService } from '../../../services/email.service';
import config from '../../../config';
import InfoMessages from '../../../common/constant/messages';
import { ImageService } from '../../../services/image.service';


export interface IAdminDriverService {
    createDriver(createDriverDTO: ICreateDriverDTO, actorId?: number | null): Promise<any>;
    updateDriver(id: number, updateDriverDTO: IUpdateDriverDTO, actorId?: number | null): Promise<any>;
    addDriverRates(driverId: number, addDriverRateDTO: IAddDriverRateDTO, actorId?: number | null): Promise<any>;
    getDriverEnums(): Promise<any>;
    getDriverById(id: number): Promise<any>;
    getDrivers(query: IGetDriversQuery): Promise<any>;
    uploadDocs(driverId: number, documentType: DriverDocumentType | 'profile', expiryDate: Date | null, files: Express.Multer.File[], actorId?: number | null): Promise<any>;
}

export default class AdminDriverService implements IAdminDriverService {
    private imageService = new ImageService();

    public async createDriver(
        createDriverDTO: ICreateDriverDTO,
        actorId?: number | null
    ): Promise<any> {

        const email = createDriverDTO.email.toLowerCase().trim();
        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existingUser) {
            throw new BadRequestError(ErrorMessages.GENERIC.DUPLICATE_EMAIL);
        }

        const driverRole = await prisma.role.findUnique({
            where: { name: constant.ROLES.DRIVER },
        });
        if (!driverRole) {
            throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Driver role"));
        }

        if (createDriverDTO.vehicleId) {
            const existingVehicle = await prisma.vehicle.findUnique({
                where: { id: createDriverDTO.vehicleId },
                select: { id: true }
            });
            if (!existingVehicle) {
                throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Vehicle"));
            }
        }

        const result = await prisma.$transaction(async (tx) => {

            // 3a. Create the User account for the client
            const user = await tx.user.create({
                data: {
                    email,
                    name: `${createDriverDTO.firstName} ${createDriverDTO.lastName}`,
                    password_hash: 'pending_setup',
                    invite_token: 'pending', // temporary placeholder — overwritten below
                    status: 0,              // inactive until they set a password
                    roles: {
                        connect: { id: driverRole.id },
                    },
                },
                select: { id: true, email: true, name: true },
            });

            // 3b. Generate invitation token (signed JWT)
            const inviteToken = jwt.sign(
                {
                    id: user.id,
                    role: constant.ROLES.DRIVER,
                    type: constant.JWT_TOKEN_TYPE.INVITE,
                },
                process.env.INVITE_SECRET as string,
                { expiresIn: (process.env.PASSWORD_SESSION_EXPIRES_IN || '24h') as any }
            );

            const hashedToken = await bcrypt.hash(inviteToken, 12);

            // 3c. Persist the hashed invite token on the User
            await tx.user.update({
                where: { id: user.id },
                data: { invite_token: hashedToken },
            });

            // 3d. Create the Client record linked to this User
            const driver = await tx.driver.create({
                data: {
                    first_name: createDriverDTO.firstName,
                    last_name: createDriverDTO.lastName,
                    phone: createDriverDTO.phone,
                    driver_type: createDriverDTO.driverType,
                    license_number: createDriverDTO.licenseNumber,
                    license_class: createDriverDTO.licenseClass,
                    vehicle_id: createDriverDTO.vehicleId,
                    user_id: user.id,
                    is_mobile_access: createDriverDTO.isMobileAccess ?? false,
                },
                include: {
                    user: { select: { id: true, email: true, name: true } },
                },
            });

            if (createDriverDTO.vehicleId) {
                await tx.vehicle.update({
                    where: { id: createDriverDTO.vehicleId },
                    data: { driver_id: driver.id }
                });
            }

            if (
                createDriverDTO.hourlyRate ||
                createDriverDTO.hourlyRateWeekend ||
                createDriverDTO.nightRate ||
                createDriverDTO.nightRateWeekend
            ) {
                await tx.driverRate.create({
                    data: {
                        hourly_rate: createDriverDTO.hourlyRate,
                        hourly_rate_weekend: createDriverDTO.hourlyRateWeekend,
                        night_rate: createDriverDTO.nightRate,
                        night_rate_weekend: createDriverDTO.nightRateWeekend,
                        driver: { connect: { id: driver.id } },
                    }
                });
            }


            return { driver, user, inviteToken };
        });

        const { driver, user, inviteToken } = result;

        // ── 4. Fire-and-forget: send invite email + audit log ─────────────────────
        const inviteLink = `${process.env.FRONT_END_DOMAIN}/set-password?token=${inviteToken}`;

        Promise.allSettled([
            emailService.sendEmailWithRetry(
                email,
                config.REGISTER_USER_EMAIL.subject,
                config.REGISTER_USER_EMAIL.content(inviteLink, constant.ROLES.DRIVER),
                constant.ENTITY_TYPE.USER,
                user.id
            ),
            auditService.logWithRetry({
                actor_id: actorId ?? null,
                action: constant.AUDIT_LOG_ACTION.INVITE_SENT,
                entity_type: constant.ENTITY_TYPE.DRIVER,
                entity_id: driver.id,
                metadata: {
                    driver_name: `${createDriverDTO.firstName} ${createDriverDTO.lastName}`,
                    email,
                    action: InfoMessages.LOGGER_MESSAGE.DRIVER_CREATED_AND_INVITATION_SENT
                },
            }),
        ]);

        return driver;
    }

    public async updateDriver(
        id: number,
        updateDriverDTO: IUpdateDriverDTO,
        actorId?: number | null
    ): Promise<any> {
        const existingDriver = await prisma.driver.findUnique({
            where: { id }
        });

        if (!existingDriver) {
            throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Driver'));
        }



        if (updateDriverDTO.vehicleId) {
            const existingVehicle = await prisma.vehicle.findUnique({
                where: { id: updateDriverDTO.vehicleId },
                select: { id: true }
            });
            if (!existingVehicle) {
                throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Vehicle"));
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            const updateData: Prisma.DriverUpdateInput = {};

            if (updateDriverDTO.firstName !== undefined) updateData.first_name = updateDriverDTO.firstName;
            if (updateDriverDTO.lastName !== undefined) updateData.last_name = updateDriverDTO.lastName;
            if (updateDriverDTO.phone !== undefined) updateData.phone = updateDriverDTO.phone;
            if (updateDriverDTO.driverType !== undefined) updateData.driver_type = updateDriverDTO.driverType;
            if (updateDriverDTO.licenseNumber !== undefined) updateData.license_number = updateDriverDTO.licenseNumber;
            if (updateDriverDTO.licenseClass !== undefined) updateData.license_class = updateDriverDTO.licenseClass;
            if (updateDriverDTO.licenseExpiry !== undefined) updateData.license_expiry = updateDriverDTO.licenseExpiry;
            if (updateDriverDTO.isMobileAccess !== undefined) updateData.is_mobile_access = updateDriverDTO.isMobileAccess;

            // if (updateDriverDTO.email !== undefined) {
            //     const newEmail = updateDriverDTO.email.toLowerCase().trim();
            //     updateData.email = newEmail;
            //     if (existingDriver.user_id) {
            //         await tx.user.update({
            //             where: { id: existingDriver.user_id },
            //             data: { email: newEmail }
            //         });
            //     }
            // }

            if (updateDriverDTO.firstName !== undefined || updateDriverDTO.lastName !== undefined) {
                if (existingDriver.user_id) {
                    await tx.user.update({
                        where: { id: existingDriver.user_id },
                        data: {
                            name: `${updateDriverDTO.firstName ?? existingDriver.first_name} ${updateDriverDTO.lastName ?? existingDriver.last_name}`
                        }
                    });
                }
            }

            if (updateDriverDTO.vehicleId !== undefined) {
                if (updateDriverDTO.vehicleId === null) {
                    updateData.vehicle = { disconnect: true };
                    await tx.vehicle.updateMany({
                        where: { driver_id: existingDriver.id },
                        data: { driver_id: null }
                    });
                } else {
                    updateData.vehicle = { connect: { id: updateDriverDTO.vehicleId } };
                    await tx.vehicle.updateMany({
                        where: { driver_id: existingDriver.id },
                        data: { driver_id: null }
                    });
                    await tx.vehicle.update({
                        where: { id: updateDriverDTO.vehicleId },
                        data: { driver_id: existingDriver.id }
                    });
                }
            }

            const updatedDriver = await tx.driver.update({
                where: { id },
                data: updateData,
                include: { user: { select: { id: true, email: true, name: true } } }
            });

            if (
                updateDriverDTO.hourlyRate !== undefined ||
                updateDriverDTO.hourlyRateWeekend !== undefined ||
                updateDriverDTO.nightRate !== undefined ||
                updateDriverDTO.nightRateWeekend !== undefined
            ) {
                const existingRate = await tx.driverRate.findFirst({
                    where: { driver_id: id }
                });

                const rateData: any = {};
                if (updateDriverDTO.hourlyRate !== undefined) rateData.hourly_rate = updateDriverDTO.hourlyRate;
                if (updateDriverDTO.hourlyRateWeekend !== undefined) rateData.hourly_rate_weekend = updateDriverDTO.hourlyRateWeekend;
                if (updateDriverDTO.nightRate !== undefined) rateData.night_rate = updateDriverDTO.nightRate;
                if (updateDriverDTO.nightRateWeekend !== undefined) rateData.night_rate_weekend = updateDriverDTO.nightRateWeekend;

                if (existingRate) {
                    await tx.driverRate.update({ where: { id: existingRate.id }, data: rateData });
                } else {
                    await tx.driverRate.create({ data: { ...rateData, driver: { connect: { id } } } });
                }
            }

            return updatedDriver;
        });

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.DRIVER,
            entity_id: id,
            metadata: result,
        });

        return result;
    }

    public async addDriverRates(
        driverId: number,
        addDriverRateDTO: IAddDriverRateDTO,
        actorId?: number | null
    ): Promise<any> {

        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
        });

        if (!driver) {
            throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Driver"));
        }

        const existingRate = await prisma.driverRate.findFirst({
            where: { driver_id: driverId }
        });

        const data = {
            hourly_rate: addDriverRateDTO.hourlyRate,
            hourly_rate_weekend: addDriverRateDTO.hourlyRateWeekend,
            night_rate: addDriverRateDTO.nightRate,
            night_rate_weekend: addDriverRateDTO.nightRateWeekend,
        };

        let newRates;
        let auditAction;

        if (existingRate) {
            newRates = await prisma.driverRate.update({
                where: { id: existingRate.id },
                data
            });
            auditAction = constant.AUDIT_LOG_ACTION.UPDATE;
        } else {
            newRates = await prisma.driverRate.create({
                data: {
                    ...data,
                    driver: { connect: { id: driverId } },
                }
            });
            auditAction = constant.AUDIT_LOG_ACTION.CREATE;
        }

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: auditAction,
            entity_type: constant.ENTITY_TYPE.DRIVER,
            entity_id: driverId,
            metadata: newRates,
        });

        return newRates;
    }



    public async getDriverById(id: number): Promise<any> {
        const driver = await prisma.driver.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, email: true, name: true } },
                rates: true,
                documents: true,
                vehicle: { select: { id: true, registration_number: true, make: true, model: true } },
                assigned_vehicles: true,
            },
        });

        if (!driver) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Driver'));
        }

        const singleActiveTypes: DriverDocumentType[] = [
            DriverDocumentType.license,
            DriverDocumentType.medical,
            DriverDocumentType.insurance,
            DriverDocumentType.whiteCard
        ];

        const filteredDocuments = driver.documents.filter((doc) => {
            if (singleActiveTypes.includes(doc.document_type as DriverDocumentType)) {
                return doc.is_active === true;
            }
            return true;
        });
        console.log("filteredDocuments", filteredDocuments, singleActiveTypes)

        // Resolve signed URLs for each document (parallel)
        const documentsWithUrls = await Promise.all(
            filteredDocuments.map(async (doc) => ({
                ...doc,
                document_url: await this.imageService.getImageUrl(doc.file_path),
            }))
        );

        let photo_url = null;
        if (driver.photo_path) {
            photo_url = await this.imageService.getImageUrl(driver.photo_path);
        }

        return { ...driver, documents: documentsWithUrls, photo_url };
    }

    public async getDriverEnums(): Promise<any> {
        const enums = {

            licenseClass: Object.values(LicenseClass),
            driverType: Object.values(DriverType),


        }
        return enums
    }

    public async getDrivers(query: IGetDriversQuery): Promise<{
        data: any[],
        pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean },
        totalActive: number
    }> {

        const page = query.page ?? constant.PAGINATION.DEFAULT_PAGE;
        const limit = query.limit ?? constant.PAGINATION.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where: Prisma.DriverWhereInput = {};

        if (query.status) {
            where.status = query.status as DriverStatus;
        }

        if (query.search) {
            const search = query.search.trim();
            where.OR = [
                { first_name: { contains: search, mode: 'insensitive' } },
                { last_name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { license_number: { contains: search, mode: 'insensitive' } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [data, total, totalActive] = await prisma.$transaction([
            prisma.driver.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    user: { select: { id: true, email: true, name: true } },
                    rates: true,
                    documents: true,
                    vehicle: { select: { id: true, registration_number: true, make: true, model: true } }
                },
            }),
            prisma.driver.count({ where }),
            prisma.driver.count({ where: { status: DriverStatus.active } }),
        ]);

        const hasNext = (skip + data.length) < total;
        const hasPrevious = page > 1;

        return {
            data,
            pagination: { total, page, limit, hasNext, hasPrevious },
            totalActive,
        };
    }

    public async uploadDocs(
        driverId: number,
        documentType: DriverDocumentType | 'profile',
        expiryDate: Date | null,
        files: Express.Multer.File[],
        actorId?: number | null
    ): Promise<any> {

        const driver = await prisma.driver.findUnique({
            where: { id: driverId }
        });

        if (!driver) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Driver"));
        }

        if (documentType === 'profile') {
            if (files.length !== 1) {
                throw new BadRequestError('Only one file is allowed for profile photo');
            }
            const file = files[0];
            const customBlobName = constant.MEDIA_PATHS.DRIVER_DOC(driverId, 'profile', file.filename);

            this.imageService.upload(file.path, customBlobName);

            await prisma.driver.update({
                where: { id: driverId },
                data: { photo_path: customBlobName }
            });

            auditService.logWithRetry({
                actor_id: actorId ?? null,
                action: constant.AUDIT_LOG_ACTION.UPDATE,
                entity_type: constant.ENTITY_TYPE.DRIVER,
                entity_id: driverId,
                metadata: {
                    message: `Uploaded profile photo`,
                    document_type: 'profile'
                },
            });

            return { photo_path: customBlobName };
        }

        const singleActiveTypes: DriverDocumentType[] = [
            DriverDocumentType.license,
            DriverDocumentType.medical,
            DriverDocumentType.insurance,
            DriverDocumentType.whiteCard
        ];

        const isSingleActive = singleActiveTypes.includes(documentType);
        console.log("file", files.length)
        if (isSingleActive && files.length > 1) {
            throw new BadRequestError(`Only one file is allowed for ${documentType} document type`);
        }

        const requiresExpiry: DriverDocumentType[] = [
            DriverDocumentType.license,
            DriverDocumentType.medical,
            DriverDocumentType.insurance
        ];

        if (requiresExpiry.includes(documentType as DriverDocumentType) && !expiryDate) {
            throw new BadRequestError(`Expiry date is required for ${documentType} document type`);
        }

        const uploadedDocs = await prisma.$transaction(async (tx) => {
            if (isSingleActive) {
                // Find existing active document and deactivate it
                await tx.driverDocument.updateMany({
                    where: {
                        driver_id: driverId,
                        document_type: documentType as DriverDocumentType,
                        is_active: true
                    },
                    data: { is_active: false }
                });
            }

            const mediaPromises = files.map(async (file) => {
                const customBlobName = constant.MEDIA_PATHS.DRIVER_DOC(driverId, documentType, file.filename);
                this.imageService.upload(file.path, customBlobName);

                return tx.driverDocument.create({
                    data: {
                        driver_id: driverId,
                        document_type: documentType as DriverDocumentType,
                        file_path: customBlobName,
                        file_name: file.originalname,
                        is_active: true,
                        expiry_date: expiryDate
                    }
                });
            });

            return Promise.all(mediaPromises);
        });

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.DRIVER,
            entity_id: driverId,
            metadata: {
                message: `Uploaded ${files.length} documents of type ${documentType}`,
                document_type: documentType
            },
        });

        return uploadedDocs;
    }
}
