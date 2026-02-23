
import { Router } from 'express';
import { sharedAuthRouter } from './shared.routes';
import { adminAuthRouter } from './admin.routes';
import { driverAuthRouter } from './driver.routes';
import { subAuthRouter } from './subcontractor.routes';
import { clientAuthRouter } from './client.routes';

const router = Router();

// Shared routes (e.g. /auth/signup) - Mounted at /
router.use('/', sharedAuthRouter);

// Role specific routes
router.use('/admin', adminAuthRouter);           // -> /auth/admin/login
router.use('/driver', driverAuthRouter);         // -> /auth/driver/login
router.use('/subcontractor', subAuthRouter);     // -> /auth/subcontractor/login
router.use('/client', clientAuthRouter);         // -> /auth/client/login

export default router;
