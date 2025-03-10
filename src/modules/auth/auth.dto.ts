export type UserRoleType = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export const UserRoles: UserRoleType[] = ['SUPER_ADMIN', 'ADMIN', 'USER'];
export const UserDefaultRole: UserRoleType = 'USER';

export interface IUserCreateDTO {
  email?: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  role: UserRoleType;
  fullName: string;
  username: string;
}
