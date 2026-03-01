import express from 'express';
import routes from './routes';
import AdminAuthController from '../controllers/admin.controller';
import { validateRequest } from '../../../middlewares';
import { adminAuthValidationRules } from '../validators/admin.validator';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import { authentication } from '../../../middlewares/authentication';
import constant from '../../../common/constant/constant';

const router = express.Router();
const controller = new AdminAuthController();

/* User or consultant signup Route with email or phone */
router.post(
    routes.Admin.ADD_USER,
    // authentication,
    // userPermissionGuard([constant.ROLES.ADMIN]),
    // adminAuthValidationRules(),
    // validateRequest,
    controller.addNewUser
);

export { router as adminAuthRouter };
