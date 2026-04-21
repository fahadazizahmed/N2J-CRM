import express from 'express';
import { AdminJobController } from '../controllers';
import { validateRequest } from '../../../middlewares';
import { createJobValidationRules, updateJobValidationRules, getJobByIdValidationRules, getJobsValidationRules, updateJobStatusValidationRules, upsertDispatchValidationRules, uploadDispatchMediaValidationRules, getJobLogsValidationRules } from '../validators/admin.validator';
import { authentication } from '../../../middlewares/authentication';
import { userPermissionGuard } from '../../../middlewares/user-permission-guard';
import constant from '../../../common/constant/constant';
import routes from './routes';
import { uploadDispatchDocs } from '../helper';

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

router.put(
    routes.Admin.UPSERT_DISPATCH,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    upsertDispatchValidationRules(),
    validateRequest,
    controller.upsertDispatch
);

router.post(
    routes.Admin.UPLOAD_DISPATCH_DOCS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    uploadDispatchDocs,
    uploadDispatchMediaValidationRules(),
    validateRequest,
    controller.uploadDispatchDocs
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

router.get(
    routes.Admin.GET_PRE_MATERIALS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    controller.getPreMaterials
);

router.get(
    routes.Admin.GET_JOB_LOGS,
    authentication,
    userPermissionGuard([constant.ROLES.ADMIN]),
    getJobLogsValidationRules(),
    validateRequest,
    controller.getJobLogs
);

export { router as adminJobRouter };
