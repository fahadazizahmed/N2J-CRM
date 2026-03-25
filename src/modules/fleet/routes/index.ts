
import { Router } from 'express';
import { adminVehicleRouter } from './admin.vehicle.routes';
import { adminDriverRouter } from './admin.driver.routes';
import { sharedFleetRouter } from './shared.fleet.routes';


const router = Router();


router.use('/admin', adminVehicleRouter);
router.use('/admin', adminDriverRouter);
router.use('/', sharedFleetRouter);

export default router;







