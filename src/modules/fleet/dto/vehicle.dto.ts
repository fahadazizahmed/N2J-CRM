import { VehicleCategory, VehicleStatus } from '../../../../generated/prisma';

// ─── Create ───────────────────────────────────────────────────────────────────
export interface ICreateVehicleDTO {
    registrationNumber: string;
    vehicleTypeId?: number | null;
    vehicleTypeName?: string; // used when vehicle_type_id is not provided
    make?: string;
    model?: string;
    makeYear?: number;
    driverId?: number;
    mileage?: number;
    lastServiceDate?: Date | string;
    serviceMileage?: number;
    notes?: string;
    status?: VehicleStatus;
    vehicleCategory?: VehicleCategory;
}

// ─── Update ───────────────────────────────────────────────────────────────────
export interface IUpdateVehicleDTO extends Partial<ICreateVehicleDTO> { }

// ─── Query ────────────────────────────────────────────────────────────────────
export interface IGetVehiclesQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: VehicleStatus;
}


export interface IAssignDriverDTO {
    driverId: number;
}