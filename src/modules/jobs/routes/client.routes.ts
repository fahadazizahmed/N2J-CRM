import express from 'express';
import ClientJobController from '../controllers/client.controller';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import constant from '../../../common/constant/constant';
import routes from './routes';

const router = express.Router();
const controller = new ClientJobController();

// ─── Client Job Routes ──────────────────────────────────────────────────────

/**
 * GET /api/v1/job/client/job/my-jobs
 *
 * Returns all jobs for the currently logged-in client.
 * Authentication: JWT cookie  →  authentication middleware.
 * Authorization : CLIENT role →  userPermissionGuard.
 * Client ID     : resolved from req.user.id via the Client table (user_id FK).
 */
router.get(
    routes.Client.GET_MY_JOBS,
    authentication,
    userPermissionGuard([constant.ROLES.CLIENT]),
    controller.getMyJobs
);

export { router as clientJobRouter };

