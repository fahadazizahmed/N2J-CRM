import constant from '../constant/constant';

export type UserRoleType = typeof constant.ROLES[keyof typeof constant.ROLES];

export const UserRoles: UserRoleType[] = Object.values(constant.ROLES);


