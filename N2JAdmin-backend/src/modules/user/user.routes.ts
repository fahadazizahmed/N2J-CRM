import express from 'express';
import routes from '../../routes/routes';
import UserController from './user.controller';
import { createUserValidationRules } from './user.validators';
import { validateRequest } from '../../middlewares';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/role.middleware';

/**
 * User Routes
 * Defines endpoints for user management
 */

const router = express.Router();
const userController = new UserController();

/**
 * POST /api/users
 * Create a new user (Admin only)
 * 
 * Middleware chain:
 * 1. authenticateUser - Mock admin authentication
 * 2. requireAdmin - Check Admin role
 * 3. createUserValidationRules - Validate request body
 * 4. validateRequest - Process validation results
 * 5. userController.createUser - Handle request
 */
router.post(
    routes.CREATE_USER,
    authenticateUser,
    requireAdmin,
    createUserValidationRules(),
    validateRequest,
    userController.createUser
);

export { router as userRouter };
