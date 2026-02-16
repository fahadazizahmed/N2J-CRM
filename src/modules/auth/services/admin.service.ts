import InfoMessages from '../../../common/constant/messages';
import ErrorMessages from '../../../common/constant/errors';
import { UnProcessableEntityError } from '../../../errors/unprocessable-entity.error';
import { IUserCreateDTO } from '../dto/auth.dto';
import jwt from "jsonwebtoken"
import { prisma } from '../../../connection/db';
import { BadRequestError } from '../../../errors/bad-request-error';
import constant from '../../../common/constant/constant';
import { emailService } from '../../../services/email.service';
import config from '../../../config';
import { auditService } from '../../../services/audit.service';

export interface IAdminAuthService {
    AddNewUser: (userCreateDTO: IUserCreateDTO, actorId?: number | null) => Promise<IUserCreateDTO>;
}

export default class AdminAuthService implements IAdminAuthService {
    /* email singup service */
    public async AddNewUser(userCreateDTO: IUserCreateDTO, actorId?: number | null): Promise<any> {
        try {

            // 1. Find Role ID
            const role = await prisma.role.findUnique({
                where: { name: userCreateDTO.role }
            });

            if (!role) {
                throw new UnProcessableEntityError(ErrorMessages.AUTH.ROLE_NOT_FOUND);
            }

            // 2. Check if user exists (Single DB Query)
            const existingUser = await prisma.user.findUnique({
                where: { email: userCreateDTO.email },
                include: { roles: true }
            });

            let newUser: any;

            if (existingUser) {
                // Check if they already have the specific role
                const hasRole = existingUser.roles.some((r: any) => r.id === role.id);

                if (hasRole) {
                    throw new BadRequestError(ErrorMessages.AUTH.USER_EXISTS_WITH_ROLE);
                }

                // User exists -> Add Role
                newUser = await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        roles: {
                            connect: { id: role.id }
                        }
                    },
                    include: { roles: true }
                });

            } else {
                // User doesn't exist -> Create New
                newUser = await prisma.user.create({
                    data: {
                        email: userCreateDTO.email!,
                        name: (userCreateDTO as any).name || userCreateDTO.fullName,
                        password_hash: "pending_setup",
                        invite_token: "pending", // temporary
                        status: 0,
                        roles: {
                            connect: { id: role.id }
                        }
                    },
                    include: { roles: true }
                });
            }
            // Generate Invite Token
            // @ts-ignore
            const token = jwt.sign(
                {
                    id: newUser.id,
                    type: constant.JWT_TOKEN_TYPE.INVITE
                },
                process.env.INVITE_SECRET as string,
                { expiresIn: process.env.SESSION_EXPIRES_IN || '24h' }
            );

            // Update user with token in DB
            await prisma.user.update({
                where: { id: newUser.id },
                data: { invite_token: token }
            });

            // Update local object
            newUser.invite_token = token;

            // Send Email
            const inviteLink = `${process.env.FRONT_END_DOMAIN}/invite?token=${token}`;
            await emailService.sendEmail(userCreateDTO.email!, config.REGISTER_USER_EMAIL.subject, config.REGISTER_USER_EMAIL.content(inviteLink, userCreateDTO.role));

            // Audit Log
            await auditService.log({
                actor_id: actorId,
                action: constant.AUDIT_LOG_ACTION.INVITE_SENT,
                entity_type: constant.ENTITY_TYPE.USER,
                entity_id: newUser.id,
                metadata: {
                    role: userCreateDTO.role,
                    email: userCreateDTO.email,
                    is_new_user: !existingUser // true if new, false if role added
                }
            });

            console.log("Created/Updated user", newUser);
            return newUser;

        } catch (e) {
            throw e;
        }
    }
}
