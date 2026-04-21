import { DriverStatus, DriverType, LicenseClass } from '../../../../generated/prisma';

export interface ICreateDriverDTO extends IAddDriverRateDTO {
    firstName: string;
    lastName: string;
    email: string;
    driverType: DriverType;
    phone?: string,
    licenseNumber?: string;
    licenseClass?: LicenseClass;
    licenseExpiry?: Date | string;
    vehicleId?: number;
    isMobileAccess?: boolean;
    subcontractorId?: number;

}


export interface IAddDriverRateDTO {
    hourlyRate?: number;
    hourlyRateWeekend?: number;
    nightRate?: number;
    nightRateWeekend?: number;
}

export interface IUpdateDriverDTO {
    firstName?: string;
    lastName?: string;
    email?: string;
    driverType?: DriverType;
    phone?: string;
    licenseNumber?: string;
    licenseClass?: LicenseClass;
    licenseExpiry?: Date | string;
    vehicleId?: number | null; // can be null to unset
    subcontractorId?: number | null; // can unset
    isMobileAccess?: boolean;
    hourlyRate?: number;
    hourlyRateWeekend?: number;
    nightRate?: number;
    nightRateWeekend?: number;
    status?: DriverStatus;
}

export interface IAssignVehicleDTO {
    vehicleId: number;
}

export interface IGetDriversQuery {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    driverType?: 'inHouse' | 'subcontractor';
}
