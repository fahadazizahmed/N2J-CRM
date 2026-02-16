export type UserRoleType = 'admin' | 'driver' | 'subcontractor' | 'client';

export const UserRoles: UserRoleType[] = [
    'admin',
    'driver',
    'subcontractor',
    'client'
];

export enum OperationType {
    EMAIL = 'EMAIL',
    AUDIT_LOG = 'AUDIT_LOG'
}

