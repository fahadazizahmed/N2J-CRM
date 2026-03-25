import express from 'express';
import routes from './routes';
import AdminVehicleController from '../controllers/admin.vehicle.controller';
import { validateRequest } from '../../../middlewares';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import constant from '../../../common/constant/constant';
import { createVehicleValidationRules, updateVehicleValidationRules, uploadVehicleMediaValidationRules, getVehiclesValidationRules } from '../validators/admin.vehicle.validator';
import { uploadVehicleMediaDocs } from '../helper';

const router = express.Router();
const controller = new AdminVehicleController();

// ─── Vehicle Routes ────────────────────────────────────────────────────────────

router.post(
    routes.Admin.VEHICLE.ADD_NEW_VEHICLE,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    createVehicleValidationRules(),
    validateRequest,
    controller.createVehicle
);

router.post(
    routes.Admin.VEHICLE.UPLOAD_VEHICLE_MEDIA,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    uploadVehicleMediaDocs,
    uploadVehicleMediaValidationRules(),
    validateRequest,
    controller.uploadMedia
);
// Enum api
router.get(
    routes.Admin.VEHICLE.GET_VEHICLE_STATUSES,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getVehicleStatuses
);

router.get(
    routes.Admin.VEHICLE.GET_VEHICLE_TYPES,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getVehicleTypes
);

router.put(
    routes.Admin.VEHICLE.UPDATE_VEHICLE,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    updateVehicleValidationRules(),
    validateRequest,
    controller.updateVehicle
);
router.get(
    routes.Admin.VEHICLE.GET_VEHICLE_STATS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getVehicleStats
);

router.get(
    routes.Admin.VEHICLE.GET_VEHICLE_BY_ID,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getVehicleById
);

router.get(
    routes.Admin.VEHICLE.GET_VEHICLE_DOCS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getVehicleDocs
);

router.get(
    routes.Admin.VEHICLE.GET_VEHICLES,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getVehiclesValidationRules(),
    validateRequest,
    controller.getVehicles
);







export { router as adminVehicleRouter };
