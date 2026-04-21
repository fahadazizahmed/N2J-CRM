import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import { IAssignVehicleDTO } from '../dto/driver.dto';
import { DriverStatus, DriverType, VehicleCategory } from '../../../../generated/prisma';
import ErrorMessages from '../../../common/constant/errors';
import { UnProcessableEntityError } from '../../../errors';
import { ImageService } from '../../../services/image.service';
import { VehicleStatus, DriverDocumentType } from '../../../../generated/prisma';
import { IAssignDriverDTO } from '../dto/vehicle.dto';


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

export interface ISharedFleetService {

    getAllActiveIdleVehicles(): Promise<any[]>;
    getAllActiveIdleVehiclesSubcontractor(subcontractorId: number): Promise<any[]>;
    getAllActiveNotAssignVehiclesDrivers(): Promise<any[]>;
    getAllActiveNotAssignVehiclesDriversSubcontractor(subcontractorId: number): Promise<any[]>;
    assignVehicle(driverId: number, assignVehicleDTO: IAssignVehicleDTO, actorId?: number | null): Promise<any>;
    getVehiclesWithDriverDetails(subcontractorId?: number): Promise<any[]>;
    getDriverWithVehicleDetails(subcontractorId?: number): Promise<any[]>;
    assignDriver(vehicleId: number, assignDriverDTO: IAssignDriverDTO, actorId?: number | null): Promise<any>;
    // JOB Related Api
    getVehicleWithJob(subcontractorId?: number): Promise<any[]>;




}
export default class SharedFleetService implements ISharedFleetService {

