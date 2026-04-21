import express from 'express';
import routes from './routes';
import { DashboardAdminController } from '../controllers';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import constant from '../../../common/constant/constant';

const router = express.Router();
const controller = new DashboardAdminController();

// GET /api/v1/admin/dashboard/activity-logs
router.get(
    routes.Admin.GET_ACTIVITY_LOGS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getActivityLogs
);

// GET /api/v1/admin/dashboard/recent-activity
router.get(
    routes.Admin.GET_RECENT_ACTIVITY,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getRecentActivity
);

// GET /api/v1/admin/dashboard/dashboard-stats
router.get(
    routes.Admin.GET_DASHBOARD_STATS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getDashboardStats
);

export { router as adminDashboardRouter };
