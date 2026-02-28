import express from 'express';
import routes from './routes';
import AdminCrmController from '../controllers/admin.controller';
import { validateRequest } from '../../../middlewares';
import {
    createClientValidationRules,
    updateClientValidationRules,
    getClientByIdValidationRules,
    getClientsValidationRules
} from '../validators/admin.validator';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import constant from '../../../common/constant/constant';

const router = express.Router();
const controller = new AdminCrmController();

// ─── Client Routes ────────────────────────────────────────────────────────────

router.post(
    routes.Admin.ADD_CLIENT,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    createClientValidationRules(),
    validateRequest,
    controller.createClient
);
// TODO: replace with patch
router.post(
    routes.Admin.UPDATE_CLIENT,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    updateClientValidationRules(),
    validateRequest,
    controller.updateClient
);

router.get(
    routes.Admin.GET_CLIENT,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getClientByIdValidationRules(),
    validateRequest,
    controller.getClientById
);

router.get(
    routes.Admin.GET_CLIENTS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getClientsValidationRules(),
    validateRequest,
    controller.getClients
);



export { router as adminCrmRouter };
