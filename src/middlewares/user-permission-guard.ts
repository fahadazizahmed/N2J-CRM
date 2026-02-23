import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../errors";
import { UserRoleType } from "../common/types/role.types";

export const userPermissionGuard = (permittedRoles: UserRoleType[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;


            // user.roles is populated by authentication middleware
            if (!user.roles || !Array.isArray(user.roles)) {
                throw new ForbiddenError("User has no roles assigned");
            }

            // user.roles is array of objects { id, name }
            const hasPermission = user.roles.some((role: any) => permittedRoles.includes(role.name));

            if (!hasPermission) {
                throw new ForbiddenError("You do not have permission to perform this action");
            }

            next();
        } catch (e) {
            next(e);
        }
    };
};
