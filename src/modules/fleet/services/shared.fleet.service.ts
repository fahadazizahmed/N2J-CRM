import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import { auditService } from '../../../services/audit.service';
import constant from '../../../common/constant/constant';
import { IAssignVehicleDTO } from '../dto/driver.dto';
import { DriverStatus } from '../../../../generated/prisma';
import ErrorMessages from '../../../common/constant/errors';
import { UnProcessableEntityError } from '../../../errors';
import { ImageService } from '../../../services/image.service';
import { VehicleStatus, JobStatus, DriverDocumentType } from '../../../../generated/prisma';
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
    getVehiclesWithDriverDetails(): Promise<any[]>;
    assignVehicle(driverId: number, assignVehicleDTO: IAssignVehicleDTO, actorId?: number | null): Promise<any>;
    getAllActiveNotAssignVehiclesDrivers(): Promise<any[]>;
    getDriverWithVehicleDetails(): Promise<any[]>;
    assignDriver(vehicleId: number, assignDriverDTO: IAssignDriverDTO, actorId?: number | null): Promise<any>;

    // JOB Related Api
    getVehicleWithJob(): Promise<any[]>;




}
export default class SharedFleetService implements ISharedFleetService {
    private imageService = new ImageService();

    public async getAllActiveIdleVehicles(): Promise<any[]> {
        const vehicles = await prisma.vehicle.findMany({
            where: {
                status: { in: ['active', 'idle'] },
                driver_id: null,


                //      // 👇 No active/scheduled job
                // jobs: {
                //     none: {
                //         status: { in: ['scheduled', 'inProgress'] }
                //     }
                // }


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


        // const driverActiveJob = await prisma.job.findFirst({
        //     where: {
        //         driver_id: driverId,
        //         status: { in: [JobStatus.scheduled, JobStatus.inProgress] }
        //     }
        // });

        // const vehicleActiveJob = await prisma.job.findFirst({
        //     where: {
        //         vehicle_id: assignVehicleDTO.vehicleId,
        //         status: { in: [JobStatus.scheduled, JobStatus.inProgress] }
        //     }
        // });

        // if ((driverActiveJob || vehicleActiveJob) && !assignVehicleDTO.force) {
        //     throw new BadRequestError(
        //         "Driver or vehicle has active jobs. Use force=true to override."
        //     );
        // }




        const result = await prisma.$transaction(async (tx) => {

            await tx.vehicle.update({
                where: { id: assignVehicleDTO.vehicleId },
                data: { driver_id: driverId }
            });
            await tx.vehicle.updateMany({
                where: {
                    driver_id: driverId,
                    id: { not: assignVehicleDTO.vehicleId }
                },
                data: { driver_id: null }
            });

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


    public async getAllActiveNotAssignVehiclesDrivers(): Promise<any[]> {
        const drivers = await prisma.driver.findMany({
            where: {
                status: DriverStatus.active,

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


    public async getDriverWithVehicleDetails(): Promise<any[]> {
        const drivers = await prisma.driver.findMany({
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

        if (driver.status !== DriverStatus.active) {
            throw new BadRequestError('Driver is not available for assignment.');
        }

        if (vehicle.driver_id === assignDriverDTO.driverId) {
            throw new UnProcessableEntityError(
                "Driver already assigned to this vehicle"
            );
        }

        const result = await prisma.$transaction(async (tx) => {


            await tx.vehicle.updateMany({
                where: {
                    driver_id: assignDriverDTO.driverId
                },
                data: { driver_id: null }
            });

            await tx.vehicle.update({
                where: { id: vehicleId },
                data: { driver_id: assignDriverDTO.driverId }
            });


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


    public async getVehicleWithJob(): Promise<any[]> {
        const vehicles = await prisma.vehicle.findMany({
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
