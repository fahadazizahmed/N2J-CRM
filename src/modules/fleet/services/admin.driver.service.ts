import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import { ICreateDriverDTO, IAddDriverRateDTO, IUpdateDriverDTO, IGetDriversQuery, IAssignVehicleDTO } from '../dto/driver.dto';
import { DriverType, LicenseClass, Prisma, DriverStatus, DriverDocumentType } from '../../../../generated/prisma';
import ErrorMessages from '../../../common/constant/errors';
import { UnProcessableEntityError } from '../../../errors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { emailService } from '../../../services/email.service';
import config from '../../../config';
import InfoMessages from '../../../common/constant/messages';
import { ImageService } from '../../../services/image.service';
import { VehicleStatus } from '../../../../generated/prisma';


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
    getDriverEnums(): Promise<any>;
    getAllActiveNotAssignVehiclesDrivers(): Promise<any[]>;
    assignVehicle(driverId: number, assignVehicleDTO: IAssignVehicleDTO, actorId?: number | null): Promise<any>;
    getDriverWithVehicleDetails(): Promise<any[]>;
    updateDriver(id: number, updateDriverDTO: IUpdateDriverDTO, actorId?: number | null): Promise<any>;
    addDriverRates(driverId: number, addDriverRateDTO: IAddDriverRateDTO, actorId?: number | null): Promise<any>;
    getDriverById(id: number, req: any): Promise<any>;
    getDrivers(query: IGetDriversQuery): Promise<any>;
    getDriverStats(): Promise<IDriverStats>;
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
                select: { id: true, status: true, driver_id: true }
            });
            if (!existingVehicle) {
                throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Vehicle"));
            }
            if (existingVehicle.status !== VehicleStatus.active && existingVehicle.status !== VehicleStatus.idle) {
                throw new BadRequestError('Vehicle is not available for assignment (status must be active or idle).');
            }
            if (existingVehicle.driver_id)
                throw new BadRequestError("Vehicle already assigned");
        }


        const result = await prisma.$transaction(async (tx) => {

            let user;

            try {
                user = await tx.user.create({
                    data: {
                        email,
                        name: `${createDriverDTO.firstName} ${createDriverDTO.lastName}`,
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

            // 3d. Create the Driver record linked to this User
            const driver = await tx.driver.create({
                data: {
                    first_name: createDriverDTO.firstName,
                    last_name: createDriverDTO.lastName,
                    phone: createDriverDTO.phone,
                    driver_type: createDriverDTO.driverType,
                    license_number: createDriverDTO.licenseNumber,
                    license_class: createDriverDTO.licenseClass,
                    user_id: user.id,
                    is_mobile_access: createDriverDTO.isMobileAccess ?? false,
                    vehicle_id: createDriverDTO.vehicleId || null
                },
                include: {
                    user: { select: { id: true, email: true, name: true } },
                },
            });

            if (createDriverDTO.vehicleId) {
                // Keep the vehicle table in sync
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


        const uploadedDocs = await prisma.$transaction(async (tx) => {
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

            const mediaPromises = files.map(async (file, index) => {
                const customBlobName = constant.MEDIA_PATHS.DRIVER_DOC(driverId, documentType, file.filename);
                this.imageService.upload(file.path, customBlobName);

                if (activeDocToUpdate && index === 0) {
                    return tx.driverDocument.update({
                        where: { id: activeDocToUpdate.id },
                        data: {
                            file_path: customBlobName,
                            file_name: file.originalname,
                            ...(expiryDate ? { expiry_date: expiryDate } : {})
                        }
                    });
                }

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

    public async getDriverEnums(): Promise<any> {
        const enums = {

            licenseClass: Object.values(LicenseClass),
            driverType: Object.values(DriverType),
            driverStatus: Object.values(DriverStatus),


        }
        return enums
    }


    public async getAllActiveNotAssignVehiclesDrivers(): Promise<any[]> {
        const drivers = await prisma.driver.findMany({
            where: {
                status: { in: ['active'] },
                vehicle_id: null
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
            },
            orderBy: { created_at: 'desc' }
        });

        return drivers.map(v => ({
            id: v.id,
            first_name: v.first_name,
            last_name: v.last_name,
        }));
    }

    public async assignVehicle(
        driverId: number,
        assignVehicleDTO: IAssignVehicleDTO,
        actorId?: number | null
    ): Promise<any> {
        const driver = await prisma.driver.findUnique({
            where: { id: driverId }
        });


        if (!driver) {
            throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Driver"));
        }
        if (driver.status !== DriverStatus.active) {
            throw new BadRequestError('Driver is not available for assignment.');
        }

        const vehicle = await prisma.vehicle.findUnique({
            where: { id: assignVehicleDTO.vehicleId }
        });

        if (!vehicle) {
            throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Vehicle"));
        }

        if (vehicle.status !== VehicleStatus.active && vehicle.status !== VehicleStatus.idle) {
            throw new BadRequestError('Vehicle is not available for assignment (status must be active or idle).');
        }

        if (vehicle.driver_id === driverId) {
            throw new UnProcessableEntityError('Vehicle is already assigned to this driver')
        }

        const result = await prisma.$transaction(async (tx) => {
            // Unassign any vehicle previously assigned to this driver
            await tx.vehicle.updateMany({
                where: { driver_id: driverId },
                data: { driver_id: null }
            });

            // If the new vehicle was assigned to another driver (Driver B), clear their vehicle assignment
            await tx.driver.updateMany({
                where: { vehicle_id: assignVehicleDTO.vehicleId },
                data: { vehicle_id: null }
            });

            // Assign driver to new vehicle
            await tx.vehicle.update({
                where: { id: assignVehicleDTO.vehicleId },
                data: { driver_id: driverId }
            });

            // Update driver to point to new vehicle
            const updatedDriver = await tx.driver.update({
                where: { id: driverId },
                data: {
                    vehicle: { connect: { id: assignVehicleDTO.vehicleId } }
                },
                include: { user: { select: { id: true, email: true, name: true } } }
            });

            return updatedDriver;
        });

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.DRIVER,
            entity_id: driverId,
            metadata: {
                message: `Assigned vehicle ${vehicle.registration_number} to driver`,
                vehicle_id: assignVehicleDTO.vehicleId
            },
        });

        return result;
    }


    public async getDriverWithVehicleDetails(): Promise<any[]> {
        const drivers = await prisma.driver.findMany({
            include: {
                user: { select: { id: true, email: true, name: true, last_login: true } },
                vehicle: {
                    select: {
                        id: true,
                        model: true,
                        make: true,
                        make_year: true,
                        registration_number: true,

                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        return drivers.map(v => ({
            id: v.id,
            firstName: v.first_name,
            lastName: v.last_name,
            email: v.user.email,
            phone: v.phone,
            status: v.status,
            licenseClass: v.license_class,
            vehicle: v.vehicle ? {
                id: v.vehicle.id,
                model: v.vehicle.model,
                lastName: v.vehicle.make,
                make_year: v.vehicle.make_year,
                registrationNumber: v.vehicle.registration_number
            } : null
        }));
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


        let vehicleChanged = false;
        let newVehicle: any = null;

        if (updateDriverDTO.vehicleId !== undefined) {
            if (updateDriverDTO.vehicleId !== existingDriver.vehicle_id) {
                vehicleChanged = true;
                if (updateDriverDTO.vehicleId !== null) {
                    const vehicle = await prisma.vehicle.findUnique({
                        where: { id: updateDriverDTO.vehicleId },
                        select: { id: true, status: true, driver_id: true }
                    });
                    if (!vehicle) {
                        throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Vehicle"));
                    }
                    if (vehicle.status !== VehicleStatus.active && vehicle.status !== VehicleStatus.idle) {
                        throw new BadRequestError('Vehicle is not available for assignment (status must be active or idle).');
                    }
                    if (vehicle.driver_id) {
                        throw new BadRequestError("Vehicle already assigned to a driver");
                    }
                    newVehicle = vehicle;
                }
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


            if (vehicleChanged) {
                if (updateDriverDTO.vehicleId === null) {
                    updateData.vehicle = { disconnect: true };
                } else {
                    updateData.vehicle = { connect: { id: updateDriverDTO.vehicleId } };
                }
            }

            const updatedDriver = await tx.driver.update({
                where: { id },
                data: updateData,
                include: { user: { select: { id: true, email: true, name: true } } }
            });

            if (vehicleChanged) {
                if (existingDriver.vehicle_id) {
                    await tx.vehicle.update({
                        where: { id: existingDriver.vehicle_id },
                        data: { driver_id: null }
                    });
                }
                if (newVehicle) {
                    await tx.vehicle.update({
                        where: { id: newVehicle.id },
                        data: { driver_id: id }
                    });
                }
            }

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



    public async getDriverById(id: number, req: any): Promise<any> {
        const driver = await prisma.driver.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, email: true, name: true } },
                rates: true,
                documents: true,
                vehicle: { select: { id: true, registration_number: true, make: true, model: true, make_year: true, status: true } },
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
                    user: { select: { id: true, email: true, name: true, last_login: true } },
                    rates: true,
                    documents: true,
                    vehicle: { select: { id: true, registration_number: true, make: true, model: true, vehicle_category: true, status: true } }
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


    public async getDriverStats(): Promise<IDriverStats> {
        const [statusGroups, typeGroups, assignedCount, mobileCount, total] = await Promise.all([
            // Group by status
            prisma.driver.groupBy({
                by: ['status'],
                _count: { _all: true }
            }),
            // Group by driver type
            prisma.driver.groupBy({
                by: ['driver_type'],
                _count: { _all: true }
            }),
            // Count assigned drivers (vehicle_id is not null)
            prisma.driver.count({
                where: { vehicle_id: { not: null } }
            }),
            // Count drivers with mobile access
            prisma.driver.count({
                where: { is_mobile_access: true }
            }),
            // Total count
            prisma.driver.count()
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
