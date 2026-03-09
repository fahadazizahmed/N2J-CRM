
import { Router } from 'express';
import { adminVehicleRouter } from './admin.vehicle.routes';
const router = Router();


router.use('/admin', adminVehicleRouter);

export default router;







