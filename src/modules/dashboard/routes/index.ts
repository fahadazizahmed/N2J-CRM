import { Router } from 'express';
import { adminDashboardRouter } from './admin.routes';

const router = Router();

router.use('/admin', adminDashboardRouter);

export default router;
