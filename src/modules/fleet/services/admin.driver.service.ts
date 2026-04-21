import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import { ICreateDriverDTO, IAddDriverRateDTO, IUpdateDriverDTO, IGetDriversQuery } from '../dto/driver.dto';
import { DriverType, LicenseClass, Prisma, DriverStatus, DriverDocumentType, SubcontractorStatus, SequenceEntity } from '../../../../generated/prisma';
import ErrorMessages from '../../../common/constant/errors';
import { UnProcessableEntityError } from '../../../errors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { emailService } from '../../../services/email.service';
import config from '../../../config';
import InfoMessages from '../../../common/constant/messages';
import { ImageService } from '../../../services/image.service';
import { VehicleStatus } from '../../../../generated/prisma';
import { generateEntityCode } from '../../../helper/helper.method';
import { activityService } from '../../../services/activity.service';


export interface IDriverStats {
    total: number;
    // by status
    active: number;
    inactive: number;
    suspended: number;
    onLeave: number;
    onBreak: number;
    idle: number;
    // by type
    inHouse: number;
    casual: number;
    subcontractor: number;
    // by assignment
    assigned: number;
    unassigned: number;
    // mobile access
    mobileAccessEnabled: number;
}

export interface IAdminDriverService {
    createDriver(createDriverDTO: ICreateDriverDTO, actorId?: number | null): Promise<any>;
    uploadDocs(driverId: number, documentType: DriverDocumentType | 'profile', expiryDate: Date | null, files: Express.Multer.File[], actorId?: number | null): Promise<any>;
    updateDriver(id: number, updateDriverDTO: IUpdateDriverDTO, actorId?: number | null): Promise<any>;
    getDriverById(id: number, req: any): Promise<any>;
    getDrivers(query: IGetDriversQuery): Promise<any>;
    getDriverStats(driverType?: 'inHouse' | 'subcontractor'): Promise<IDriverStats>;
    getDriverEnums(): Promise<any>;
    addDriverRates(driverId: number, addDriverRateDTO: IAddDriverRateDTO, actorId?: number | null): Promise<any>;
}

export default class AdminDriverService implements IAdminDriverService {
    private imageService = new ImageService();

