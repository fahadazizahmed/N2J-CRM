import express from 'express';
import routes from './routes';
import SharedAuthController from '../controllers/shared.controller';
import { sharedAuthValidationRules, sharedLoginValidationRules, forgotPasswordValidationRules } from '../validators/shared.validator';
import { authentication } from '../../../middlewares/authentication';
import { validateRequest } from '../../../middlewares';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';

const router = express.Router();
const controller = new SharedAuthController();

router.post(
  routes.Shared.SET_PASSWORD,
  sharedAuthValidationRules(),
  validateRequest,
  controller.setPassword
);

router.post(
  routes.Shared.FORGOT_PASSWORD,
  forgotPasswordValidationRules(),
  validateRequest,
  controller.forgotPassword
);

router.post(
  routes.Shared.USER_LOGIN,
  sharedLoginValidationRules(),
  validateRequest,
  controller.login
);

router.get(
  routes.Shared.AUTH_ME,
  authentication,
  controller.getCurrentUser
);

router.post(
  routes.Shared.USER_LOGOUT,
  authentication,
  controller.logout
);


export { router as sharedAuthRouter };
