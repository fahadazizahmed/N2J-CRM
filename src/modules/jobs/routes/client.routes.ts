import express from 'express';
import ClientJobController from '../controllers/client.controller';
import { authentication } from '../../../middlewares/authentication';

const router = express.Router();
const controller = new ClientJobController();

router.get(
    '/job/get-jobs',
    authentication,
    controller.getClientJobs
);

export { router as clientJobRouter };
