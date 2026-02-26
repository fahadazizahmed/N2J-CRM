
import { Router } from 'express';
import { sharedCrmRouter } from './shared.routes';
import { clientCrmRouter } from './client.routes';
import { adminCrmRouter } from './admin.routes';

const router = Router();

router.use('/', sharedCrmRouter);
router.use('/client', clientCrmRouter);
router.use('/admin', adminCrmRouter);

export default router;







