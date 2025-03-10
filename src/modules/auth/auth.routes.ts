import express from 'express';
import routes from '../../routes/routes';
import AuthController from './auth.controller';
import { signupValidationRules } from './auth.validators';
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

export { router as authRouter };
