import express from 'express';
import AdminDriverController from '../controllers/admin.driver.controller';
import routes from './routes';
import { validateRequest } from '../../../middlewares/validate-request';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import constant from '../../../common/constant/constant';
import { createDriverValidationRules, addDriverRateValidationRules, updateDriverValidationRules, getDriversValidationRules, uploadDriverDocsValidationRules, assignVehicleValidationRules } from '../validators/admin.driver.validator';
import { uploadDriverDocs } from '../helper';

const router = express.Router();
const controller = new AdminDriverController();

// ─── Driver Routes ─────────────────────────────────────────────────────────────

router.post(
    routes.Admin.DRIVER.ADD_NEW_DRIVER,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    createDriverValidationRules(),
    validateRequest,
    controller.createDriver
);

router.post(
    routes.Admin.DRIVER.UPLOAD_DRIVER_DOCS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    uploadDriverDocs,
    uploadDriverDocsValidationRules(),
    validateRequest,
    controller.uploadDocs
);
router.get(
    routes.Admin.DRIVER.GET_DRIVERS_ENUMS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getDriverEnums
);


router.get(
    routes.Admin.DRIVER.GET_DRIVERS_WITH_VEHICLE_DETAILS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getDriverWithVehicleDetails
);

router.post(
    routes.Admin.DRIVER.ASSIGN_VEHICLE,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    assignVehicleValidationRules(),
    validateRequest,
    controller.assignVehicle
);















router.post(
    routes.Admin.DRIVER.ADD_DRIVER_RATES,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    addDriverRateValidationRules(),
    validateRequest,
    controller.addDriverRates
);

router.put(
    routes.Admin.DRIVER.UPDATE_DRIVER,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    updateDriverValidationRules(),
    validateRequest,
    controller.updateDriver
);


router.get(
    routes.Admin.DRIVER.GET_DRIVER_BY_ID,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getDriverById
);

router.get(
    routes.Admin.DRIVER.GET_DRIVERS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getDriversValidationRules(),
    validateRequest,
    controller.getDrivers
);























router.get(
    routes.Admin.DRIVER.GET_ALL_ACTIVE_NOT_ASSIGN_VEHICLE_DRIVERS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getAllActiveNotAssignVehiclesDrivers
);

export { router as adminDriverRouter };
