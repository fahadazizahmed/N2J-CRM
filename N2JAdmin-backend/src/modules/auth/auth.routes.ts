import express from 'express';
import routes from '../../routes/routes';
import AuthController from './auth.controller';
import { signupValidationRules, loginValidationRules } from './auth.validators';
import { validateRequest } from '../../middlewares';

const router = express.Router();
const authController = new AuthController();

/* User or consultant signup Route with email or phone */
router.post(
  routes.USER_SIGNUP,
  signupValidationRules(),
  validateRequest,
  authController.userSignUp
);

/* User Login Route (All Roles) */
router.post(
  routes.LOGIN,
  loginValidationRules(),
  validateRequest,
  authController.login
);

export { router as authRouter };
