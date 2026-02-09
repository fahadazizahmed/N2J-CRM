export type UserRoleType = 'ADMIN' | 'MANAGER' | 'DRIVER' | 'CLIENT' | 'SUBCONTRACTOR';
export const UserRoles: UserRoleType[] = ['ADMIN', 'MANAGER', 'DRIVER', 'CLIENT', 'SUBCONTRACTOR'];
export const UserDefaultRole: UserRoleType = 'CLIENT';

// Login Request DTO
export interface ILoginDTO {
  email: string;
  password: string;
  role: UserRoleType;
}

// User response (without password)
export interface IUserResponse {
  id: number;
  email: string;
  role: UserRoleType;
  createdAt: Date;
}

// Login Response DTO
export interface ILoginResponseDTO {
  token: string;
  user: IUserResponse;
}

export interface IUserCreateDTO {
  email?: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  role: UserRoleType;
  fullName: string;
  username: string;
}