    public async getAllActiveIdleVehicles(): Promise<any[]> {
        const vehicles = await prisma.vehicle.findMany({
            where: {
                status: { in: [VehicleStatus.active, VehicleStatus.idle] },
                driver_id: null,
                subcontractor_id: null,
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

    public async getAllActiveIdleVehiclesSubcontractor(subcontractorId: number): Promise<any[]> {
        const vehicles = await prisma.vehicle.findMany({
            where: {
                status: { in: [VehicleStatus.active, VehicleStatus.active] },
                driver_id: null,
                subcontractor_id: subcontractorId
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




    public async getAllActiveNotAssignVehiclesDrivers(): Promise<any[]> {
        const drivers = await prisma.driver.findMany({
            where: {
                status: {
                    in: [DriverStatus.active, DriverStatus.idle]
                },
                subcontractor_id: null,

                // 👇 No vehicle references this driver
                assigned_vehicles: {
                    none: {}
                }
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
            },
            orderBy: { created_at: 'desc' }
        });

        return drivers.map(d => ({
            id: d.id,
            first_name: d.first_name,
            last_name: d.last_name,
        }));
    }

    public async getAllActiveNotAssignVehiclesDriversSubcontractor(subcontractorId: number): Promise<any[]> {
        const drivers = await prisma.driver.findMany({
            where: {
                status: {
                    in: [DriverStatus.active, DriverStatus.idle]
                },
                subcontractor_id: subcontractorId,

                // 👇 No vehicle references this driver
                assigned_vehicles: {
                    none: {}
                }
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
            },
            orderBy: { created_at: 'desc' }
        });

        return drivers.map(d => ({
            id: d.id,
            first_name: d.first_name,
            last_name: d.last_name,
        }));
    }


    public async getDriverWithVehicleDetails(subcontractorId?: number): Promise<any[]> {
        const drivers = await prisma.driver.findMany({
            where: {
                subcontractor_id: subcontractorId ?? null
            },
            include: {
                user: { select: { id: true, email: true, name: true, last_login: true } },
                assigned_vehicles: {
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

        return drivers.map(v => {
            const vehicle = v.assigned_vehicles?.[0] || null;
            return {
                id: v.id,
                firstName: v.first_name,
                lastName: v.last_name,
                email: v.user.email,
                phone: v.phone,
                status: v.status,
                licenseClass: v.license_class,
                vehicle: vehicle ? {
                    id: vehicle.id,
                    model: vehicle.model,
                    make: vehicle.make,
                    make_year: vehicle.make_year,
                    registrationNumber: vehicle.registration_number
                } : null
            };
        });
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

        if (driver.status !== DriverStatus.active && driver.status !== DriverStatus.idle) {
            throw new BadRequestError('Driver is not available for assignment.');
        }

        if (vehicle.driver_id === assignDriverDTO.driverId) {
            throw new UnProcessableEntityError(
                "Driver already assigned to this vehicle"
            );
        }


        if (vehicle.vehicle_category === VehicleCategory.subcontractor) {
            if (!vehicle.subcontractor_id) {
                throw new BadRequestError("Vehicle missing subcontractor");
            }

            if (driver.subcontractor_id !== vehicle.subcontractor_id) {
                throw new BadRequestError("Driver does not belong to this subcontractor");
            }
        } else {
            if (driver.subcontractor_id) {
                throw new BadRequestError("In-house vehicle cannot have subcontractor driver");
            }
        }

        const result = await prisma.$transaction(async (tx) => {

            await tx.vehicle.updateMany({
                where: {
                    driver_id: assignDriverDTO.driverId,
                    id: { not: vehicleId }
                },
                data: { driver_id: null }
            });


            const updated = await tx.vehicle.updateMany({
                where: {
                    id: vehicleId,
                    status: { in: [VehicleStatus.active, VehicleStatus.idle] }
                },
                data: { driver_id: assignDriverDTO.driverId }
            });

            if (updated.count !== 1) {
                throw new BadRequestError("Vehicle assignment failed due to concurrent update");
            }

            const updatedDriver = await tx.driver.findUnique({
                where: { id: assignDriverDTO.driverId },
                include: {
                    user: {
                        select: { id: true, email: true, name: true }
                    }
                }
            });

            return updatedDriver;
        }, { maxWait: constant.TX_MAX_WAIT, timeout: constant.TX_TIMEOUT });


        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.VEHICLE,
            entity_id: vehicleId,
            metadata: {
                message: `Assigned driver ${driver.first_name + " " + driver.last_name} to vehicle ${vehicle.registration_number}`,
                driver_id: assignDriverDTO.driverId
            },
        });

        return result;
    }




    public async getVehiclesWithDriverDetails(subcontractorId?: number): Promise<any[]> {
        const vehicles = await prisma.vehicle.findMany({
            where: {
                subcontractor_id: subcontractorId ?? null
            },
            include: {
                driver: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        phone: true,
                        email: true
                    }
                },

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
        if (driver.status !== DriverStatus.active && driver.status !== DriverStatus.idle) {
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

        if (driver.driver_type === DriverType.subcontractor) {
            if (!driver.subcontractor_id) {
                throw new BadRequestError("driver missing subcontractor");
            }

            if (vehicle.subcontractor_id !== driver.subcontractor_id) {
                throw new BadRequestError("Vehicle does not belong to this subcontractor");
            }
        } else {
            if (vehicle.subcontractor_id) {
                throw new BadRequestError("In-house Driver cannot have subcontractor vehicle");
            }
        }


        const result = await prisma.$transaction(async (tx) => {

            await tx.vehicle.updateMany({
                where: {
                    driver_id: driverId,
                    id: { not: assignVehicleDTO.vehicleId }
                },
                data: { driver_id: null }
            });

            // 🔥 safe assignment
            const updated = await tx.vehicle.updateMany({
                where: {
                    id: assignVehicleDTO.vehicleId,
                    status: { in: [VehicleStatus.active, VehicleStatus.idle] }
                },
                data: { driver_id: driverId }
            });

            if (updated.count !== 1) {
                throw new BadRequestError("Vehicle assignment failed due to concurrent update");
            }

            const updatedDriver = await tx.driver.findUnique({
                where: { id: driverId },
                include: {
                    user: { select: { id: true, email: true, name: true } }
                }
            });


            return updatedDriver;
        }, { maxWait: constant.TX_MAX_WAIT, timeout: constant.TX_TIMEOUT });

        auditService.logWithRetry({
            actor_id: actorId ?? null,
            action: constant.AUDIT_LOG_ACTION.UPDATE,
            entity_type: constant.ENTITY_TYPE.DRIVER,
            entity_id: driverId,
            metadata: {
                message: `Assigned vehicle ${vehicle.registration_number} to driver ${driver.first_name + "" + driver.last_name}`,
                vehicle_id: assignVehicleDTO.vehicleId
            },
        });

        return result;
    }



    public async getVehicleWithJob(subcontractorId?: number): Promise<any[]> {
        const vehicles = await prisma.vehicle.findMany({
            where: {
                subcontractor_id: subcontractorId ?? null
            },
            include: {

                driver: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        phone: true,
                        email: true,
                        license_class: true,
                        license_number: true,
                        status: true,
                        user: true,
                        documents: {
                            where: {
                                document_type: DriverDocumentType.license,
                                is_active: true
                            }
                        }
                    }
                },
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
            driver_id: v.driver_id,
            driver: v.driver ? {
                id: v.driver.id,
                firstName: v.driver.first_name,
                lastName: v.driver.last_name,
                phone: v.driver.phone,
                email: v.driver.user.email,
                licenseClass: v.driver.license_class,
                status: v.driver.status,
                documents: v.driver.documents,
                licenseNumber: v.driver.license_number
            } : null
        }));


    }

}
