import express from 'express';
import routes from './routes';
import AdminClientController from '../controllers/admin.controller';
import { validateRequest } from '../../../middlewares';
import { createClientValidationRules } from '../validators/admin.validator';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';

const router = express.Router();
const controller = new AdminClientController();

// POST /api/admin/add-client
router.post(
    routes.Admin.ADD_CLIENT,
    authentication,
    userPermissionGuard(['admin']),
    createClientValidationRules(),
    validateRequest,
    controller.createClient
);

export { router as adminClientRouter };
