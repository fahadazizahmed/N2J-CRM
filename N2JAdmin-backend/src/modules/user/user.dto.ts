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

// Request DTO for creating a user
export interface ICreateUserDTO {
    email: string;
    password: string;
    role: UserRoleType;
}

// Response DTO (without password)
export interface IUserResponse {
    id: string;
    email: string;
    role: UserRoleType;
    createdAt: Date;
}
