
import { Router } from 'express';
import { sharedRouter } from './shared.routes';
// import { adminRouter } from './admin.routes';
import { clientRouter } from './client.routes';
import { adminClientRouter } from './admin.routes';

const router = Router();

// Shared routes (e.g. /auth/signup) - Mounted at /
router.use('/', sharedRouter);

// Role specific routes
// router.use('/admin', adminRouter);           // -> /auth/admin/login
router.use('/client', clientRouter);         // -> /auth/client/login

// Admin: /api/v1/clients/admin/...
router.use('/admin', adminClientRouter);

export default router;