    public async createDriver(
        createDriverDTO: ICreateDriverDTO,
        actorId?: number | null
    ): Promise<any> {

        const email = createDriverDTO.email.toLowerCase().trim();
        const driverRole = await prisma.role.findUnique({
            where: { name: constant.ROLES.DRIVER },
        });

        if (!driverRole) {
            throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Driver role"));
        }
        if (createDriverDTO.driverType === DriverType.inHouse && createDriverDTO.subcontractorId) {
            throw new BadRequestError(
                'Subcontractor id should not be provided for in-house driver'
            );
        }

        const result = await prisma.$transaction(async (tx) => {

            let user;

            try {
                user = await tx.user.create({
                    data: {
                        email,
                        password_hash: "pending_setup",
                        invite_token: "pending",
                        status: 0,
                        roles: { connect: { id: driverRole.id } }
                    },
                    select: { id: true, email: true, name: true }
                });
            } catch (e: any) {
                if (e.code === "P2002") {
                    throw new BadRequestError(ErrorMessages.GENERIC.DUPLICATE_EMAIL);
                }
                throw e;
            }


            // check if subcontractor exist
            const finalDriverType = createDriverDTO.driverType ?? DriverType.inHouse;

            let finalSubcontractorId: number | null = null;
            if (finalDriverType === DriverType.subcontractor) {
                if (!createDriverDTO.subcontractorId) {
                    throw new BadRequestError('Subcontractor id is required for subcontractor vehicles');
                }
                const subcontractor = await tx.subcontractor.findUnique({
                    where: { id: createDriverDTO.subcontractorId }
                });
                if (!subcontractor) {
                    throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Subcontractor"));
                }
                if (subcontractor.status !== SubcontractorStatus.active) {
                    throw new BadRequestError('Subcontractor must be active to assign vehicles');
                }
                finalSubcontractorId = subcontractor.id;
            }
            const driverNumber = await generateEntityCode({
                tx,
                entity: SequenceEntity.DRIVER,
                prefix: constant.CODE_PREFIX.DRIVER,

            });



            // 3d. Create the Driver record linked to this User
            const driver = await tx.driver.create({
                data: {
                    driver_number: driverNumber,
                    first_name: createDriverDTO.firstName,
                    last_name: createDriverDTO.lastName,
                    phone: createDriverDTO.phone,
                    driver_type: createDriverDTO.driverType,
                    license_number: createDriverDTO.licenseNumber,
                    license_class: createDriverDTO.licenseClass,
                    user_id: user.id,
                    is_mobile_access: createDriverDTO.isMobileAccess ?? false,
                    subcontractor_id: finalSubcontractorId,
                },

                include: {
                    user: { select: { id: true, email: true, name: true } },
                },
            });


            if (createDriverDTO.vehicleId) {
                //We find vehicle
                const existingVehicle = await tx.vehicle.findUnique({
                    where: { id: createDriverDTO.vehicleId },
                    select: { id: true, status: true, driver_id: true, subcontractor_id: true }
                });

                //Check vehicle exist

                if (!existingVehicle) {
                    throw new UnProcessableEntityError(
                        ErrorMessages.GENERIC.ITEM_NOT_FOUND("Vehicle")
                    );
                }

                //Vehicle active and idle
                if (
                    existingVehicle.status !== VehicleStatus.active &&
                    existingVehicle.status !== VehicleStatus.idle
                ) {
                    throw new BadRequestError(
                        'Vehicle is not available for assignment (status must be active or idle).'
                    );
                }
                //vehicle already has no driver

                if (existingVehicle.driver_id) {
                    throw new BadRequestError("Vehicle already assigned");
                }

                //if driver type is subcontractor and vehicle subcotnractor match with the subcontractor
                if (finalDriverType === DriverType.subcontractor && finalSubcontractorId) {
                    if (existingVehicle.subcontractor_id !== finalSubcontractorId) {
                        throw new BadRequestError("Vehicle does not belong to this subcontractor");
                    }
                }

                //if driver type inhouse and user send vehicle which has owenrr contractor not inHouse then error
                if (finalDriverType === DriverType.inHouse) {
                    if (existingVehicle.subcontractor_id) {
                        throw new BadRequestError(
                            "In-house driver cannot be assigned subcontractor vehicle"
                        );
                    }
                }

                const updated = await tx.vehicle.updateMany({
                    where: {
                        id: createDriverDTO.vehicleId,
                        driver_id: null,
                        status: { in: [VehicleStatus.active, VehicleStatus.idle] }
                    },
                    data: { driver_id: driver.id }
                });

                if (updated.count !== 1) {
                    throw new BadRequestError("Vehicle assignment failed");
                }
            }

            // ─── 5. Rate Validation ─────────────────────
            if (finalDriverType === DriverType.subcontractor) {
                const hasAnyRate =
                    createDriverDTO.hourlyRate != null ||
                    createDriverDTO.hourlyRateWeekend != null ||
                    createDriverDTO.nightRate != null ||
                    createDriverDTO.nightRateWeekend != null;

                if (!hasAnyRate) {
                    throw new BadRequestError(
                        "At least one rate is required for subcontractor drivers"
                    );
                }
            }

            // ─── 6. Create Driver Rate ─────────────────────
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
                        effective_from: new Date(), // 🔥 important
                        driver: { connect: { id: driver.id } },
                    }
                });
            }


            return { driver, user };
        }, { maxWait: constant.TX_MAX_WAIT, timeout: constant.TX_TIMEOUT });

        const { driver, user } = result;

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
            activityService.log({
                actor_id: actorId ?? null,
                entity_type: constant.ENTITY_TYPE.DRIVER,
                entity_id: driver.id,
                action: "invited",
                message: `Driver ${createDriverDTO.firstName} ${createDriverDTO.lastName} invited`,
            })

        ]);

        return driver;
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

            await this.imageService.upload(file.path, customBlobName);

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

        if (isSingleActive && files.length > 1) {
            throw new BadRequestError(`Only one file is allowed for ${documentType} document type`);
        }

        const requiresExpiry: DriverDocumentType[] = [
            DriverDocumentType.license,
            DriverDocumentType.medical,
            DriverDocumentType.insurance
        ];

        if (files.length > 0) {
            if (requiresExpiry.includes(documentType as DriverDocumentType) && !expiryDate) {
                throw new BadRequestError(`Expiry date is required for ${documentType} document type`);
            }
        } else {
            if (!expiryDate) {
                throw new BadRequestError(`Please provide a document or an expiry date to update`);
            }

            const activeDoc = await prisma.driverDocument.findFirst({
                where: {
                    driver_id: driverId,
                    document_type: documentType as DriverDocumentType,
                    is_active: true
                }
            });


            if (!activeDoc) {
                const newDoc = await prisma.driverDocument.create({
                    data: {
                        driver_id: driverId,
                        document_type: documentType as DriverDocumentType,
                        file_path: "",
                        file_name: null, // No file name yet
                        is_active: true,
                        expiry_date: expiryDate
                    }
                });

                auditService.logWithRetry({
                    actor_id: actorId ?? null,
                    action: constant.AUDIT_LOG_ACTION.CREATE,
                    entity_type: constant.ENTITY_TYPE.DRIVER,
                    entity_id: driverId,
                    metadata: {
                        message: `Saved expiry date for ${documentType} document`,
                        document_type: documentType
                    },
                });


                return [newDoc];
            }


            const updatedDoc = await prisma.driverDocument.update({
                where: { id: activeDoc.id },
                data: { expiry_date: expiryDate }
            });

            auditService.logWithRetry({
                actor_id: actorId ?? null,
                action: constant.AUDIT_LOG_ACTION.UPDATE,
                entity_type: constant.ENTITY_TYPE.DRIVER,
                entity_id: driverId,
                metadata: {
                    message: `Updated expiry date for ${documentType} document`,
                    document_type: documentType
                },
            });

            return [updatedDoc];
        }

        const uploadedFiles = await Promise.all(
            files.map(async (file) => {

                const blobName = constant.MEDIA_PATHS.DRIVER_DOC(
                    driverId,
                    documentType,
                    file.filename
                );

                await this.imageService.upload(file.path, blobName);

                return {
                    blobName,
                    originalName: file.originalname
                };
            })
        );
        let uploadedDocs;
        try {
            uploadedDocs = await prisma.$transaction(async (tx) => {
                let activeDocToUpdate: any = null;

                if (isSingleActive) {

                    //     // Find existing active document
                    const activeDocs = await tx.driverDocument.findMany({
                        where: {
                            driver_id: driverId,
                            document_type: documentType as DriverDocumentType,
                            is_active: true
                        }
                    });


                    if (activeDocs.length > 0) {
                        const firstActive = activeDocs[0];
                        if (!firstActive.file_path || firstActive.file_path === "") {
                            activeDocToUpdate = firstActive;
                        } else {

                            // Deactivate previous active documents
                            await tx.driverDocument.updateMany({
                                where: {
                                    driver_id: driverId,
                                    document_type: documentType as DriverDocumentType,
                                    is_active: true
                                },
                                data: { is_active: false }
                            });
                        }
                    }
                } else {

                    activeDocToUpdate = await tx.driverDocument.findFirst({
                        where: {
                            driver_id: driverId,
                            document_type: documentType as DriverDocumentType,
                            is_active: true,
                            file_path: ""
                        }
                    });
                }

                const ops = uploadedFiles.map((f, index) => {

                    if (activeDocToUpdate && index === 0) {
                        return tx.driverDocument.update({
                            where: { id: activeDocToUpdate.id },
                            data: {
                                file_path: f.blobName,
                                file_name: f.originalName,
                                ...(expiryDate ? { expiry_date: expiryDate } : {})
                            }
                        });
                    }

                    return tx.driverDocument.create({
                        data: {
                            driver_id: driverId,
                            document_type: documentType as DriverDocumentType,
                            file_path: f.blobName,
                            file_name: f.originalName,
                            is_active: true,
                            expiry_date: expiryDate
                        }
                    });
                });

                return Promise.all(ops);


            }, { maxWait: constant.TX_MAX_WAIT, timeout: constant.TX_TIMEOUT });
        } catch (err) {

            // 🔥 OPTIONAL CLEANUP — delete uploaded files
            // await Promise.all(
            //     uploadedFiles.map(f =>
            //         this.imageService.delete?.(f.blobName)
            //     )
            // );

            throw err;
        }

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

        const result = await prisma.$transaction(async (tx) => {
            const updateData: Prisma.DriverUncheckedUpdateInput = {};

            let resolvedDriverType: DriverType = existingDriver.driver_type;
            if (updateDriverDTO.driverType !== undefined) {
                resolvedDriverType = updateDriverDTO.driverType;
                updateData.driver_type = resolvedDriverType;
            }

            if (resolvedDriverType === DriverType.inHouse && updateDriverDTO.subcontractorId) {
                throw new BadRequestError(
                    'Subcontractor id should not be provided for in-house driver'
                );
            }

            let resolvedSubcontractorId: number | null = existingDriver.subcontractor_id;
            if (resolvedDriverType === DriverType.subcontractor) {
                const subId = updateDriverDTO.subcontractorId ?? existingDriver.subcontractor_id;
                if (!subId) {
                    throw new BadRequestError('Subcontractor id is required for subcontractor drivers');
                }
                const subcontractor = await tx.subcontractor.findUnique({
                    where: { id: subId }
                });
                if (!subcontractor) {
                    throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Subcontractor"));
                }
                if (subcontractor.status !== SubcontractorStatus.active) {
                    throw new BadRequestError('Subcontractor must be active to assign drivers');
                }
                resolvedSubcontractorId = subId;
                updateData.subcontractor_id = subId;
            } else {
                resolvedSubcontractorId = null;
                updateData.subcontractor_id = null;
            }

            if (updateDriverDTO.firstName !== undefined) updateData.first_name = updateDriverDTO.firstName;
            if (updateDriverDTO.lastName !== undefined) updateData.last_name = updateDriverDTO.lastName;
            if (updateDriverDTO.phone !== undefined) updateData.phone = updateDriverDTO.phone;
            if (updateDriverDTO.licenseNumber !== undefined) updateData.license_number = updateDriverDTO.licenseNumber;
            if (updateDriverDTO.licenseClass !== undefined) updateData.license_class = updateDriverDTO.licenseClass;
            if (updateDriverDTO.licenseExpiry !== undefined) updateData.license_expiry = updateDriverDTO.licenseExpiry;
            if (updateDriverDTO.isMobileAccess !== undefined) updateData.is_mobile_access = updateDriverDTO.isMobileAccess;
            if (updateDriverDTO.status !== undefined) updateData.status = updateDriverDTO.status;
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

            let vehicleToValidate: any = null;
            const isVehicleRemoved = updateDriverDTO.vehicleId === null;

            if (updateDriverDTO.vehicleId !== undefined) {
                if (updateDriverDTO.vehicleId === null) {
                    await tx.vehicle.updateMany({
                        where: { driver_id: id },
                        data: { driver_id: null }
                    });
                } else {
                    vehicleToValidate = await tx.vehicle.findUnique({
                        where: { id: updateDriverDTO.vehicleId },
                        select: { id: true, subcontractor_id: true, status: true, driver_id: true }
                    });

                    if (!vehicleToValidate) {
                        throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Vehicle"));
                    }

                    if (vehicleToValidate.status !== VehicleStatus.active && vehicleToValidate.status !== VehicleStatus.idle) {
                        throw new BadRequestError('Vehicle is not available for assignment (status must be active or idle).');
                    }

                    if (vehicleToValidate.driver_id && vehicleToValidate.driver_id !== id) {
                        throw new BadRequestError("Vehicle already assigned to another driver");
                    }

                    const updated = await tx.vehicle.updateMany({
                        where: {
                            id: updateDriverDTO.vehicleId,
                            driver_id: null,
                            status: { in: [VehicleStatus.active, VehicleStatus.idle] }
                        },
                        data: { driver_id: id }
                    });

                    if (updated.count !== 1) {
                        throw new BadRequestError("Vehicle not available, not found, or already assigned");
                    }

                    await tx.vehicle.updateMany({
                        where: { driver_id: id, id: { not: updateDriverDTO.vehicleId } },
                        data: { driver_id: null }
                    });
                }
            }

            if (!isVehicleRemoved && !vehicleToValidate) {
                if (updateDriverDTO.driverType !== undefined || updateDriverDTO.subcontractorId !== undefined) {
                    const assignedVehicle = await tx.vehicle.findFirst({
                        where: { driver_id: id },
                        select: { id: true, subcontractor_id: true }
                    });
                    if (assignedVehicle) {
                        vehicleToValidate = assignedVehicle;
                    }
                }
            }

            if (vehicleToValidate && !isVehicleRemoved) {
                if (resolvedDriverType === DriverType.subcontractor && resolvedSubcontractorId) {
                    if (vehicleToValidate.subcontractor_id !== resolvedSubcontractorId) {
                        throw new BadRequestError("Vehicle does not belong to this subcontractor");
                    }
                } else if (resolvedDriverType === DriverType.inHouse) {
                    if (vehicleToValidate.subcontractor_id) {
                        throw new BadRequestError("In-house driver cannot be assigned subcontractor vehicle");
                    }
                }
            }

            const updatedDriver = await tx.driver.update({
                where: { id },
                data: updateData,
                include: {
                    user: { select: { id: true, email: true, name: true } }
                }
            });


            if (
                updateDriverDTO.hourlyRate !== undefined ||
                updateDriverDTO.hourlyRateWeekend !== undefined ||
                updateDriverDTO.nightRate !== undefined ||
                updateDriverDTO.nightRateWeekend !== undefined
            ) {
                const rateData: any = {};

                if (updateDriverDTO.hourlyRate !== undefined) {
                    rateData.hourly_rate = updateDriverDTO.hourlyRate;
                }

                if (updateDriverDTO.hourlyRateWeekend !== undefined) {
                    rateData.hourly_rate_weekend = updateDriverDTO.hourlyRateWeekend;
                }

                if (updateDriverDTO.nightRate !== undefined) {
                    rateData.night_rate = updateDriverDTO.nightRate;
                }

                if (updateDriverDTO.nightRateWeekend !== undefined) {
                    rateData.night_rate_weekend = updateDriverDTO.nightRateWeekend;
                }

                await tx.driverRate.create({
                    data: {
                        ...rateData,
                        effective_from: new Date(), // 🔥 VERY IMPORTANT
                        driver: { connect: { id } }
                    }
                });
            }

            if (resolvedDriverType === DriverType.subcontractor) {
                const finalRate = await tx.driverRate.findFirst({
                    where: { driver_id: id },
                    orderBy: { effective_from: 'desc' }
                });

                if (
                    !finalRate ||
                    (finalRate.hourly_rate == null &&
                        finalRate.hourly_rate_weekend == null &&
                        finalRate.night_rate == null &&
                        finalRate.night_rate_weekend == null)
                ) {
                    throw new BadRequestError(
                        "At least one rate is required for subcontractor drivers."
                    );
                }
            }

            return updatedDriver;
        }, { maxWait: constant.TX_MAX_WAIT, timeout: constant.TX_TIMEOUT });

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.DRIVER,
            entity_id: id,
            metadata: result,
        });

        return result;
    }


    public async getDriverById(id: number, req: any): Promise<any> {
        const driverRaw = await prisma.driver.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, email: true, name: true } },
                rates: true,
                documents: true,
                subcontractor: true,
                assigned_vehicles: { select: { id: true, registration_number: true, make: true, model: true, make_year: true, status: true } },
            },
        });

        if (!driverRaw) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Driver'));
        }

        const driver = {
            ...driverRaw,
            vehicle: driverRaw.assigned_vehicles?.[0] || null
        };

        const singleActiveTypes: DriverDocumentType[] = [
            DriverDocumentType.license,
            DriverDocumentType.medical,
            DriverDocumentType.insurance,
            DriverDocumentType.whiteCard
        ];
        let filteredDocuments: any = driver.documents
        if (req.query && req.query.docs !== "allDocs") {
            filteredDocuments = driver.documents.filter((doc) => {
                if (singleActiveTypes.includes(doc.document_type as DriverDocumentType)) {
                    return doc.is_active === true;
                }
                return true;
            });

        }

        // Resolve signed URLs for each document (parallel)
        const documentsWithUrls = await Promise.all(
            filteredDocuments.map(async (doc: any) => ({
                ...doc,
                document_url: doc.file_path ? await this.imageService.getImageUrl(doc.file_path) : null,
            }))
        );

        let photo_url = null;
        if (driver.photo_path) {
            photo_url = await this.imageService.getImageUrl(driver.photo_path);
        }

        return { ...driver, documents: documentsWithUrls, photo_url };
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
        if (query.driverType === 'subcontractor') {
            where.driver_type = DriverType.subcontractor;
        } else {
            // default ('inHouse' or not provided) → inHouse + casual
            where.driver_type = { in: [DriverType.inHouse, DriverType.casual] };
        }

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

        const [rawData, total, totalActive] = await prisma.$transaction([
            prisma.driver.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    user: { select: { id: true, email: true, name: true, last_login: true } },
                    rates: true,
                    documents: true,
                    assigned_vehicles: { select: { id: true, registration_number: true, make: true, model: true, vehicle_category: true, status: true } }
                },
            }),
            prisma.driver.count({ where }),
            prisma.driver.count({ where: { status: DriverStatus.active } }),
        ]);

        const data = rawData.map(d => ({
            ...d,
            vehicle: d.assigned_vehicles?.[0] || null
        }));

        const hasNext = (skip + data.length) < total;
        const hasPrevious = page > 1;

        return {
            data,
            pagination: { total, page, limit, hasNext, hasPrevious },
            totalActive,
        };
    }

    public async getDriverEnums(): Promise<any> {
        const enums = {

            licenseClass: Object.values(LicenseClass),
            driverType: Object.values(DriverType),
            driverStatus: Object.values(DriverStatus),


        }
        return enums
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




    public async getDriverStats(driverType?: 'inHouse' | 'subcontractor'): Promise<IDriverStats> {

        const typeFilter: Prisma.DriverWhereInput =
            driverType === 'subcontractor'
                ? { driver_type: DriverType.subcontractor }
                : { driver_type: { in: [DriverType.inHouse, DriverType.casual] } };

        const [statusGroups, typeGroups, assignedCount, mobileCount, total] = await Promise.all([
            // Group by status
            prisma.driver.groupBy({
                by: ['status'],
                where: typeFilter,
                _count: { _all: true }
            }),
            // Group by driver type
            prisma.driver.groupBy({
                by: ['driver_type'],
                where: typeFilter,
                _count: { _all: true }
            }),
            // Count assigned drivers (has assigned_vehicles)
            prisma.driver.count({
                where: { ...typeFilter, assigned_vehicles: { some: {} } }
            }),
            // Count drivers with mobile access
            prisma.driver.count({
                where: { ...typeFilter, is_mobile_access: true }
            }),
            // Total count
            prisma.driver.count({ where: typeFilter })
        ]);

        // Build status map
        const statusMap: Record<string, number> = {};
        for (const group of statusGroups) {
            statusMap[group.status] = group._count._all;
        }

        // Build type map
        const typeMap: Record<string, number> = {};
        for (const group of typeGroups) {
            typeMap[group.driver_type] = group._count._all;
        }

        return {
            total,
            // status breakdown
            active: statusMap[DriverStatus.active] ?? 0,
            inactive: statusMap[DriverStatus.inactive] ?? 0,
            suspended: statusMap[DriverStatus.suspended] ?? 0,
            onLeave: statusMap[DriverStatus.onLeave] ?? 0,
            onBreak: statusMap[DriverStatus.onBreak] ?? 0,
            idle: statusMap[DriverStatus.idle] ?? 0,
            // type breakdown
            inHouse: typeMap[DriverType.inHouse] ?? 0,
            casual: typeMap[DriverType.casual] ?? 0,
            subcontractor: typeMap[DriverType.subcontractor] ?? 0,
            // assignment breakdown
            assigned: assignedCount,
            unassigned: total - assignedCount,
            // mobile access
            mobileAccessEnabled: mobileCount,
        };
    }
}
