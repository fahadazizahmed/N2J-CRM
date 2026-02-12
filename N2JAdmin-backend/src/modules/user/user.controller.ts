import { Request, Response } from 'express';
import UserService from './user.service';
import { GenericError } from '../../errors/generic-error';
import { sendSuccessResponse } from '../../helper/response';
import InfoMessages from '../../constant/messages';
import { ICreateUserDTO } from './user.dto';

/**
 * User Controller
 * Handles HTTP requests for user management
 */

export default class UserController {
    private userService = new UserService();

    /**
     * Create a new user (Admin only)
     * POST /api/users
     */
    createUser = async (req: Request, res: Response) => {
        try {
            // Get the admin user ID from authenticated request
            const performedBy = req.user?.id || 'system';

            // Extract validated data from request body (including role-specific data)
            const userData: ICreateUserDTO = {
                email: req.body.email,
                password: req.body.password,
                role: req.body.role,
                driverData: req.body.driverData,
                clientData: req.body.clientData,
                subcontractorData: req.body.subcontractorData,
            };

            // Call service to create user
            const newUser = await this.userService.createUser(userData, performedBy);

            // Send success response
            sendSuccessResponse(
                res,
                InfoMessages.GENERIC.ITEM_CREATED_SUCCESSFULLY('User'),
                201,
                newUser
            );
        } catch (e: any) {
            throw new GenericError(e, `Error from createUser ${__filename}`);
        }
    };
}
