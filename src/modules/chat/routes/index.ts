import { Router } from 'express';
import { adminMessageRouter } from './admin.routes';
const router = Router();
router.use('/admin', adminMessageRouter);

export default router;





