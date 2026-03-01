import express from 'express';
import AdminContractController from '../controllers/admin.controller';
import { validateRequest } from '../../../middlewares';
import { createContractValidationRules } from '../validators/admin.validator';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import constant from '../../../common/constant/constant';
import routes from './routes';

const router = express.Router();
const controller = new AdminContractController();

// ─── Contract Routes ────────────────────────────────────────────────────────────

router.post(
    routes.Admin.ADD_CONTRACT_GENERAL_INFO,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    createContractValidationRules(),
    validateRequest,
    controller.createContract
);

export { router as adminContractRouter };
