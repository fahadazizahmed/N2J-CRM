import express from 'express';
import { AdminJobController } from '../controllers';
import { validateRequest } from '../../../middlewares';
import { createJobValidationRules, updateJobValidationRules, getJobByIdValidationRules, getJobsValidationRules, updateJobStatusValidationRules } from '../validators/admin.validator';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import constant from '../../../common/constant/constant';
import routes from './routes';


const router = express.Router();
const controller = new AdminJobController();


// ─── Contract Routes ────────────────────────────────────────────────────────────

router.post(
    routes.Admin.CREATE_JOB,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    createJobValidationRules(),
    validateRequest,
    controller.createJob
);


router.put(
    routes.Admin.UPDATE_JOB,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    updateJobValidationRules(),
    validateRequest,
    controller.updateJob
);

router.put(
    routes.Admin.UPDATE_JOB_STATUS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    updateJobStatusValidationRules(),
    validateRequest,
    controller.updateJobStatus
);

router.get(
    routes.Admin.GET_JOB,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getJobByIdValidationRules(),
    validateRequest,
    controller.getJobById
);



router.get(
    routes.Admin.GET_JOBS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getJobsValidationRules(),
    validateRequest,
    controller.getJobs
);

router.get(
    routes.Admin.GET_JOB_STATS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getJobStats
);

export { router as adminJobRouter };
