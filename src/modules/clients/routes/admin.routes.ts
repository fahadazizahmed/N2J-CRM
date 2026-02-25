import express from 'express';
import routes from './routes';
import AdminClientController from '../controllers/admin.controller';
import { validateRequest } from '../../../middlewares';
import {
    createClientValidationRules,
    updateClientValidationRules,
    deleteClientValidationRules,
    getClientsValidationRules,
} from '../validators/admin.validator';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';

const router = express.Router();
const ctrl = new AdminClientController();
const guard = [authentication, userPermissionGuard(['admin'])];

router.post(routes.Admin.ADD_CLIENT, ...guard, createClientValidationRules(), validateRequest, ctrl.createClient);
router.put(routes.Admin.UPDATE_CLIENT, ...guard, updateClientValidationRules(), validateRequest, ctrl.updateClient);
router.delete(routes.Admin.DELETE_CLIENT, ...guard, deleteClientValidationRules(), validateRequest, ctrl.deleteClient);
router.get(routes.Admin.GET_CLIENT, ...guard, deleteClientValidationRules(), validateRequest, ctrl.getClientById);
router.get(routes.Admin.GET_CLIENTS, ...guard, getClientsValidationRules(), validateRequest, ctrl.getClients);


export { router as adminClientRouter };
