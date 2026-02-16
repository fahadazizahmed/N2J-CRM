import express from 'express';
import routes from '../../../routes/routes';
import SharedAuthController from '../controllers/shared.controller';
import { sharedAuthValidationRules, sharedLoginValidationRules } from '../validators/shared.validator';
import { authentication } from '../../../middlewares/authentication';
import { validateRequest } from '../../../middlewares';

const router = express.Router();
const controller = new SharedAuthController();

router.post(
  routes.Shared.SET_PASSWORD,
  sharedAuthValidationRules(),
  validateRequest,
  controller.SetPassword
);

router.post(
  routes.Shared.USER_LOGIN,
  sharedLoginValidationRules(),
  validateRequest,
  controller.Login
);

router.post(
  routes.Shared.USER_LOGOUT,
  authentication,
  controller.Logout
);

export { router as sharedAuthRouter };
