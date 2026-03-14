import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { UnProcessableEntityError } from '../../../errors/unprocessable-entity.error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import config from '../../../config';
import ErrorMessages from '../../../common/constant/errors';
import { ICreateVehicleDTO, IUpdateVehicleDTO, IGetVehiclesQuery, IAssignDriverDTO } from '../dto/vehicle.dto';
import { Vehicle, Prisma, VehicleStatus, VehicleType, DriverStatus } from '../../../../generated/prisma';
import InfoMessages from '../../../common/constant/messages';
import { ImageService } from '../../../services/image.service';

export interface IAdminVehicleService {
    createVehicle(createVehicleDTO: ICreateVehicleDTO, actorId?: number | null): Promise<Vehicle>;
    uploadMedia(vehicleId: number, files: Express.Multer.File[], actorId?: number | null): Promise<any>;
    getVehicleStatuses(): Promise<string[]>;
    getVehicleTypes(): Promise<VehicleType[]>;
    getAllActiveIdleVehicles(): Promise<any[]>;
    getVehiclesWithDriverDetails(): Promise<any[]>;
    assignDriver(vehicleId: number, assignDriverDTO: IAssignDriverDTO, actorId?: number | null): Promise<any>;










    updateVehicle(id: number, updateVehicleDTO: IUpdateVehicleDTO, actorId?: number | null): Promise<Vehicle>;
    getVehicles(query: IGetVehiclesQuery): Promise<{
        data: any[];
        pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean };
    }>;


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
                vehicle = await tx.vehicle.create({
                    data: {
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

        })

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
        files: Express.Multer.File[],
        actorId?: number | null
    ): Promise<any> {
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicleId }
        });

        if (!vehicle) {
            throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND('Vehicle'));
        }

        const mediaPromises = files.map(async (file) => {
            const customBlobName = constant.MEDIA_PATHS.VEHICLE_MEDIA(vehicle.registration_number, file.filename);
            this.imageService.upload(file.path, customBlobName);

            return prisma.vehicleMedia.create({
                data: {
                    vehicle_id: vehicleId,
                    file_path: customBlobName,
                    file_type: file.mimetype,
                }
            });
        });

        const uploadedMedia = await Promise.all(mediaPromises);

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.VEHICLE,
            entity_id: vehicleId,
            metadata: { message: `Uploaded ${files.length} media files` },
        });

        return uploadedMedia;
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
        });

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

        if (updateVehicleDTO.registrationNumber && updateVehicleDTO.registrationNumber !== existingVehicle.registration_number) {
            const conflict = await prisma.vehicle.findUnique({
                where: { registration_number: updateVehicleDTO.registrationNumber }
            });

            if (conflict) {
                throw new BadRequestError(ErrorMessages.FLEET.VEHICLE_ALREADY_EXIST);
            }
        }

        let finalVehicleTypeId = existingVehicle.vehicle_type_id;

        if (updateVehicleDTO.vehicleTypeId) {
            const vehicleType = await prisma.vehicleType.findUnique({
                where: { id: updateVehicleDTO.vehicleTypeId }
            });

            if (!vehicleType) {
                throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Vehicle Type"));
            }
            finalVehicleTypeId = vehicleType.id;
        } else if (updateVehicleDTO.vehicleTypeName) {
            let vehicleType = await prisma.vehicleType.findFirst({
                where: {
                    name: {
                        equals: updateVehicleDTO.vehicleTypeName,
                        mode: 'insensitive'
                    }
                }
            });

            if (!vehicleType) {
                vehicleType = await prisma.vehicleType.create({
                    data: { name: updateVehicleDTO.vehicleTypeName }
                });
            }
            finalVehicleTypeId = vehicleType.id;
        }

        if (updateVehicleDTO.driverId !== undefined && updateVehicleDTO.driverId !== null) {
            const driver = await prisma.driver.findUnique({
                where: { id: updateVehicleDTO.driverId }
            });
            if (!driver) {
                throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Driver"));
            }
        }

        const updateData: Prisma.VehicleUpdateInput = {
            registration_number: updateVehicleDTO.registrationNumber,
            vehicle_type: { connect: { id: finalVehicleTypeId } },
            make: updateVehicleDTO.make,
            model: updateVehicleDTO.model,
            make_year: updateVehicleDTO.makeYear,
            mileage: updateVehicleDTO.mileage,
            last_service_date: updateVehicleDTO.lastServiceDate,
            service_mileage: updateVehicleDTO.serviceMileage,
            notes: updateVehicleDTO.notes,
            status: updateVehicleDTO.status,
        };

        if (updateVehicleDTO.driverId !== undefined) {
            if (updateVehicleDTO.driverId === null) {
                updateData.driver = { disconnect: true };
            } else {
                updateData.driver = { connect: { id: updateVehicleDTO.driverId } };
            }
        }

        const updatedVehicle = await prisma.vehicle.update({
            where: { id },
            data: updateData
        });

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
                    media: true
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







}
