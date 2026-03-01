import { Router } from 'express';
import { sharedContractRouter } from './shared.routes';
import { clientContractRouter } from './client.routes';
import { adminContractRouter } from './admin.routes';

const router = Router();

router.use('/', sharedContractRouter);
router.use('/client', clientContractRouter);
router.use('/admin', adminContractRouter);

export default router;
