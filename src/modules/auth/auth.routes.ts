import express from 'express';
import routes from '../../routes/routes';
import AuthController from './auth.controller';
import { loginValidationRules } from './auth.validators';
import { validateRequest } from '../../middlewares';

const router = express.Router();
const authController = new AuthController();

/* User Login Route (All Roles) */
router.post(
  routes.LOGIN,
  loginValidationRules(),
  validateRequest,
  authController.login
);

/* User Logout Route */
router.post(
  routes.LOGOUT,
  authController.logout
);

export { router as authRouter };
