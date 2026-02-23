
import { Router } from 'express';
import { sharedRouter } from './shared.routes';
import { adminRouter } from './admin.routes';
import { clientRouter } from './client.routes';

const router = Router();

// Shared routes (e.g. /auth/signup) - Mounted at /
router.use('/', sharedRouter);

// Role specific routes
router.use('/admin', adminRouter);           // -> /auth/admin/login
router.use('/client', clientRouter);         // -> /auth/client/login

export default router;
