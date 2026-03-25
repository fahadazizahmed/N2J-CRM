import express from 'express';
import routes from './routes';
import SharedFleetController from '../controllers/shared.fleet.controller';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import constant from '../../../common/constant/constant';
import { assignDriverValidationRules, assignVehicleValidationRules } from '../validators/shared.fleet.validators';
import { validateRequest } from '../../../middlewares/validate-request';

const router = express.Router();
const controller = new SharedFleetController();

router.get(
    routes.shared.GET_ACTIVE_IDLE_NOT_ASSIGN_VEHICLES,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getAllActiveIdleVehicles
);

router.get(
    routes.shared.GET_ALL_VEHICLES_WITH_DRIVER_DETAILS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getVehiclesWithDriverDetails
);
router.post(
    routes.shared.ASSIGN_VEHICLE,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    assignVehicleValidationRules(),
    validateRequest,
    controller.assignVehicle
);

router.get(
    routes.shared.GET_ALL_ACTIVE_NOT_ASSIGN_VEHICLE_DRIVERS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getAllActiveNotAssignVehiclesDrivers
);

router.get(
    routes.shared.GET_DRIVERS_WITH_VEHICLE_DETAILS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getDriverWithVehicleDetails
);

router.get(
    routes.shared.GET_VEHICLE_WITH_JOB,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getVehicleWithJob
);

router.post(
    routes.shared.ASSIGN_DRIVER,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    assignDriverValidationRules(),
    validateRequest,
    controller.assignDriver
);


export { router as sharedFleetRouter };