
import { Router } from 'express';
import { adminTipRouter } from './admin.routes';
const router = Router();


router.use('/admin', adminTipRouter);

export default router;







