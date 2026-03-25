import { Router } from 'express';
import { sharedJobRouter } from './shared.routes';
import { adminJobRouter } from './admin.routes';
import { clientJobRouter } from './client.routes';


const router = Router();

router.use('/', sharedJobRouter);
router.use('/client', clientJobRouter);
router.use('/admin', adminJobRouter);

export default router;





