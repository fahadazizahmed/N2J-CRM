
import { Router } from 'express';
import { adminVehicleRouter } from './admin.vehicle.routes';
import { adminDriverRouter } from './admin.driver.routes';

const router = Router();


router.use('/admin', adminVehicleRouter);
router.use('/admin', adminDriverRouter);

export default router;







