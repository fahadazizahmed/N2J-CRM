import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { UnProcessableEntityError } from '../../../errors/unprocessable-entity.error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import ErrorMessages from '../../../common/constant/errors';
import { ICreateVehicleDTO, IUpdateVehicleDTO, IGetVehiclesQuery, IAssignDriverDTO } from '../dto/vehicle.dto';
import { Vehicle, Prisma, VehicleStatus, VehicleType, DriverStatus, SequenceEntity, VehicleDocumentType } from '../../../../generated/prisma';
import { ImageService } from '../../../services/image.service';
import { generateEntityCode } from '../../../helper/helper.method';

export interface IVehicleStats {
    total: number;
    // by status
    active: number;
    idle: number;
    maintenance: number;
    outOfService: number;
    // by category
    inHouse: number;
    casual: number;
    subcontractor: number;
    // by assignment
    assigned: number;
    unassigned: number;
}

export interface IAdminVehicleService {
    createVehicle(createVehicleDTO: ICreateVehicleDTO, actorId?: number | null): Promise<Vehicle>;
    uploadMedia(vehicleId: number, documentType: VehicleDocumentType, expiryDate: Date | null, files: Express.Multer.File[], actorId?: number | null): Promise<any>;
    getVehicleStatuses(): Promise<string[]>;
    getVehicleTypes(): Promise<VehicleType[]>;
    getAllActiveIdleVehicles(): Promise<any[]>;
    getVehiclesWithDriverDetails(): Promise<any[]>;
    assignDriver(vehicleId: number, assignDriverDTO: IAssignDriverDTO, actorId?: number | null): Promise<any>;
    getVehicleById(id: number): Promise<any>;
    updateVehicle(id: number, updateVehicleDTO: IUpdateVehicleDTO, actorId?: number | null): Promise<Vehicle>;
    getVehicles(query: IGetVehiclesQuery): Promise<{
        data: any[];
        pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean };
    }>;
    getVehicleDocs(id: number): Promise<any>;
    getVehicleStats(): Promise<IVehicleStats>;
}

export default class AdminVehicleService implements IAdminVehicleService {
    private imageService = new ImageService();

