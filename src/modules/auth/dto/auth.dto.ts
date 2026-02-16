
import { UserRoleType } from "../../../common/types/role.types";
export interface IUserCreateDTO {
  email?: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  role: UserRoleType;
  fullName: string;
  username: string;
}

export interface ISetPasswordDTO {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ILoginDTO {
  email: string;
  password: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
}
