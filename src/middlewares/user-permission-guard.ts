import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../errors";
import { UserRoleType } from "../common/types/role.types";

export const userPermissionGuard = (permittedRoles: UserRoleType[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;


            if (!user.active_role) {
                throw new ForbiddenError("No active role set for this session");
            }

            if (!permittedRoles.includes(user.active_role)) {
                throw new ForbiddenError("You do not have permission to perform this action");
            }

            next();
        } catch (e) {
            next(e);
        }
    };
};