/**
 * Data Transfer Objects (DTOs) for User Module
 */

// User roles
export type UserRoleType = 'ADMIN' | 'MANAGER' | 'DRIVER' | 'CLIENT' | 'SUBCONTRACTOR';

export const UserRoles: UserRoleType[] = [
    'ADMIN',
    'MANAGER',
    'DRIVER',
    'CLIENT',
    'SUBCONTRACTOR',
];

// Driver-specific data
export interface IDriverData {
    firstName: string;
    lastName: string;
    licenseNumber: string;
    insuranceDetails?: string;
    whiteCard?: string;
    type?: 'IN_HOUSE' | 'SUBCONTRACTOR';
    status?: 'ACTIVE' | 'MAINTENANCE' | 'IDLE' | 'OUT_OF_SERVICE';
}

// Client-specific data
export interface IClientData {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    address?: string;
}

// Subcontractor-specific data
export interface ISubcontractorData {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    address?: string;
}

// Request DTO for creating a user
export interface ICreateUserDTO {
    email: string;
    password: string;
    role: UserRoleType;
    // Role-specific data (required based on role)
    driverData?: IDriverData;
    clientData?: IClientData;
    subcontractorData?: ISubcontractorData;
}

// Response DTO (without password)
export interface IUserResponse {
    id: string;
    email: string;
    role: UserRoleType;
    createdAt: Date;
}