    public async createVehicle(
        createVehicleDTO: ICreateVehicleDTO,
        actorId?: number | null
    ): Promise<Vehicle> {

        const registration = createVehicleDTO.registrationNumber.trim().toUpperCase();
        const existingVehicle = await prisma.vehicle.findUnique({
            where: { registration_number: registration }
        });

        if (existingVehicle) {
            throw new BadRequestError(ErrorMessages.FLEET.VEHICLE_ALREADY_EXIST);
        }

        const vehicle = await prisma.$transaction(async (tx) => {
            let vehicleTypeId: number;


            if (createVehicleDTO.vehicleTypeId) {
                // Verify vehicle_type_id exists
                const vehicleType = await tx.vehicleType.findUnique({
                    where: { id: createVehicleDTO.vehicleTypeId }
                });

                if (!vehicleType) {
                    throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Vehicle Type"));
                }
                vehicleTypeId = vehicleType.id;
            } else if (createVehicleDTO.vehicleTypeName) {
                // Check if name already exists, otherwise create it
                let vehicleType = await tx.vehicleType.findFirst({
                    where: {
                        name: {
                            equals: createVehicleDTO.vehicleTypeName,
                            mode: 'insensitive'
                        }
                    }
                });

                if (!vehicleType) {
                    vehicleType = await tx.vehicleType.create({
                        data: { name: createVehicleDTO.vehicleTypeName }
                    });
                }
                vehicleTypeId = vehicleType.id;
            } else {
                throw new BadRequestError('Either vehicle_type_id or vehicle_type_name must be provided');
            }

            let driver: any = null;

            if (createVehicleDTO.driverId) {
                driver = await tx.driver.findUnique({
                    where: { id: createVehicleDTO.driverId },
                    select: { id: true, status: true, vehicle_id: true }
                });
                if (!driver) {
                    throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Driver"));
                }
                if (driver.status !== DriverStatus.active) {
                    throw new BadRequestError('Driver is not available for assignment (status must be active).');
                }

                if (driver.vehicle_id)
                    throw new BadRequestError("Driver already assigned to a vehicle");
            }

            let vehicle;

            try {
                // Generate vehicle number (e.g. NJA-VH-2026-001)
                const vehicleNumber = await generateEntityCode({
                    tx,
                    entity: SequenceEntity.VEHICLE,
                    prefix: constant.CODE_PREFIX.VEHICLE,
                });

                vehicle = await tx.vehicle.create({
                    data: {
                        vehicle_number: vehicleNumber,
                        registration_number: registration,
                        vehicle_type: { connect: { id: vehicleTypeId } },
                        make: createVehicleDTO.make,
                        model: createVehicleDTO.model,
                        make_year: createVehicleDTO.makeYear,
                        mileage: createVehicleDTO.mileage,
                        last_service_date: createVehicleDTO.lastServiceDate,
                        service_mileage: createVehicleDTO.serviceMileage,
                        notes: createVehicleDTO.notes,
                        status: createVehicleDTO.status,
                        vehicle_category: createVehicleDTO.vehicleCategory ?? 'inHouse',
                        created_by: actorId ?? null
                    }
                });
            } catch (e: any) {
                if (e.code === "P2002")
                    throw new BadRequestError("Vehicle already exists");

                throw e;
            }

            if (driver) {
                await tx.driver.update({
                    where: { id: driver.id },
                    data: { vehicle_id: vehicle.id }
                });

                await tx.vehicle.update({
                    where: { id: vehicle.id },
                    data: { driver_id: driver.id }
                });
            }


            return vehicle;

        }, { maxWait: 10000, timeout: 20000 })

        // ── 5️⃣ Audit log (outside transaction) ─────────────────
        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.CREATE,
            entity_type: constant.ENTITY_TYPE.VEHICLE,
            entity_id: vehicle.id,
            metadata: vehicle
        });

        return vehicle;
    }

    public async uploadMedia(
        vehicleId: number,
        documentType: VehicleDocumentType,
        expiryDate: Date | null,
        files: Express.Multer.File[],
        actorId?: number | null
    ): Promise<any> {

        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicleId }
        });

        if (!vehicle) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Vehicle'));
        }

        const fileRequiredTypeDocs: VehicleDocumentType[] = [
            VehicleDocumentType.compliance,
            VehicleDocumentType.maintenance,
            VehicleDocumentType.other,
            VehicleDocumentType.photos,
        ];
        const docsFound = fileRequiredTypeDocs.includes(documentType);
        if (docsFound && files.length === 0) {
            throw new BadRequestError(`File is required for ${documentType} document type`);
        }


        const singleActiveTypes: VehicleDocumentType[] = [
            VehicleDocumentType.registration,
            VehicleDocumentType.insurance,

        ];

        const isSingleActive = singleActiveTypes.includes(documentType);

        if (isSingleActive && files.length > 1) {
            throw new BadRequestError(`Only one file is allowed for ${documentType} document type`);
        }

        const requiresExpiry: VehicleDocumentType[] = [
            VehicleDocumentType.registration,
            VehicleDocumentType.insurance
        ];
        if (files.length > 0) {
            if (requiresExpiry.includes(documentType as VehicleDocumentType) && !expiryDate) {
                throw new BadRequestError(`Expiry date is required for ${documentType} document type`);
            }
        }
        else {
            if (!expiryDate) {
                throw new BadRequestError(`Please provide a document or an expiry date to update`);
            }

            const activeDoc = await prisma.vehicleMedia.findFirst({
                where: {
                    vehicle_id: vehicleId,
                    vehicle_document_type: documentType as VehicleDocumentType,
                    is_active: true
                }
            });

            if (!activeDoc) {
                const newDoc = await prisma.vehicleMedia.create({
                    data: {
                        vehicle_id: vehicleId,
                        vehicle_document_type: documentType as VehicleDocumentType,
                        file_path: "",
                        file_name: null, // No file name yet
                        is_active: true,
                        expiry_date: expiryDate
                    }
                });
                auditService.logWithRetry({
                    actor_id: actorId ?? null,
                    action: constant.AUDIT_LOG_ACTION.CREATE,
                    entity_type: constant.ENTITY_TYPE.VEHICLE,
                    entity_id: vehicleId,
                    metadata: {
                        message: `Saved expiry date for ${documentType} document`,
                        document_type: documentType
                    },
                });


                return [newDoc];
            }

            const updatedDoc = await prisma.vehicleMedia.update({
                where: { id: activeDoc.id },
                data: { expiry_date: expiryDate }
            });

            auditService.logWithRetry({
                actor_id: actorId ?? null,
                action: constant.AUDIT_LOG_ACTION.UPDATE,
                entity_type: constant.ENTITY_TYPE.DRIVER,
                entity_id: vehicleId,
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

                const activeDocs = await tx.vehicleMedia.findMany({
                    where: {
                        vehicle_id: vehicleId,
                        vehicle_document_type: documentType as VehicleDocumentType,
                        is_active: true
                    }
                });


                if (activeDocs.length > 0) {
                    const firstActive = activeDocs[0];
                    if (!firstActive.file_path || firstActive.file_path === "") {
                        activeDocToUpdate = firstActive;
                    } else {

                        // Deactivate previous active documents
                        await tx.vehicleMedia.updateMany({
                            where: {
                                vehicle_id: vehicleId,
                                vehicle_document_type: documentType as VehicleDocumentType,
                                is_active: true
                            },
                            data: { is_active: false }
                        });
                    }
                }
            }

            else {
                activeDocToUpdate = await tx.vehicleMedia.findFirst({
                    where: {
                        vehicle_id: vehicleId,
                        vehicle_document_type: documentType as VehicleDocumentType,
                        is_active: true,
                        file_path: ""
                    }
                });

            }

            const mediaPromises = files.map(async (file, index) => {
                const customBlobName = constant.MEDIA_PATHS.VEHICLE_MEDIA(vehicle.registration_number, documentType, file.filename);
                this.imageService.upload(file.path, customBlobName);

                if (activeDocToUpdate && index === 0) {
                    return tx.vehicleMedia.update({
                        where: { id: activeDocToUpdate.id },
                        data: {
                            file_path: customBlobName,
                            file_name: file.originalname,
                            ...(expiryDate ? { expiry_date: expiryDate } : {})
                        }
                    });
                }

                return tx.vehicleMedia.create({
                    data: {
                        vehicle_id: vehicleId,
                        vehicle_document_type: documentType as VehicleDocumentType,
                        file_path: customBlobName,
                        file_name: file.originalname,
                        is_active: true,
                        expiry_date: expiryDate
                    }
                });
            });

            return Promise.all(mediaPromises);
        }, { maxWait: 10000, timeout: 20000 })

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.DRIVER,
            entity_id: vehicleId,
            metadata: {
                message: `Uploaded ${files.length} documents of type ${documentType}`,
                document_type: documentType
            },
        });

        return uploadedDocs;

    }

    public async getVehicleStatuses(): Promise<string[]> {
        return Object.values(VehicleStatus);
    }

    public async getVehicleTypes(): Promise<VehicleType[]> {
        return prisma.vehicleType.findMany({
            orderBy: { name: 'asc' }
        });
    }

    public async getAllActiveIdleVehicles(): Promise<any[]> {
        const vehicles = await prisma.vehicle.findMany({
            where: {
                status: { in: ['active', 'idle'] },
                driver_id: null
            },
            select: {
                id: true,
                make: true,
                model: true,
                make_year: true,
                registration_number: true,
                status: true
            },
            orderBy: { created_at: 'desc' }
        });

        return vehicles.map(v => ({
            id: v.id,
            make: v.make,
            model: v.model,
            makeYear: v.make_year,
            registrationNumber: v.registration_number,
            status: v.status
        }));
    }


    public async getVehiclesWithDriverDetails(): Promise<any[]> {
        const vehicles = await prisma.vehicle.findMany({
            include: {
                driver: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        phone: true,
                        email: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        return vehicles.map(v => ({
            id: v.id,
            make: v.make,
            model: v.model,
            makeYear: v.make_year,
            registrationNumber: v.registration_number,
            status: v.status,
            driver: v.driver ? {
                id: v.driver.id,
                firstName: v.driver.first_name,
                lastName: v.driver.last_name,
                phone: v.driver.phone,
                email: v.driver.email
            } : null
        }));
    }


    public async assignDriver(
        vehicleId: number, assignDriverDTO: IAssignDriverDTO, actorId?: number | null
    ): Promise<any> {


        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicleId }
        });
        if (!vehicle) {
            throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Vehicle"));
        }
        if (vehicle.status !== VehicleStatus.active && vehicle.status !== VehicleStatus.idle) {
            throw new BadRequestError('Vehicle is not available for assignment (status must be active or idle).');
        }

        const driver = await prisma.driver.findUnique({
            where: { id: assignDriverDTO.driverId }
        });

        if (!driver) {
            throw new UnProcessableEntityError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("driver"));
        }

        if (driver.status !== DriverStatus.active) {
            throw new BadRequestError('Driver is not available for assignment.');
        }

        if (vehicle.driver_id === assignDriverDTO.driverId) {
            throw new UnProcessableEntityError(
                "Driver already assigned to this vehicle"
            );
        }

        const result = await prisma.$transaction(async (tx) => {

            await tx.driver.updateMany({
                where: { vehicle_id: vehicleId },
                data: { vehicle_id: null }
            });

            // If the new vehicle was assigned to another driver (Driver B), clear their vehicle assignment
            await tx.vehicle.updateMany({
                where: { driver_id: assignDriverDTO.driverId },
                data: { driver_id: null }
            });

            // Assign driver to new vehicle
            await tx.vehicle.update({
                where: { id: vehicleId },
                data: { driver_id: assignDriverDTO.driverId }
            });

            // Update driver to point to new vehicle
            const updatedDriver = await tx.driver.update({
                where: { id: assignDriverDTO.driverId },
                data: {
                    vehicle: { connect: { id: vehicleId } }
                },
                include: { user: { select: { id: true, email: true, name: true } } }
            });

            return updatedDriver;
        }, { maxWait: 10000, timeout: 20000 });

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.VEHICLE,
            entity_id: vehicleId,
            metadata: {
                message: `Assigned driver ${driver.first_name + "" + driver.last_name} to driver`,
                driver_id: assignDriverDTO.driverId
            },
        });

        return result;
    }

    public async updateVehicle(
        id: number,
        updateVehicleDTO: IUpdateVehicleDTO,
        actorId?: number | null
    ): Promise<Vehicle> {

        const existingVehicle = await prisma.vehicle.findUnique({
            where: { id }
        });

        if (!existingVehicle) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Vehicle'));
        }

        let registration: string | undefined;
        if (updateVehicleDTO.registrationNumber) {
            registration = updateVehicleDTO.registrationNumber.trim().toUpperCase();
            if (registration !== existingVehicle.registration_number) {
                const conflict = await prisma.vehicle.findUnique({
                    where: { registration_number: registration }
                });

                if (conflict) {
                    throw new BadRequestError(ErrorMessages.FLEET.VEHICLE_ALREADY_EXIST);
                }
            }
        }

        let driverChanged = false;
        let newDriver: any = null;

        if (updateVehicleDTO.driverId !== undefined) {
            if (updateVehicleDTO.driverId !== existingVehicle.driver_id) {
                driverChanged = true;
                if (updateVehicleDTO.driverId !== null) {
                    const driver = await prisma.driver.findUnique({
                        where: { id: updateVehicleDTO.driverId },
                        select: { id: true, status: true, vehicle_id: true }
                    });
                    if (!driver) {
                        throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Driver"));
                    }
                    if (driver.status !== DriverStatus.active) {
                        throw new BadRequestError('Driver is not available for assignment (status must be active).');
                    }
                    if (driver.vehicle_id) {
                        throw new BadRequestError("Driver already assigned to a vehicle");
                    }
                    newDriver = driver;
                }
            }
        }

        const updatedVehicle = await prisma.$transaction(async (tx) => {
            let finalVehicleTypeId = existingVehicle.vehicle_type_id;

            if (updateVehicleDTO.vehicleTypeId) {
                const vehicleType = await tx.vehicleType.findUnique({
                    where: { id: updateVehicleDTO.vehicleTypeId }
                });

                if (!vehicleType) {
                    throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Vehicle Type"));
                }
                finalVehicleTypeId = vehicleType.id;
            } else if (updateVehicleDTO.vehicleTypeName) {
                let vehicleType = await tx.vehicleType.findFirst({
                    where: {
                        name: {
                            equals: updateVehicleDTO.vehicleTypeName,
                            mode: 'insensitive'
                        }
                    }
                });

                if (!vehicleType) {
                    vehicleType = await tx.vehicleType.create({
                        data: { name: updateVehicleDTO.vehicleTypeName }
                    });
                }
                finalVehicleTypeId = vehicleType.id;
            }

            const updateData: Prisma.VehicleUpdateInput = {
                vehicle_type: { connect: { id: finalVehicleTypeId } }
            };

            if (registration !== undefined) updateData.registration_number = registration;
            if (updateVehicleDTO.make !== undefined) updateData.make = updateVehicleDTO.make;
            if (updateVehicleDTO.model !== undefined) updateData.model = updateVehicleDTO.model;
            if (updateVehicleDTO.makeYear !== undefined) updateData.make_year = updateVehicleDTO.makeYear;
            if (updateVehicleDTO.mileage !== undefined) updateData.mileage = updateVehicleDTO.mileage;
            if (updateVehicleDTO.lastServiceDate !== undefined) updateData.last_service_date = updateVehicleDTO.lastServiceDate;
            if (updateVehicleDTO.serviceMileage !== undefined) updateData.service_mileage = updateVehicleDTO.serviceMileage;
            if (updateVehicleDTO.notes !== undefined) updateData.notes = updateVehicleDTO.notes;
            if (updateVehicleDTO.status !== undefined) updateData.status = updateVehicleDTO.status;

            if (driverChanged) {
                if (updateVehicleDTO.driverId === null) {
                    updateData.driver = { disconnect: true };
                } else {
                    updateData.driver = { connect: { id: updateVehicleDTO.driverId } };
                }
            }
            const vehicle = await tx.vehicle.update({
                where: { id },
                data: updateData
            });

            if (driverChanged) {

                if (existingVehicle.driver_id) {

                    await tx.driver.update({
                        where: { id: existingVehicle.driver_id },
                        data: { vehicle_id: null }
                    });
                }
                if (newDriver) {

                    await tx.driver.update({
                        where: { id: newDriver.id },
                        data: { vehicle_id: id }
                    });
                }
            }

            return vehicle;
        }, { maxWait: 10000, timeout: 20000 });

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.VEHICLE,
            entity_id: updatedVehicle.id,
            metadata: updatedVehicle,
        });

        return updatedVehicle;
    }



    public async getVehicles(query: IGetVehiclesQuery): Promise<{
        data: any[];
        pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean };
    }> {
        const page = query.page ?? constant.PAGINATION.DEFAULT_PAGE;
        const limit = query.limit ?? constant.PAGINATION.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const where: Prisma.VehicleWhereInput = {};

        if (query.status) {
            where.status = query.status as VehicleStatus;
        }

        if (query.search) {
            const search = query.search.trim();
            where.OR = [
                { vehicle_number: { contains: search, mode: 'insensitive' } },
                { registration_number: { contains: search, mode: 'insensitive' } },
                { driver: { first_name: { contains: search, mode: 'insensitive' } } },
                { driver: { last_name: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [data, total] = await prisma.$transaction([
            prisma.vehicle.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    vehicle_type: true,
                    driver: true,
                    //media: true
                }
            }),
            prisma.vehicle.count({ where })
        ]);

        const hasNext = (skip + data.length) < total;
        const hasPrevious = page > 1;


        return {
            data,
            pagination: { total, page, limit, hasNext, hasPrevious }
        };
    }

    public async getVehicleById(id: number): Promise<any> {
        const vehicle = await prisma.vehicle.findUnique({
            where: { id },
            include: {
                vehicle_type: true,
                driver: true,
                media: true
            }
        });

        if (!vehicle) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Vehicle'));
        }

        const photoMedia = (vehicle.media || [])
            .filter((m: any) => m.vehicle_document_type === VehicleDocumentType.photos)   // only photos
            .slice(-3);                                // last 3 (or fewer if < 3)

        const mediaWithUrls = await Promise.all(
            photoMedia.map(async (media: any) => ({
                ...media,
                document_url: await this.imageService.getImageUrl(media.file_path),
            }))
        );

        let driverWithPhoto: any = vehicle.driver;
        if (driverWithPhoto && driverWithPhoto.photo_path) {
            driverWithPhoto = {
                ...driverWithPhoto,
                photo_url: await this.imageService.getImageUrl(driverWithPhoto.photo_path)
            };
        }

        return {
            ...vehicle,
            media: mediaWithUrls,
            driver: driverWithPhoto
        };
    }

    public async getVehicleDocs(id: number): Promise<any> {
        const vehicle = await prisma.vehicle.findUnique({
            where: { id },
            include: {
                vehicle_type: true,
                driver: true,
                media: true
            }
        });

        if (!vehicle) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Vehicle'));
        }

        const mediaWithUrls = await Promise.all(
            vehicle.media.map(async (media: any) => ({
                ...media,
                document_url: await this.imageService.getImageUrl(media.file_path),
            }))
        );

        let driverWithPhoto: any = vehicle.driver;
        if (driverWithPhoto && driverWithPhoto.photo_path) {
            driverWithPhoto = {
                ...driverWithPhoto,
                photo_url: await this.imageService.getImageUrl(driverWithPhoto.photo_path)
            };
        }

        return {
            ...vehicle,
            media: mediaWithUrls,
            driver: driverWithPhoto
        };
    }

    public async getVehicleStats(): Promise<IVehicleStats> {
        const [statusGroups, categoryGroups, assignedCount, total] = await Promise.all([
            // Group by status
            prisma.vehicle.groupBy({
                by: ['status'],
                _count: { _all: true }
            }),
            // Group by category
            prisma.vehicle.groupBy({
                by: ['vehicle_category'],
                _count: { _all: true }
            }),
            // Count assigned vehicles (driver_id is not null)
            prisma.vehicle.count({
                where: { driver_id: { not: null } }
            }),
            // Total count
            prisma.vehicle.count()
        ]);

        // Build status map
        const statusMap: Record<string, number> = {};
        for (const group of statusGroups) {
            statusMap[group.status] = group._count._all;
        }

        // Build category map
        const categoryMap: Record<string, number> = {};
        for (const group of categoryGroups) {
            categoryMap[group.vehicle_category] = group._count._all;
        }

        return {
            total,
            // status breakdown
            active: statusMap[VehicleStatus.active] ?? 0,
            idle: statusMap[VehicleStatus.idle] ?? 0,
            maintenance: statusMap[VehicleStatus.maintenance] ?? 0,
            outOfService: statusMap[VehicleStatus.outOfService] ?? 0,
            // category breakdown
            inHouse: categoryMap['inHouse'] ?? 0,
            casual: categoryMap['casual'] ?? 0,
            subcontractor: categoryMap['subcontractor'] ?? 0,
            // assignment breakdown
            assigned: assignedCount,
            unassigned: total - assignedCount,
        };
    }
}
