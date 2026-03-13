import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { NotFoundError } from '../../../errors/not-found-error';
import { UnProcessableEntityError } from '../../../errors/unprocessable-entity.error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import config from '../../../config';
import ErrorMessages from '../../../common/constant/errors';
import { ICreateVehicleDTO, IUpdateVehicleDTO, IGetVehiclesQuery } from '../dto/vehicle.dto';
import { Vehicle, Prisma, VehicleStatus, VehicleType } from '../../../../generated/prisma';
import InfoMessages from '../../../common/constant/messages';
import { ImageService } from '../../../services/image.service';

export interface IAdminVehicleService {
    createVehicle(createVehicleDTO: ICreateVehicleDTO, actorId?: number | null): Promise<Vehicle>;
    updateVehicle(id: number, updateVehicleDTO: IUpdateVehicleDTO, actorId?: number | null): Promise<Vehicle>;
    uploadMedia(vehicleId: number, files: Express.Multer.File[], actorId?: number | null): Promise<any>;
    getAllActiveIdleVehicles(): Promise<any[]>;
    getVehiclesWithDriverDetails(): Promise<any[]>;
    getVehicles(query: IGetVehiclesQuery): Promise<{
        data: any[];
        pagination: { total: number; page: number; limit: number; hasNext: boolean; hasPrevious: boolean };
    }>;
    getVehicleStatuses(): Promise<string[]>;
    getVehicleTypes(): Promise<VehicleType[]>;

}

export default class AdminVehicleService implements IAdminVehicleService {
    private imageService = new ImageService();

    public async createVehicle(
        createVehicleDTO: ICreateVehicleDTO,
        actorId?: number | null
    ): Promise<Vehicle> {
        console.log("reached in service", createVehicleDTO)

        // // Check if registration number already exists
        const existingVehicle = await prisma.vehicle.findUnique({
            where: { registration_number: createVehicleDTO.registrationNumber }
        });

        if (existingVehicle) {
            throw new BadRequestError(ErrorMessages.FLEET.VEHICLE_ALREADY_EXIST);
        }

        let finalVehicleTypeId: number;

        if (createVehicleDTO.vehicleTypeId) {
            // Verify vehicle_type_id exists
            const vehicleType = await prisma.vehicleType.findUnique({
                where: { id: createVehicleDTO.vehicleTypeId }
            });

            if (!vehicleType) {
                throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Vehicle Type"));
            }
            finalVehicleTypeId = vehicleType.id;
        } else if (createVehicleDTO.vehicleTypeName) {
            // Check if name already exists, otherwise create it
            let vehicleType = await prisma.vehicleType.findFirst({
                where: {
                    name: {
                        equals: createVehicleDTO.vehicleTypeName,
                        mode: 'insensitive'
                    }
                }
            });

            if (!vehicleType) {
                vehicleType = await prisma.vehicleType.create({
                    data: { name: createVehicleDTO.vehicleTypeName }
                });
            }
            finalVehicleTypeId = vehicleType.id;
        } else {
            throw new BadRequestError('Either vehicle_type_id or vehicle_type_name must be provided');
        }

        // Verify driver exists if driver_id is provided
        if (createVehicleDTO.driverId) {
            const driver = await prisma.driver.findUnique({
                where: { id: createVehicleDTO.driverId }
            });
            if (!driver) {
                throw new NotFoundError(ErrorMessages.GENERIC.ITEM_NOT_FOUND("Driver"));
            }
        }

        // // Prepare data
        const data: Prisma.VehicleCreateInput = {
            registration_number: createVehicleDTO.registrationNumber,
            vehicle_type: { connect: { id: finalVehicleTypeId } },
            make: createVehicleDTO.make,
            model: createVehicleDTO.model,
            make_year: createVehicleDTO.makeYear,
            mileage: createVehicleDTO.mileage,
            last_service_date: createVehicleDTO.lastServiceDate,
            service_mileage: createVehicleDTO.serviceMileage,
            notes: createVehicleDTO.notes,
            status: createVehicleDTO.status,
            created_by: actorId ?? null,
        };

        if (createVehicleDTO.driverId) {
            data.driver = { connect: { id: createVehicleDTO.driverId } };
        }

        const newVehicle = await prisma.vehicle.create({
            data
        });

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.CREATE,
            entity_type: constant.ENTITY_TYPE.VEHICLE,
            entity_id: newVehicle.id,
            metadata: newVehicle,
        });
        return newVehicle;

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

    public async getVehicleStatuses(): Promise<string[]> {
        return Object.values(VehicleStatus);
    }

    public async getVehicleTypes(): Promise<VehicleType[]> {
        return prisma.vehicleType.findMany({
            orderBy: { name: 'asc' }
        });
    }

}
