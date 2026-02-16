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
import { User, Role } from '../../../../generated/prisma';
import bcrypt from 'bcrypt';

export interface IAdminAuthService {
    addNewUser: (userCreateDTO: IUserCreateDTO, actorId?: number | null) => Promise<User & { roles: Role[] }>;
}

export default class AdminAuthService implements IAdminAuthService {
    /* email singup service */
    public async addNewUser(userCreateDTO: IUserCreateDTO, actorId?: number | null): Promise<User & { roles: Role[] }> {

        // 1. Find Role ID
        const role = await prisma.role.findUnique({
            where: { name: userCreateDTO.role }
        });

        if (!role) {
            throw new UnProcessableEntityError(ErrorMessages.AUTH.ROLE_NOT_FOUND);
        }

        // 2. Use transaction to prevent race conditions
        const result = await prisma.$transaction(async (tx) => {
            // Check if user exists within transaction
            const existingUser = await tx.user.findUnique({
                where: { email: userCreateDTO.email },
                include: { roles: true }
            });

            let user;
            let isNew = false;
            let isUserActive = false;

            if (existingUser) {
                // Check if they already have the specific role
                const hasRole = existingUser.roles.some((r) => r.id === role.id);

                if (hasRole) {
                    throw new BadRequestError(ErrorMessages.AUTH.USER_EXISTS_WITH_ROLE);
                }

                // Check if user is active (has password setup)
                if (existingUser.password_hash && existingUser.password_hash !== "pending_setup") {
                    isUserActive = true;
                }

                // User exists -> Add Role
                user = await tx.user.update({
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
                isNew = true;
                user = await tx.user.create({
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

            let inviteToken: string | null = null;

            // Only generate invite token if user is NOT active (new user or pending setup)
            if (!isUserActive) {

                // Generate Invite Token inside transaction
                // @ts-ignore
                inviteToken = jwt.sign(
                    {
                        id: user.id,
                        type: constant.JWT_TOKEN_TYPE.INVITE
                    },
                    process.env.INVITE_SECRET as string,
                    { expiresIn: process.env.SESSION_EXPIRES_IN || '24h' }
                );

                const hashedToken = await bcrypt.hash(inviteToken, 10);

                // Update user with token in DB (within transaction)
                user = await tx.user.update({
                    where: { id: user.id },
                    data: { invite_token: hashedToken },
                    include: { roles: true }
                });
            }

            // Sanitize user object (remove secrets from response)
            const sanitizedUser = { ...user };
            delete (sanitizedUser as any).password_hash;
            delete (sanitizedUser as any).invite_token;

            return { user: sanitizedUser as User & { roles: Role[] }, isNewUser: isNew, token: inviteToken, isUserActive };
        });

        const { user: finalUser, isNewUser, token, isUserActive } = result;

        // Send email and log audit asynchronously (Fire-and-forget)
        if (isUserActive) {
            // Case: Active User getting a new Role
            Promise.allSettled([
                emailService.sendEmailWithRetry(
                    userCreateDTO.email!,
                    config.ROLE_ADDED_EMAIL.subject,
                    config.ROLE_ADDED_EMAIL.content(userCreateDTO.role),
                    constant.ENTITY_TYPE.USER,
                    finalUser.id
                ),
                auditService.logWithRetry({
                    actor_id: actorId,
                    action: constant.AUDIT_LOG_ACTION.ROLE_ADDED,
                    entity_type: constant.ENTITY_TYPE.USER,
                    entity_id: finalUser.id,
                    metadata: {
                        role: userCreateDTO.role,
                        email: userCreateDTO.email,
                        action: 'Role Added to Existing User'
                    }
                })
            ]);
        } else {
            // Case: New User or Pending User -> Send Invite
            const inviteLink = `${process.env.FRONT_END_DOMAIN}/invite?token=${token}`;

            Promise.allSettled([
                emailService.sendEmailWithRetry(
                    userCreateDTO.email!,
                    config.REGISTER_USER_EMAIL.subject,
                    config.REGISTER_USER_EMAIL.content(inviteLink, userCreateDTO.role),
                    constant.ENTITY_TYPE.USER,
                    finalUser.id
                ),
                auditService.logWithRetry({
                    actor_id: actorId,
                    action: constant.AUDIT_LOG_ACTION.INVITE_SENT,
                    entity_type: constant.ENTITY_TYPE.USER,
                    entity_id: finalUser.id,
                    metadata: {
                        role: userCreateDTO.role,
                        email: userCreateDTO.email,
                        is_new_user: isNewUser
                    }
                })
            ]);
        }

        return finalUser;

    }
}
